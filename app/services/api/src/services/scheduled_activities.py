from typing import List

from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.libs.logging.logger import get_logger
from app.services.api.src.auth import acces_verifiers
from app.services.api.src.dtos.input import scheduled_activity as dto_in
from app.services.api.src.repositories import (
    scheduled_activities as scheduled_activities_repo,
    schedules as schedules_repo,
    activities as activities_repo,
    rooms as rooms_repo,
    users as users_repo,
)


logger = get_logger()


def get_scheduled_activities(db: Database, current_user_id: str) -> List[models.ScheduledActivity]:
    """Get all scheduled_activities"""
    logger.info("Fetching all scheduled_activities")
    try:
        scheduled_activities_data = scheduled_activities_repo.find_all_scheduled_activities(db)
    except Exception as e:
        logger.error(f"Failed to retrieve scheduled_activities: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving scheduled_activities: {str(e)}"
        )

    user = models.User(**users_repo.find_user_by_id(db, current_user_id))

    # Filter scheduled activities by checking if their schedule's institution is accessible to user
    filtered_scheduled_activities = []
    for sa_data in scheduled_activities_data:
        schedule_data = schedules_repo.find_schedule_by_id(db, sa_data['schedule_id'])
        if schedule_data and schedule_data['institution_id'] in user.user_roles:
            filtered_scheduled_activities.append(models.ScheduledActivity(**sa_data))

    scheduled_activities = filtered_scheduled_activities
    logger.info(f"Fetched {len(scheduled_activities)} scheduled_activities")

    return scheduled_activities


def get_scheduled_activity_by_id(
        db: Database,
        scheduled_activity_id: str,
        current_user_id: str
) -> models.ScheduledActivity:
    """Get scheduled_activity by ID"""
    logger.info(f"Fetching scheduled_activity by id: {scheduled_activity_id}")
    try:
        scheduled_activity_data = scheduled_activities_repo.find_scheduled_activity_by_id(
            db, scheduled_activity_id
        )
    except Exception as e:
        logger.error(f"Failed to retrieve scheduled_activity {scheduled_activity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving scheduled_activity with id {scheduled_activity_id}: {str(e)}"
        )

    if not scheduled_activity_data:
        logger.error(f"ScheduledActivity not found: {scheduled_activity_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ScheduledActivity with id {scheduled_activity_id} not found"
        )

    scheduled_activity = models.ScheduledActivity(**scheduled_activity_data)
    acces_verifiers.raise_scheduled_activity_forbidden(db, current_user_id, scheduled_activity)

    logger.info(f"Fetched scheduled_activity: {scheduled_activity.id}")
    return scheduled_activity


def create_scheduled_activity(
        db: Database,
        request: dto_in.CreateScheduledActivity,
        current_user_id: str
) -> models.ScheduledActivity:
    """Create a new scheduled_activity"""
    logger.info(f"Creating scheduled_activity for activity={request.activity_id}")

    schedule = schedules_repo.find_schedule_by_id(db, request.schedule_id)
    if not schedule:
        logger.error(f"Schedule not found: {request.schedule_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule with id {request.schedule_id} not found"
        )

    activity = activities_repo.find_activity_by_id(db, request.activity_id)
    if not activity:
        logger.error(f"Activity not found: {request.activity_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity with id {request.activity_id} not found"
        )

    room = rooms_repo.find_room_by_id(db, request.room_id)
    if not room:
        logger.error(f"Room not found: {request.room_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with id {request.room_id} not found"
        )

    scheduled_activity = models.ScheduledActivity(**request.model_dump())
    acces_verifiers.raise_scheduled_activity_forbidden(
        db, current_user_id, scheduled_activity, admin_only=True
    )

    try:
        scheduled_activities_repo.insert_scheduled_activity(db, scheduled_activity)
    except Exception as e:
        logger.error(f"Failed to create scheduled_activity: {scheduled_activity}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error creating scheduled_activity: {str(e)}"
        )

    logger.info(f"Created scheduled_activity {scheduled_activity.id}")
    return scheduled_activity


