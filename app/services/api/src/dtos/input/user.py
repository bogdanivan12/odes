from typing import Optional, List, Dict

from pydantic import BaseModel, SecretStr, EmailStr

from app.libs.db import models


class CreateUser(BaseModel):
    """
    DTO for creating a new user
    """
    name: str
    email: EmailStr
    password: SecretStr


class UpdateUser(BaseModel):
    """
    DTO for updating an existing user
    """
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    user_roles: Optional[Dict[str, List[models.UserRole]]] = None
    group_ids: Optional[List[str]] = None
