import os

from fastapi.security import OAuth2PasswordRequestForm
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from starlette import status

from app.libs.db.db import DB
from app.services.api.src.auth import token_utils
from app.services.api.src.services import auth as service
from app.services.api.src.dtos.output import auth as dto_out
from app.services.api.src.dtos.input import auth as dto_in


router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# Path shared by the cookie — covers /refresh and /logout under /api/v1/auth
_COOKIE_PATH = "/api/v1/auth"
# Set SECURE_COOKIES=true in production (HTTPS).
_SECURE_COOKIES = os.getenv("SECURE_COOKIES", "false").lower() == "true"


def _set_refresh_cookie(response: Response, refresh_token: str, max_age: int) -> None:
    """Attach the refresh token as an HttpOnly cookie to *response*."""
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=_SECURE_COOKIES,
        samesite="lax",
        max_age=max_age,
        path=_COOKIE_PATH,
    )


@router.post("/token", status_code=status.HTTP_200_OK, response_model=dto_out.AccessToken)
async def get_login_token(response: Response, db: DB, form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate user.

    Returns the short-lived access token in the JSON body.
    Sets the long-lived refresh token as an HttpOnly cookie (inaccessible to JS).
    """
    access_token, refresh_token = service.get_login_token(db, form_data.username, form_data.password)
    _set_refresh_cookie(response, refresh_token, max_age=token_utils.REFRESH_EXPIRES_DELTA * 60)
    return dto_out.AccessToken(access_token=access_token)


@router.post("/google", status_code=status.HTTP_200_OK, response_model=dto_out.AccessToken)
async def google_login(response: Response, db: DB, request: dto_in.GoogleSignIn):
    """Sign in with Google.

    Verifies the Google ID-token credential, finds/creates/links the user, and
    returns the same access token (+ refresh cookie) as a password login.
    """
    access_token, refresh_token = service.get_google_login_token(db, request.credential)
    _set_refresh_cookie(response, refresh_token, max_age=token_utils.REFRESH_EXPIRES_DELTA * 60)
    return dto_out.AccessToken(access_token=access_token)


@router.post("/microsoft", status_code=status.HTTP_200_OK, response_model=dto_out.AccessToken)
async def microsoft_login(response: Response, db: DB, request: dto_in.MicrosoftSignIn):
    """Sign in with Microsoft.

    Verifies the Microsoft Entra ID token, finds/creates/links the user, and
    returns the same access token (+ refresh cookie) as a password login.
    """
    access_token, refresh_token = service.get_microsoft_login_token(db, request.credential)
    _set_refresh_cookie(response, refresh_token, max_age=token_utils.REFRESH_EXPIRES_DELTA * 60)
    return dto_out.AccessToken(access_token=access_token)


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(db: DB, request: dto_in.ForgotPassword):
    """Request a password-reset email.

    Always returns the same response whether or not the email is registered, so
    the endpoint can't be used to discover which emails have accounts.
    """
    service.request_password_reset(db, str(request.email))
    return {"message": "If an account exists for that email, a reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(db: DB, request: dto_in.ResetPassword):
    """Set a new password using a valid reset token."""
    service.reset_password(db, request.token, request.new_password)
    return {"message": "Your password has been updated. You can now sign in."}


@router.post("/refresh", status_code=status.HTTP_200_OK, response_model=dto_out.AccessToken)
async def refresh_access_token(request: Request):
    """Exchange the refresh-token cookie for a new access token."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token cookie missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = token_utils.decode_jwt_token(refresh_token)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is not a refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    email = payload.get("email")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing subject.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    new_access_token = token_utils.create_jwt_token({"sub": user_id, "email": email})
    return dto_out.AccessToken(access_token=new_access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    """Clear the refresh-token cookie, ending the server-side session."""
    response.delete_cookie(key="refresh_token", path=_COOKIE_PATH)
