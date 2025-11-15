from typing import List

from pydantic import Field

from app.libs.db.models import (
    Room,
    Group as GroupModel,
    Activity as ActivityModel
)


class Activity(ActivityModel):
    """
    Activity class extending the base Activity model.
    Additional methods and properties specific to the worker service can be added here.
    """
    possible_rooms: List[Room] = Field(default_factory=list)


class Group(GroupModel):
    """
    Group class extending the base Group model.
    Additional methods and properties specific to the worker service can be added here.
    """
    ancestor_ids: List[str] = Field(default_factory=list)
