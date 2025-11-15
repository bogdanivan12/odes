from typing import Optional

from pydantic import BaseModel

from app.libs.db import models


class CreateSchedule(BaseModel):
    """
    DTO for creating a schedule
    """
    institution_id: str


class UpdateSchedule(BaseModel):
    """
    DTO for updating a schedule
    """
    status: Optional[models.ScheduleStatus] = None
    error_message: Optional[str] = None
