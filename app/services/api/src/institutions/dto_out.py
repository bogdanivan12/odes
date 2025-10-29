from typing import List

from pydantic import BaseModel

from app.libs.db import models


class GetAllInstitutions(BaseModel):
    institutions: List[models.Institution]


class GetInstitutionById(BaseModel):
    institution: models.Institution
