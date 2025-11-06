from typing import List

from pydantic import BaseModel

from app.libs.db import models


class GetAllActivities(BaseModel):
    """
    DTO for retrieving all activities
    """
    activities: List[models.Activity]


class GetActivity(BaseModel):
    """
    DTO for retrieving an activity
    """
    activity: models.Activity
