from typing import Optional

from pydantic import BaseModel


class CreateGroup(BaseModel):
    """
    DTO for creating a new group
    """
    institution_id: str
    name: str
    parent_group_id: Optional[str] = None


class UpdateGroup(BaseModel):
    """
    DTO for updating an existing group
    """
    name: Optional[str] = None
    parent_group_id: Optional[str] = None
