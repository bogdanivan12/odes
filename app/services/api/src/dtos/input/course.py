from typing import Dict, Optional

from pydantic import BaseModel, Field

from app.libs.db import models


class CreateCourse(BaseModel):
    """
    DTO for creating a new course
    """
    institution_id: str
    name: str


class UpdateCourse(BaseModel):
    """
    DTO for updating an existing course
    """
    name: Optional[str] = None
