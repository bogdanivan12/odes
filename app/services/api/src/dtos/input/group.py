from typing import Optional, List

from pydantic import BaseModel

from app.libs.db import models


class CreateGroup(BaseModel):
    """
    DTO for creating a new group
    """
    institution_id: str
    name: str
    parent_group_id: Optional[str] = None


class UpdateGroup(BaseModel):
    """
    DTO for updating an existing group
    """
    name: Optional[str] = None
    parent_group_id: Optional[str] = None


class UpdateGroupTimeslotPreferences(BaseModel):
    """
    DTO for updating timeslot preferences for a group (admin only)
    """
    preferences: List[models.TimeslotPreference]
