import os
from typing import Dict, List, Any

from celery import Celery

from app.libs.db import models
from app.libs.db.models import Schedule
from app.services.worker.src.services import schedules as service

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL")

worker_app = Celery("worker", broker=CELERY_BROKER_URL)


@worker_app.task(queue="schedule_generator_queue", name="generate_schedule")
def generate_schedule(
        schedule_data: Dict[str, Any],
        institution_data: Dict[str, Any],
        activities_data: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Generate schedule"""
    schedule = Schedule(**schedule_data)
    institution = models.Institution(**institution_data)
    activities = [models.Activity(**activity) for activity in activities_data]
    return service.generate_schedule(schedule, institution, activities)
