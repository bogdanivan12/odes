from typing import List, Optional

from pydantic import BaseModel, Field


class CreateRoom(BaseModel):
    """
    DTO for creating a room
    """
    institution_id: str
    name: str
    capacity: int = Field(default=30, ge=1)
    features: List[str] = Field(default_factory=list)


class UpdateRoom(BaseModel):
    """
    DTO for updating a room
    """
    name: Optional[str] = None
    capacity: Optional[int] = None
    features: Optional[List[str]] = None