def delete_scheduled_activity(db: Database, scheduled_activity_id: str, current_user_id: str) -> None:
    """Delete a scheduled_activity by ID"""
    logger.info(f"Deleting scheduled_activity id={scheduled_activity_id}")

    scheduled_activity = get_scheduled_activity_by_id(db, scheduled_activity_id, current_user_id)
    acces_verifiers.raise_scheduled_activity_forbidden(
        db, current_user_id, scheduled_activity, admin_only=True
    )

    try:
        result = scheduled_activities_repo.delete_scheduled_activity_by_id(
            db, scheduled_activity_id
        )
    except Exception as e:
        logger.error(f"Failed to delete scheduled_activity {scheduled_activity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting scheduled_activity with id {scheduled_activity_id}: {str(e)}"
        )

    if result.deleted_count == 0:
        logger.error(f"ScheduledActivity not found for deletion: {scheduled_activity_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ScheduledActivity with id {scheduled_activity_id} not found"
        )
    logger.info(f"Deleted scheduled_activity id={scheduled_activity_id}")


def update_scheduled_activity(
        db: Database,
        scheduled_activity_id: str,
        scheduled_activity_request: dto_in.UpdateScheduledActivity,
        current_user_id: str
) -> models.ScheduledActivity:
    """Update an existing scheduled_activity"""
    scheduled_activity_dict = scheduled_activity_request.model_dump(exclude_unset=True)
    logger.info(f"Updating scheduled_activity id={scheduled_activity_id}"
                f" with data={scheduled_activity_dict}")

    scheduled_activity = get_scheduled_activity_by_id(db, scheduled_activity_id, current_user_id)
    acces_verifiers.raise_scheduled_activity_forbidden(
        db, current_user_id, scheduled_activity, admin_only=True
    )

    if "room_id" in scheduled_activity_dict:
        room = rooms_repo.find_room_by_id(db, scheduled_activity_dict.get("room_id"))
        if not room:
            logger.error(f"Room not found: {scheduled_activity_dict.get('room_id')}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Room with id {scheduled_activity_dict.get('room_id')} not found"
            )

    try:
        result = scheduled_activities_repo.update_scheduled_activity_by_id(
            db, scheduled_activity_id, scheduled_activity_dict
        )
    except Exception as e:
        logger.error(f"Failed to update scheduled_activity {scheduled_activity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating scheduled_activity with id {scheduled_activity_id}: {str(e)}"
        )

    if result.matched_count == 0:
        logger.error(f"ScheduledActivity not found for update: {scheduled_activity_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ScheduledActivity with id {scheduled_activity_id} not found"
        )

    updated_scheduled_activity = get_scheduled_activity_by_id(
        db, scheduled_activity_id, current_user_id
    )
    logger.info(f"Updated scheduled_activity {updated_scheduled_activity.id}")
    return updated_scheduled_activity


def insert_scheduled_activities_bulk(
        db: Database,
        request: dto_in.InsertManyScheduledActivities,
        current_user_id: str
) -> None:
    """Create scheduled_activities in bulk"""
    logger.info(f"Inserting {len(request.scheduled_activities)} scheduled_activities in bulk")
    scheduled_activities = [
        models.ScheduledActivity(**sa.model_dump())
        for sa in request.scheduled_activities
    ]

    # Verify permissions for each scheduled activity schedule
    scheduled_activities_by_schedule = {}
    for sa in scheduled_activities:
        acces_verifiers.raise_scheduled_activity_forbidden(db, current_user_id, sa, admin_only=True)
        scheduled_activities_by_schedule[sa.schedule_id] = sa
    
    for schedule_id in scheduled_activities_by_schedule:
        schedule = schedules_repo.find_schedule_by_id(db, schedule_id)
        if not schedule:
            logger.error(f"Schedule not found: {schedule_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Schedule with id {schedule_id} not found"
            )
        acces_verifiers.raise_schedule_forbidden(
            db, current_user_id, models.Schedule(**schedule), admin_only=True
        )

    try:
        scheduled_activities_repo.insert_many_scheduled_activities(db, scheduled_activities)
    except Exception as e:
        logger.error(f"Failed to insert scheduled_activities in bulk: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error inserting scheduled_activities in bulk: {str(e)}"
        )

    logger.info(f"Inserted {len(scheduled_activities)} scheduled_activities in bulk")
