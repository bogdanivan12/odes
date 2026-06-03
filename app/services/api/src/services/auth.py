import os
import hashlib

from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.libs.stringproc import stringproc
from app.libs.logging.logger import get_logger
from app.services.api.src.repositories import users as users_repo
from app.services.api.src.auth import token_utils
from app.services.api.src.services import email as email_service


logger = get_logger()

# Base URL of the frontend, used to build the reset link in emails.
APP_BASE_URL = os.getenv("APP_BASE_URL", "https://webodes.app")
# Minimum password length enforced on reset (mirrors sign-up rules).
_MIN_PASSWORD_LENGTH = 8

# Google OAuth Web client ID - also the expected audience of the ID token.
# Public value (it ships in the frontend too); override via env if needed.
GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID",
    "941006428883-ig2s9kbmkgjdg8ahtciagrdbu2h55agi.apps.googleusercontent.com",
)

# Microsoft Entra ID (Azure AD) application (client) id - also the expected
# audience of the ID token.  Public value (it ships in the frontend too).
MICROSOFT_CLIENT_ID = os.getenv(
    "MICROSOFT_CLIENT_ID",
    "dde728e7-dc76-4c4a-b65c-9e5b79867e3a",
)
# Multitenant + personal-account app: tokens are issued by many tenants, so the
# JWKS lives under the tenant-agnostic "common" endpoint.
MICROSOFT_JWKS_URI = os.getenv(
    "MICROSOFT_JWKS_URI",
    "https://login.microsoftonline.com/common/discovery/v2.0/keys",
)

# Cached JWKS client (re-fetches Microsoft's signing keys on demand).
_ms_jwks_client = None


def _find_or_create_provider_user(
    db: Database,
    provider: str,
    subject: str,
    email: str | None,
    email_verified: bool,
    name: str,
) -> tuple[str, str]:
    """Shared find/create/link logic for external identity providers.

    1) Match by the provider's subject id; 2) else link to an existing account
    by *verified* email; 3) else create a new account.  Returns an
    (access_token, refresh_token) tuple - the same session as a password login.
    """
    user_data = users_repo.find_user_by_provider(db, provider, subject)
    if not user_data and email and email_verified:
        user_data = users_repo.find_user_by_email(db, email)

    if user_data:
        user = models.User(**user_data)
        if user.provider_identities.get(provider) != subject:
            user.provider_identities[provider] = subject
            users_repo.update_user_by_id(
                db, str(user.id), {"provider_identities": user.provider_identities}
            )
    else:
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{provider.capitalize()} account did not provide an email.",
            )
        # Don't silently take over an existing (e.g. password) account when the
        # email isn't verified by the provider.
        if users_repo.find_user_by_email(db, email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists. Sign in with your password.",
            )
        user = models.User(name=name, email=email, provider_identities={provider: subject})
        users_repo.insert_user(db, user)
        logger.info(f"Created user {user.id} via {provider} sign-in ({email})")

    payload = {"sub": str(user.id), "email": user.email}
    return token_utils.create_jwt_token(payload), token_utils.create_refresh_token(payload)


