from typing import List

from pydantic import BaseModel

from app.libs.db import models


class GetAllScheduledActivities(BaseModel):
    """
    DTO for retrieving all scheduled_activities
    """
    scheduled_activities: List[models.ScheduledActivity]


class GetScheduledActivity(BaseModel):
    """
    DTO for retrieving a scheduled_activity
    """
    scheduled_activity: models.ScheduledActivity
