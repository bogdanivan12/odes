from typing import List

from pydantic import BaseModel

from app.libs.db import models


class GetAllGroups(BaseModel):
    """
    DTO for retrieving all groups
    """
    groups: List[models.Group]


class GetGroup(BaseModel):
    """
    DTO for retrieving a group
    """
    group: models.Group


class GetGroupActivities(BaseModel):
    """
    DTO for retrieving group activities
    """
    activities: List[models.Activity]
