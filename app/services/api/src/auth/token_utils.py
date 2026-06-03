from typing import List, TypeAlias, Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

import os
import datetime


DEFAULT_ALGORITHM = os.getenv('DEFAULT_ALGORITHM', 'HS256')
EXPIRES_DELTA = int(os.getenv('EXPIRES_DELTA', 30))
REFRESH_EXPIRES_DELTA = int(os.getenv('REFRESH_EXPIRES_DELTA', 10080))  # 7 days
RESET_EXPIRES_DELTA = int(os.getenv('RESET_EXPIRES_DELTA', 30))  # 30 minutes
SECRET_KEY = os.getenv("SECRET_KEY")


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")
# fastapi dependency to extract and verify JWT tokens from requests
AUTH: TypeAlias = Annotated[str, Depends(oauth2_scheme)]


def create_jwt_token(
        data: dict,
        secret_key: str = SECRET_KEY,
        algorithm: str = DEFAULT_ALGORITHM,
        expires_delta: int = EXPIRES_DELTA
) -> str:
    """Create a short-lived access JWT token."""
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=expires_delta)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=algorithm)
    return encoded_jwt


def create_refresh_token(
        data: dict,
        secret_key: str = SECRET_KEY,
        algorithm: str = DEFAULT_ALGORITHM,
        expires_delta: int = REFRESH_EXPIRES_DELTA
) -> str:
    """Create a long-lived refresh JWT token (7 days by default).

    The token carries a ``type: "refresh"`` claim so the refresh endpoint
    can reject access tokens that are passed by mistake.
    """
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=expires_delta)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, secret_key, algorithm=algorithm)


def create_reset_token(
        data: dict,
        secret_key: str = SECRET_KEY,
        algorithm: str = DEFAULT_ALGORITHM,
        expires_delta: int = RESET_EXPIRES_DELTA
) -> str:
    """Create a short-lived password-reset JWT (30 min by default).

    Carries a ``type: "reset"`` claim so the reset endpoint can reject access /
    refresh tokens passed by mistake.
    """
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=expires_delta)
    to_encode.update({"exp": expire, "type": "reset"})
    return jwt.encode(to_encode, secret_key, algorithm=algorithm)


def decode_jwt_token(
        token: str,
        secret_key: str = SECRET_KEY,
        algorithms: List[str] = None
) -> dict:
    """Decode a JWT token"""
    if algorithms is None:
        algorithms = [DEFAULT_ALGORITHM]

    try:
        decoded_jwt = jwt.decode(token, secret_key, algorithms=algorithms)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            detail="Token has expired",
            status_code=status.HTTP_401_UNAUTHORIZED,
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            detail="Invalid token",
            status_code=status.HTTP_401_UNAUTHORIZED,
            headers={"WWW-Authenticate": "Bearer"}
        )

    return decoded_jwt


def get_user_id_from_token(
        token: str,
        secret_key: str = SECRET_KEY,
        algorithms: List[str] = None
) -> str:
    """Extract user ID from JWT token"""
    decoded_jwt = decode_jwt_token(token, secret_key, algorithms)
    user_id = decoded_jwt.get("sub")
    if user_id is None:
        raise HTTPException(
            detail="Token does not contain user ID",
            status_code=status.HTTP_401_UNAUTHORIZED,
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user_id
