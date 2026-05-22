from fastapi.security import OAuth2PasswordRequestForm
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from starlette import status

from app.libs.db.db import DB
from app.services.api.src.auth import token_utils
from app.services.api.src.services import auth as service
from app.services.api.src.dtos.output import auth as dto_out


router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/token", status_code=status.HTTP_200_OK, response_model=dto_out.Token)
async def get_login_token(db: DB, form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate user and return access + refresh tokens."""
    access_token, refresh_token = service.get_login_token(db, form_data.username, form_data.password)
    return dto_out.Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", status_code=status.HTTP_200_OK, response_model=dto_out.AccessToken)
async def refresh_access_token(body: RefreshRequest):
    """Exchange a valid refresh token for a new access token."""
    try:
        payload = token_utils.decode_jwt_token(body.refresh_token)
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
