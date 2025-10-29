from pydantic import BaseModel

from app.libs.db import models


class CreateInstitution(BaseModel):
    name: str
    time_grid_config: models.TimeGridConfig


class UpdateInstitution(BaseModel):
    name: str | None = None
    time_grid_config: models.TimeGridConfig | None = None
