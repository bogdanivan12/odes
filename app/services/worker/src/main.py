import os

from celery import Celery
from app.libs.logging.logger import get_logger

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL")

logger = get_logger()

worker_app = Celery("worker", broker=CELERY_BROKER_URL)


@worker_app.task(queue="schedule_generator_queue", name="generate_schedule")
def generate_schedule():
    return {"message": "Staring schedule generation process..."}
