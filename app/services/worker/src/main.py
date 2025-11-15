import os

from celery import Celery

from app.services.worker.src import schedule_generator as schedule_gen

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL")

worker_app = Celery("worker", broker=CELERY_BROKER_URL)


@worker_app.task(queue="schedule_generator_queue", name="generate_schedule")
def generate_schedule(institution_id: str, schedule_id: str):
    """Generate schedule"""
    try:
        return schedule_gen.generate_schedule(institution_id, schedule_id)
    except Exception as e:
        schedule_gen.db_update_failed_schedule(schedule_id, str(e))
        raise
