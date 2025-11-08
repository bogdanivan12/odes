from typing import List

from app.libs.db import models
from app.libs.logging.logger import get_logger


logger = get_logger()


def generate_schedule(
        schedule: models.Schedule,
        institution: models.Institution,
        activities: List[models.Activity]
):
    """Generate schedule"""
    return {"message": "Schedule generation not yet implemented."}
