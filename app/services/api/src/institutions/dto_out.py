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
