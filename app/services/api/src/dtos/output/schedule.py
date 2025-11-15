from typing import List

from pydantic import BaseModel

from app.libs.db import models


class GetAllSchedules(BaseModel):
    """
    DTO for retrieving all schedules
    """
    schedules: List[models.Schedule]


class GetSchedule(BaseModel):
    """
    DTO for retrieving a schedule
    """
    schedule: models.Schedule


class GetScheduledActivitiesBySchedule(BaseModel):
    """
    DTO for retrieving scheduled_activities by schedule
    """
    scheduled_activities: List[models.ScheduledActivity]
