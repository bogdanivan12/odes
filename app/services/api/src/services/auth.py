import os

from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.libs.stringproc import stringproc
from app.libs.logging.logger import get_logger
from app.services.api.src.repositories import users as users_repo
from app.services.api.src.auth import token_utils


logger = get_logger()

# Google OAuth Web client ID — also the expected audience of the ID token.
# Public value (it ships in the frontend too); override via env if needed.
GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID",
    "941006428883-ig2s9kbmkgjdg8ahtciagrdbu2h55agi.apps.googleusercontent.com",
)


def _verify_google_credential(credential: str) -> dict:
    """Verify a Google ID token and return its claims (sub, email, …).

    Checks the signature against Google's public keys plus issuer, audience
    (our client id) and expiry — the security-critical step.
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
    (access_token, refresh_token) tuple — the same session as a password login."""
    idinfo = _verify_google_credential(credential)
    sub = idinfo.get("sub")
    email = idinfo.get("email")
    email_verified = bool(idinfo.get("email_verified"))
    name = idinfo.get("name") or (email.split("@")[0] if email else "User")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google credential.")

    # 1) Match by Google subject id; 2) else by a *verified* email (link).
    user_data = users_repo.find_user_by_provider(db, "google", sub)
    if not user_data and email and email_verified:
        user_data = users_repo.find_user_by_email(db, email)

    if user_data:
        user = models.User(**user_data)
        if user.provider_identities.get("google") != sub:
            user.provider_identities["google"] = sub
            users_repo.update_user_by_id(
                db, str(user.id), {"provider_identities": user.provider_identities}
            )
    else:
        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Google account did not provide an email.")
        # Don't silently take over an existing (e.g. password) account when the
        # email isn't verified by Google.
        if users_repo.find_user_by_email(db, email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists. Sign in with your password.",
            )
        user = models.User(name=name, email=email, provider_identities={"google": sub})
        users_repo.insert_user(db, user)
        logger.info(f"Created user {user.id} via Google sign-in ({email})")

    payload = {"sub": str(user.id), "email": user.email}
    return token_utils.create_jwt_token(payload), token_utils.create_refresh_token(payload)


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
