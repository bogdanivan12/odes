from typing import List, Optional

from pydantic import BaseModel, Field

from app.libs.db import models


class CreateScheduledActivity(BaseModel):
    """
    DTO for creating a scheduled_activity
    """
    schedule_id: str
    activity_id: str
    room_id: str
    start_timeslot: int
    active_weeks: List[int] = Field(default_factory=list)


class UpdateScheduledActivity(BaseModel):
    """
    DTO for updating a scheduled_activity
    """
    schedule_id: Optional[str] = None
    activity_id: Optional[str] = None
    room_id: Optional[str] = None
    start_timeslot: Optional[int] = None
    active_weeks: Optional[List[int]] = None


class InsertManyScheduledActivities(BaseModel):
    """
    DTO for inserting many scheduled_activities
    """
    scheduled_activities: List[models.ScheduledActivity] = Field(default_factory=list)
