import os
from typing import List

from celery import Celery
from starlette import status
from fastapi import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.libs.logging.logger import get_logger
from app.services.api.src.auth import access_verifiers
from app.services.api.src.repositories import (
    activities as activities_repo,
    institutions as institutions_repo,
    schedules as schedules_repo,
    scheduled_activities as scheduled_activities_repo,
    users as users_repo,
)
from app.services.api.src.dtos.input import schedule as dto_in


CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL")
celery_client = Celery("api", broker=CELERY_BROKER_URL)

logger = get_logger()


def trigger_schedule_generation(
        db: Database,
        request: dto_in.CreateSchedule,
        current_user_id: str,
        token: str
) -> models.Schedule:
    """Trigger schedule generation process"""
    institution_id = request.institution_id
    institution_data = institutions_repo.find_institution_by_id(db, institution_id)

    if not institution_data:
        logger.error(f"Institution not found: {institution_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {institution_id} not found."
        )

    institution = models.Institution(**institution_data)

    logger.info(f"Fetching activities for institution {institution_id}")
    activities = activities_repo.find_activities_by_institution_id(db, institution_id)

    if not activities:
        logger.error(f"No activities found for institution {institution_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No activities found for institution with id {institution_id}."
        )

    logger.info(f"Found {len(activities)} activities for institution {institution_id}")

    schedule = models.Schedule(
        institution_id=institution.id,
        time_grid_config=institution.time_grid_config,
    )

    # Check authorization - user must be admin of the institution
    acces_verifiers.raise_schedule_forbidden(db, current_user_id, schedule, admin_only=True)

    try:
        schedules_repo.insert_schedule(db, schedule)
    except Exception as e:
        logger.error(f"Failed to insert schedule: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error inserting schedule: {str(e)}"
        )

    logger.info(f"Triggering schedule generation process for institution {institution_id}")

    celery_client.send_task(
        task_id=schedule.id,
        name="generate_schedule",
        kwargs={
            "institution_id": institution_id,
            "schedule_id": schedule.id,
            "token": token
        },
        queue="schedule_generator_queue"
    )

    logger.info(f"Schedule generation process triggered for institution {institution_id}:"
                f" id = {schedule.id}")

    return schedule


def get_schedules(db: Database, current_user_id: str) -> List[models.Schedule]:
    """Get all schedules"""
    logger.info("Fetching all schedules")
    try:
        schedules_data = schedules_repo.find_all_schedules(db)
    except Exception as e:
        logger.error(f"Failed to retrieve schedules: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving schedules: {str(e)}"
        )

    user = models.User(**users_repo.find_user_by_id(db, current_user_id))
    schedules = [models.Schedule(**schedule) for schedule in schedules_data
                 if schedule['institution_id'] in user.user_roles]
    logger.info(f"Fetched {len(schedules)} schedules")

    return schedules


def get_schedule_by_id(db: Database, schedule_id: str, current_user_id: str) -> models.Schedule:
    """Get schedule by ID"""
    logger.info(f"Fetching schedule by id: {schedule_id}")
    try:
        schedule_data = schedules_repo.find_schedule_by_id(db, schedule_id)
    except Exception as e:
        logger.error(f"Failed to retrieve schedule {schedule_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving schedule with id {schedule_id}: {str(e)}"
        )

    if not schedule_data:
        logger.error(f"Schedule not found: {schedule_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule with id {schedule_id} not found."
        )

    schedule = models.Schedule(**schedule_data)
    acces_verifiers.raise_schedule_forbidden(db, current_user_id, schedule)

    logger.info(f"Fetched schedule: {schedule.id}")

    return schedule


def delete_schedule(db: Database, schedule_id: str, current_user_id: str) -> None:
    """Delete a schedule by ID"""
    logger.info(f"Deleting schedule id={schedule_id}")

    schedule = get_schedule_by_id(db, schedule_id, current_user_id)
    acces_verifiers.raise_schedule_forbidden(db, current_user_id, schedule, admin_only=True)

    try:
        result = schedules_repo.delete_schedule_by_id(db, schedule_id)
    except Exception as e:
        logger.error(f"Failed to delete schedule {schedule_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting schedule with id {schedule_id}: {str(e)}"
        )

    if result.deleted_count == 0:
        logger.error(f"Schedule not found for deletion: {schedule_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule with id {schedule_id} not found."
        )
    logger.info(f"Deleted schedule {schedule_id}")


def get_scheduled_activities_by_schedule_id(
        db: Database,
        schedule_id: str,
        current_user_id: str
) -> List[models.ScheduledActivity]:
    """Get scheduled activities by schedule ID"""
    logger.info(f"Fetching scheduled activities for schedule id: {schedule_id}")

    # Verify schedule exists and user has access
    get_schedule_by_id(db, schedule_id, current_user_id)

    try:
        scheduled_activities_data = (
            scheduled_activities_repo.find_scheduled_activities_by_schedule_id(db, schedule_id)
        )
    except Exception as e:
        logger.error(f"Failed to retrieve scheduled activities for schedule {schedule_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving scheduled activities for schedule id {schedule_id}: {str(e)}"
        )

    scheduled_activities = [
        models.ScheduledActivity(**scheduled_activity)
        for scheduled_activity in scheduled_activities_data
    ]
    logger.info(f"Fetched {len(scheduled_activities)} scheduled activities for schedule id: "
                f"{schedule_id}")

    return scheduled_activities


def update_schedule(
        db: Database,
        schedule_id: str,
        request: dto_in.UpdateSchedule,
        current_user_id: str
) -> models.Schedule:
    """Update a schedule by ID"""
    logger.info(f"Updating schedule id={schedule_id}")

    schedule = get_schedule_by_id(db, schedule_id, current_user_id)
    acces_verifiers.raise_schedule_forbidden(db, current_user_id, schedule, admin_only=True)

    update_data = request.model_dump(exclude_unset=True)

    try:
        result = schedules_repo.update_schedule_by_id(db, schedule_id, update_data)
    except Exception as e:
        logger.error(f"Failed to update schedule {schedule_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating schedule with id {schedule_id}: {str(e)}"
        )

    if result.matched_count == 0:
        logger.error(f"Schedule not found for update: {schedule_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule with id {schedule_id} not found."
        )

    updated_schedule = get_schedule_by_id(db, schedule_id, current_user_id)
    logger.info(f"Updated schedule id={schedule_id}")

    return updated_schedule