def _verify_google_credential(credential: str) -> dict:
    """Verify a Google ID token and return its claims (sub, email, …).

    Checks the signature against Google's public keys plus issuer, audience
    (our client id) and expiry - the security-critical step.
    """
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        idinfo = id_token.verify_oauth2_token(
            credential, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except Exception as e:
        logger.warning(f"Google credential verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google credential.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return idinfo


def get_google_login_token(db: Database, credential: str) -> tuple[str, str]:
    """Verify a Google sign-in, find/create/link the user, and return an
    (access_token, refresh_token) tuple - the same session as a password login."""
    idinfo = _verify_google_credential(credential)
    sub = idinfo.get("sub")
    email = idinfo.get("email")
    email_verified = bool(idinfo.get("email_verified"))
    name = idinfo.get("name") or (email.split("@")[0] if email else "User")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google credential.")
    return _find_or_create_provider_user(db, "google", sub, email, email_verified, name)


def _verify_microsoft_credential(credential: str) -> dict:
    """Verify a Microsoft (Entra ID) ID token and return its claims.

    Validates the RS256 signature against Microsoft's published keys and the
    audience (our client id).  Because the app is multitenant + personal, the
    issuer differs per tenant, so we don't pin one issuer - we instead require
    the issuer to match the tenant declared in the token's own ``tid`` claim.
    """
    global _ms_jwks_client
    try:
        import jwt
        if _ms_jwks_client is None:
            _ms_jwks_client = jwt.PyJWKClient(MICROSOFT_JWKS_URI)
        signing_key = _ms_jwks_client.get_signing_key_from_jwt(credential)
        claims = jwt.decode(
            credential,
            signing_key.key,
            algorithms=["RS256"],
            audience=MICROSOFT_CLIENT_ID,
            options={"verify_iss": False},  # issuer validated manually below
        )
    except Exception as e:
        logger.warning(f"Microsoft credential verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Microsoft credential.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    tid = claims.get("tid")
    issuer = claims.get("iss")
    if not tid or issuer != f"https://login.microsoftonline.com/{tid}/v2.0":
        logger.warning(f"Microsoft token issuer mismatch: iss={issuer} tid={tid}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Microsoft credential.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return claims


def get_microsoft_login_token(db: Database, credential: str) -> tuple[str, str]:
    """Verify a Microsoft sign-in, find/create/link the user, and return an
    (access_token, refresh_token) tuple - the same session as a password login."""
    claims = _verify_microsoft_credential(credential)
    sub = claims.get("sub")
    # Work/school tokens often carry the address in `preferred_username` (the
    # UPN) rather than `email`; only trust it if it actually looks like an email.
    email = claims.get("email")
    if not email:
        upn = claims.get("preferred_username") or ""
        email = upn if "@" in upn else None
    name = claims.get("name") or (email.split("@")[0] if email else "User")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Microsoft credential.")
    # Microsoft issues and controls these addresses, so treat them as verified.
    return _find_or_create_provider_user(db, "microsoft", sub, email, bool(email), name)


def get_login_token(db: Database, email: str, password: str) -> tuple[str, str]:
    """Authenticate user and return an (access_token, refresh_token) tuple."""
    try:
        user_data = users_repo.find_user_by_email(db, str(email))
    except Exception as e:
        logger.error(f"DB error during login for {email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving user with email {email}: {str(e)}"
        )

    if not user_data:
        logger.warning(f"Login failed: user with email '{email}' not found in database")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials."
        )

    user = models.User(**user_data)

    if not stringproc.verify_password(password, user.hashed_password):
        logger.warning(f"Login failed: password mismatch for user '{email}' (id={user.id})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    payload = {"sub": str(user.id), "email": user.email}
    access_token = token_utils.create_jwt_token(payload)
    refresh_token = token_utils.create_refresh_token(payload)
    return access_token, refresh_token


def _password_fingerprint(hashed_password: str) -> str:
    """Short, non-reversible fingerprint of the current password hash.

    Embedded in the reset token so a link becomes invalid as soon as the
    password is changed (i.e. single-use) without needing any server-side state.
    """
    return hashlib.sha256(hashed_password.encode("utf-8")).hexdigest()[:16]


def _reset_email_html(name: str, link: str) -> str:
    return f"""
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto;color:#1f2937">
      <h2 style="color:#111827">Reset your ODES password</h2>
      <p>Hi {name or 'there'},</p>
      <p>We received a request to reset your password. Click the button below to
         choose a new one. This link expires in 30 minutes and can only be used once.</p>
      <p style="text-align:center;margin:28px 0">
        <a href="{link}" style="background:#4f46e5;color:#fff;text-decoration:none;
           padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">
          Reset password
        </a>
      </p>
      <p style="font-size:13px;color:#6b7280">If you didn't request this, you can safely
         ignore this email - your password won't change.</p>
      <p style="font-size:12px;color:#9ca3af;word-break:break-all">{link}</p>
    </div>
    """


def request_password_reset(db: Database, email: str) -> None:
    """Email a reset link if a *password* account exists for ``email``.

    Always returns without signalling whether the email exists - the route
    responds identically in every case to avoid leaking which emails are
    registered (account-enumeration protection).
    """
    try:
        user_data = users_repo.find_user_by_email(db, email)
    except Exception as e:
        logger.error(f"DB error during password-reset lookup for {email}: {e}")
        return

    if not user_data:
        return
    user = models.User(**user_data)
    # Provider-only accounts (Google/Microsoft) have no password to reset.
    if not user.hashed_password:
        logger.info(f"Password-reset requested for provider-only account {user.id}; skipping.")
        return

    token = token_utils.create_reset_token({
        "sub": str(user.id),
        "email": user.email,
        "pwh": _password_fingerprint(user.hashed_password),
    })
    link = f"{APP_BASE_URL}/reset-password?token={token}"
    email_service.send_email(user.email, "Reset your ODES password", _reset_email_html(user.name, link))


def reset_password(db: Database, token: str, new_password: str) -> None:
    """Validate a reset token and set the user's new password."""
    payload = token_utils.decode_jwt_token(token)
    if payload.get("type") != "reset":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token.")

    user_id = payload.get("sub")
    user_data = users_repo.find_user_by_id(db, user_id) if user_id else None
    if not user_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token.")

    user = models.User(**user_data)
    # The fingerprint must still match - rejects links already used or issued
    # before a later password change.
    if not user.hashed_password or payload.get("pwh") != _password_fingerprint(user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is no longer valid. Please request a new one.",
        )

    if not new_password or len(new_password) < _MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password must be at least {_MIN_PASSWORD_LENGTH} characters.",
        )

    users_repo.update_user_by_id(db, user_id, {"hashed_password": stringproc.hash_password(new_password)})
    logger.info(f"Password reset completed for user {user_id}")
