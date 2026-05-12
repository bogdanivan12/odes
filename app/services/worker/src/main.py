import os

from celery import Celery

from app.services.worker.src import schedule_generator as schedule_gen

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL")

worker_app = Celery("worker", broker=CELERY_BROKER_URL)


@worker_app.task(queue="schedule_generator_queue", name="generate_schedule")
def generate_schedule(institution_id: str, schedule_id: str, token: str) -> None:
    """Generate schedule"""
    # Replace the user's short-lived token (default 30 min) with a 4-hour
    # service token tied to the same user so the long-running job — plus
    # its intermediate-save callbacks and final error reporting — can keep
    # calling the API past the original token's expiry.
    token = schedule_gen.refresh_worker_token(token)
    try:
        return schedule_gen.generate_schedule(institution_id, schedule_id, token)
    except Exception as e:
        schedule_gen.db_update_failed_schedule(schedule_id, str(e), token)
        raise
