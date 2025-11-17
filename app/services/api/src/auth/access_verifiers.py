from fastapi import HTTPException
from pymongo.synchronous.database import Database
from starlette import status

from app.libs.db import models
from app.libs.logging.logger import get_logger
from app.services.api.src.repositories import (
    users as users_repo,
    schedules as schedules_repo
)

logger = get_logger()


def raise_activity_forbidden(
        db: Database,
        current_user_id: str,
        activity: models.Activity,
        admin_only: bool = False
) -> None:
    """Raise HTTP 403 if the user does not have access to the activity"""
    user = models.User(**users_repo.find_user_by_id(db, current_user_id))

    if activity.institution_id not in user.user_roles:
        logger.error(f"User {current_user_id} forbidden from accessing activity {activity.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User with id {current_user_id} does not have access to activity {activity.id}"
        )

    if admin_only and models.UserRole.ADMIN not in user.user_roles[activity.institution_id]:
        logger.error(f"User {current_user_id} forbidden from admin access"
                     f" to activity {activity.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User with id {current_user_id} does not have admin access"
                   f" to activity {activity.id}"
        )


def raise_course_forbidden(
        db: Database,
        current_user_id: str,
        course: models.Course,
        admin_only: bool = False
) -> None:
    """Raise HTTP 403 if the user does not have access to the course"""
    user = models.User(**users_repo.find_user_by_id(db, current_user_id))

    if course.institution_id not in user.user_roles:
        logger.error(f"User {current_user_id} forbidden from accessing course {course.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User with id {current_user_id} does not have access to course {course.id}"
        )

    if admin_only and models.UserRole.ADMIN not in user.user_roles[course.institution_id]:
        logger.error(f"User {current_user_id} forbidden from admin access to course {course.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User with id {current_user_id} does not have admin access"
                   f" to course {course.id}"
        )


def raise_group_forbidden(
        db: Database,
        current_user_id: str,
        group: models.Group,
        admin_only: bool = False
) -> None:
    """Raise HTTP 403 if the user does not have access to the group"""
    user = models.User(**users_repo.find_user_by_id(db, current_user_id))

    if group.institution_id not in user.user_roles:
        logger.error(f"User {current_user_id} forbidden from accessing group {group.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User with id {current_user_id} does not have access to group {group.id}"
        )

    if admin_only and models.UserRole.ADMIN not in user.user_roles[group.institution_id]:
        logger.error(f"User {current_user_id} forbidden from admin access to group {group.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User with id {current_user_id} does not have admin access"
                   f" to group {group.id}"
        )


def raise_institution_forbidden(
        db: Database,
        current_user_id: str,
        institution_id: str,
        admin_only: bool = False
) -> None:
    """Raise HTTP 403 Forbidden for institution access"""
    current_user = models.User(**users_repo.find_user_by_id(db, current_user_id))
    if admin_only:
        if models.UserRole.ADMIN not in current_user.user_roles.get(institution_id, []):
            error_message = (
                f"User with id {current_user_id} does not have admin rights"
                f" for institution {institution_id}"
            )
            logger.error(error_message)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_message
            )
    else:
        if institution_id not in current_user.user_roles:
            error_message = (
                f"User with id {current_user_id} has no access to institution {institution_id}"
            )
            logger.error(error_message)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_message
            )


def raise_room_forbidden(
        db: Database,
        current_user_id: str,
        room: models.Room,
        admin_only: bool = False
) -> None:
    """Raise HTTP 403 if the user does not have access to the room"""
    user = models.User(**users_repo.find_user_by_id(db, current_user_id))

    if room.institution_id not in user.user_roles:
        logger.error(f"User {current_user_id} forbidden from accessing room {room.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User with id {current_user_id} does not have access to room {room.id}"
        )

    if admin_only and models.UserRole.ADMIN not in user.user_roles[room.institution_id]:
        logger.error(f"User {current_user_id} forbidden from admin access to room {room.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User with id {current_user_id} does not have admin access to room {room.id}"
        )


def raise_scheduled_activity_forbidden(
        db: Database,
        current_user_id: str,
        scheduled_activity: models.ScheduledActivity,
        admin_only: bool = False
) -> None:
    """Raise HTTP 403 if the user does not have access to the scheduled activity"""
    # Get the schedule to find the institution
    schedule_data = schedules_repo.find_schedule_by_id(db, scheduled_activity.schedule_id)
    if not schedule_data:
        logger.error(f"Schedule not found: {scheduled_activity.schedule_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule with id {scheduled_activity.schedule_id} not found"
        )

    schedule = models.Schedule(**schedule_data)
    user = models.User(**users_repo.find_user_by_id(db, current_user_id))

    if schedule.institution_id not in user.user_roles:
        logger.error(f"User {current_user_id} forbidden from accessing"
                     f" scheduled activity {scheduled_activity.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User with id {current_user_id} does not have access"
                   f" to scheduled activity {scheduled_activity.id}"
        )

    if admin_only and models.UserRole.ADMIN not in user.user_roles[schedule.institution_id]:
        logger.error(f"User {current_user_id} forbidden from admin access"
                     f" to scheduled activity {scheduled_activity.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User with id {current_user_id} does not have admin access"
                   f" to scheduled activity {scheduled_activity.id}"
        )


def raise_schedule_forbidden(
        db: Database,
        current_user_id: str,
        schedule: models.Schedule,
        admin_only: bool = False
) -> None:
    """Raise HTTP 403 if the user does not have access to the schedule"""
    user = models.User(**users_repo.find_user_by_id(db, current_user_id))

    if schedule.institution_id not in user.user_roles:
        logger.error(f"User {current_user_id} forbidden from accessing schedule {schedule.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User with id {current_user_id} does not have access to schedule {schedule.id}"
        )

    if admin_only and models.UserRole.ADMIN not in user.user_roles[schedule.institution_id]:
        logger.error(f"User {current_user_id} forbidden from admin access"
                     f" to schedule {schedule.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User with id {current_user_id} does not have admin access"
                   f" to schedule {schedule.id}"
        )
