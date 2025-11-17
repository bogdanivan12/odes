from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.libs.stringproc import stringproc
from app.services.api.src.repositories import users as users_repo
from app.services.api.src.auth import token_utils


def get_login_token(db: Database, email: str, password: str) -> str:
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
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials."
        )

    user = models.User(**user_data)

    if not stringproc.verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = token_utils.create_jwt_token({"sub": str(user.id), "email": user.email})
    return token
