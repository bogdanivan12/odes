from typing import Optional, List

from pydantic import BaseModel, Field

from app.libs.db import models


class CreateActivity(BaseModel):
    """
    DTO for creating a new activity
    """
    institution_id: str
    course_id: str
    activity_type: models.ActivityType
    group_id: str
    professor_id: Optional[str] = None
    duration_slots: int = Field(default=2, gt=0)
    required_room_features: List[str] = Field(default_factory=list)
    frequency: models.Frequency = models.Frequency.WEEKLY
    selected_timeslot: Optional[models.SelectedTimeslot] = None


class UpdateActivity(BaseModel):
    """
    DTO for updating an existing activity
    """
    course_id: Optional[str] = None
    activity_type: Optional[models.ActivityType] = None
    group_id: Optional[str] = None
    professor_id: Optional[str] = None
    duration_slots: Optional[int] = None
    required_room_features: Optional[List[str]] = None
    frequency: Optional[models.Frequency] = None
    selected_timeslot: Optional[models.SelectedTimeslot] = None
