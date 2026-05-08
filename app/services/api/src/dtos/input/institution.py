from typing import Optional

from pydantic import BaseModel

from app.libs.db import models


class CreateInstitution(BaseModel):
    """
    DTO for creating a new institution
    """
    name: str
    time_grid_config: models.TimeGridConfig


class UpdateInstitution(BaseModel):
    """
    DTO for updating an existing institution
    """
    name: Optional[str] = None
    time_grid_config: Optional[models.TimeGridConfig] = None


class SetActiveSchedule(BaseModel):
    """
    DTO for setting (or clearing) the active schedule of an institution.
    Pass schedule_id=null to unset the active schedule.
    """
    schedule_id: Optional[str] = None
