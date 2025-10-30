from typing import Dict

from pydantic import BaseModel, Field

from app.libs.db import models


class CreateCourse(BaseModel):
    """
    DTO for creating a new course
    """
    institution_id: str
    name: str
    activities_duration_slots: Dict[models.ActivityType, int] = Field(default_factory=dict)


class UpdateCourse(BaseModel):
    """
    DTO for updating an existing course
    """
    name: str | None = None
    activities_duration_slots: Dict[models.ActivityType, int] | None = None
