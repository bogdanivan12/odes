from typing import List

from pydantic import BaseModel

from app.libs.db import models


class GetAllUsers(BaseModel):
    """
    DTO for retrieving all users
    """
    users: List[models.User]


class GetUser(BaseModel):
    """
    DTO for retrieving an user
    """
    user: models.User


class GetProfessorActivities(BaseModel):
    """
    DTO for retrieving professor's activities
    """
    activities: List[models.Activity]
