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
    name: str | None = None
    time_grid_config: models.TimeGridConfig | None = None
