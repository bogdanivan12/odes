from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.libs.stringproc import stringproc
from app.libs.logging.logger import get_logger
from app.services.api.src.repositories import users as users_repo
from app.services.api.src.auth import token_utils


logger = get_logger()


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
