from typing import Dict

from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from starlette import status
from fastapi import APIRouter, Depends

from app.libs.db.db import DB
from app.services.api.src.services import auth as service
from app.libs.auth.token_utils import oauth2_scheme

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
@router.post("/token",
             status_code=status.HTTP_200_OK,
             response_model=Dict[str, str],
             include_in_schema=False)
async def get_login_token(db: DB, form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate user and return access token"""
    token = service.get_login_token(db, form_data.username, form_data.password)
    return {"access_token": token, "token_type": "Bearer"}
