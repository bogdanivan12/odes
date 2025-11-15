from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.libs.stringproc.stringproc import verify_password
from app.libs.auth.token_utils import create_jwt_token
from app.services.api.src.repositories import (
    users as users_repo,
)


def get_login_token(db: Database, email: str, password: str):
    """Authenticate user and return access token"""
    try:
        user_data = users_repo.find_user_by_email(db, str(email))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving user with email {email}: {str(e)}"
        )

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email {email} not found."
        )

    user = models.User(**user_data)

    if not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = create_jwt_token({"sub": str(user.id), "email": user.email})
    return token
