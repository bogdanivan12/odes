import os

from celery import Celery


CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL")
celery_client = Celery("api", broker=CELERY_BROKER_URL)


def trigger_schedule_generation():
    """Trigger schedule generation process"""
    result = celery_client.send_task(
        name="generate_schedule",
        args=[],
        queue="schedule_generator_queue"
    )
    return {"result": result.id}
