from typing import List

from pydantic import BaseModel

from app.libs.db import models


class GetAllInstitutions(BaseModel):
    """
    DTO for retrieving all institutions
    """
    institutions: List[models.Institution]


class GetInstitution(BaseModel):
    """
    DTO for retrieving an institution
    """
    institution: models.Institution


class GetInstitutionCourses(BaseModel):
    """
    DTO for retrieving courses of an institution
    """
    courses: List[models.Course]


class GetInstitutionRooms(BaseModel):
    """
    DTO for retrieving rooms of an institution
    """
    rooms: List[models.Room]


class GetInstitutionGroups(BaseModel):
    """
    DTO for retrieving groups of an institution
    """
    groups: List[models.Group]


class GetInstitutionUsers(BaseModel):
    """
    DTO for retrieving users of an institution
    """
    users: List[models.User]
