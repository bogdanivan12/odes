from typing import List

from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.libs.logging.logger import get_logger
from app.services.api.src.dtos.input import activity as dto_in
from app.services.api.src.repositories import (
    activities as activities_repo,
    institutions as institutions_repo,
    courses as courses_repo,
    groups as groups_repo,
    users as users_repo
)

logger = get_logger()


def get_activities(db: Database, current_user_id: str) -> List[models.Activity]:
    """Get all activities"""
    logger.info("Fetching all activities")
    try:
        activities_data = activities_repo.find_all_activities(db)
    except Exception as e:
        logger.error(f"Failed to retrieve activities: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving activities: {str(e)}"
        )

    user = models.User(**users_repo.find_user_by_id(db, current_user_id))
    activities = [models.Activity(**activity) for activity in activities_data
                  if activity['institution_id'] in user.user_roles]
    logger.info(f"Fetched {len(activities)} activities")

    return activities


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
        logger.error(f"User {current_user_id} forbidden from admin access to activity {activity.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User with id {current_user_id} does not have admin access"
                   f" to activity {activity.id}"
        )


def get_activity_by_id(db: Database, activity_id: str, current_user_id: str) -> models.Activity:
    """Get activity by ID"""
    logger.info(f"Fetching activity by id: {activity_id}")
    try:
        activity_data = activities_repo.find_activity_by_id(db, activity_id)
    except Exception as e:
        logger.error(f"Failed to retrieve activity {activity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving activity with id {activity_id}: {str(e)}"
        )

    if not activity_data:
        logger.error(f"Activity not found: {activity_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity with id {activity_id} not found."
        )

    activity = models.Activity(**activity_data)
    raise_activity_forbidden(db, current_user_id, activity)

    logger.info(f"Fetched activity: {activity.id}")

    return activity


def create_activity(db: Database, request: dto_in.CreateActivity, current_user_id: str) -> models.Activity:
    """Create a new activity"""
    logger.info(
        f"Creating activity for institution={request.institution_id}"
        f" course={request.course_id} group={request.group_id} professor={request.professor_id}"
    )

    activity = models.Activity(**request.model_dump())
    raise_activity_forbidden(db, current_user_id, activity, admin_only=True)

    institution = institutions_repo.find_institution_by_id(db, request.institution_id)
    if not institution:
        logger.error(f"Institution not found: {request.institution_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {request.institution_id} not found."
        )

    course = courses_repo.find_course_by_id(db, request.course_id)
    if not course:
        logger.error(f"Course not found: {request.course_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with id {request.course_id} not found."
        )

    course = models.Course(**course)
    if course.institution_id != request.institution_id:
        logger.error(
            f"Course {request.course_id} does not belong to institution {request.institution_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Course with id {request.course_id} does not belong to"
                   f" institution with id {request.institution_id}."
        )

    group = groups_repo.find_group_by_id(db, request.group_id)
    if not group:
        logger.error(f"Group not found: {request.group_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Group with id {request.group_id} not found."
        )

    group = models.Group(**group)
    if group.institution_id != request.institution_id:
        logger.error(
            f"Group {request.group_id} does not belong to institution {request.institution_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Group with id {request.group_id} does not belong to"
                   f" institution with id {request.institution_id}."
        )

    professor = users_repo.find_user_by_id(db, request.professor_id)
    if not professor:
        logger.error(f"Professor not found: {request.professor_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Professor with id {request.professor_id} not found."
        )

    professor = models.User(**professor)
    if models.UserRole.PROFESSOR not in professor.user_roles.get(request.institution_id, []):
        logger.error(
            f"User {request.professor_id} is not a professor"
            f" for institution {request.institution_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with id {request.professor_id} is not a professor"
                   f" for institution with id {request.institution_id}."
        )

    try:
        activities_repo.insert_activity(db, activity)
    except Exception as e:
        logger.error(f"Failed to create activity: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error creating activity: {str(e)}"
        )

    logger.info(f"Created activity {activity.id}")
    return activity


def delete_activity(db: Database, activity_id: str, current_user_id: str) -> None:
    """Delete an activity by ID"""
    logger.info(f"Deleting activity {activity_id}")

    activity = get_activity_by_id(db, activity_id, current_user_id)
    raise_activity_forbidden(db, current_user_id, activity, admin_only=True)

    try:
        result = activities_repo.delete_activity_by_id(db, activity_id)
    except Exception as e:
        logger.error(f"Failed to delete activity {activity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting activity with id {activity_id}: {str(e)}"
        )

    if result.deleted_count == 0:
        logger.error(f"Activity not found for deletion: {activity_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity with id {activity_id} not found."
        )
    logger.info(f"Deleted activity {activity_id}")


def update_activity(
        db: Database,
        activity_id: str,
        request: dto_in.UpdateActivity,
        current_user_id: str
) -> models.Activity:
    """Update an activity by ID"""
    logger.info(
        f"Updating activity {activity_id} with data {request.model_dump(exclude_unset=True)}"
    )
    activity = get_activity_by_id(db, activity_id, current_user_id)
    raise_activity_forbidden(db, current_user_id, activity, admin_only=True)

    updated_data = request.model_dump(exclude_unset=True)

    if "course_id" in updated_data:
        course = courses_repo.find_course_by_id(db, updated_data["course_id"])
        if not course:
            logger.error(f"Course not found for update: {updated_data['course_id']}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with id {updated_data['course_id']} not found."
            )

        course = models.Course(**course)
        if course.institution_id != activity.institution_id:
            logger.error(
                f"Course {course.id} does not belong to institution {activity.institution_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Course with id {course.id} does not belong to"
                       f" institution with id {activity.institution_id}."
            )

    if "group_id" in updated_data:
        group = groups_repo.find_group_by_id(db, updated_data["group_id"])
        if not group:
            logger.error(f"Group not found for update: {updated_data['group_id']}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Group with id {updated_data['group_id']} not found."
            )

        group = models.Group(**group)
        if group.institution_id != activity.institution_id:
            logger.error(
                f"Group {group.id} does not belong to institution {activity.institution_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Group with id {group.id} does not belong to"
                       f" institution with id {activity.institution_id}."
            )

    if "professor_id" in updated_data:
        professor = users_repo.find_user_by_id(db, updated_data["professor_id"])
        if not professor:
            logger.error(f"Professor not found for update: {updated_data['professor_id']}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Professor with id {updated_data['professor_id']} not found."
            )

        professor = models.User(**professor)
        if models.UserRole.PROFESSOR not in professor.user_roles.get(activity.institution_id, []):
            logger.error(
                f"User {professor.id} is not a professor for institution {activity.institution_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with id {professor.id} is not a professor"
                       f" for institution with id {activity.institution_id}."
            )

    try:
        result = activities_repo.update_activity_by_id(db, activity_id, updated_data)
    except Exception as e:
        logger.error(f"Failed to update activity {activity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating activity with id {activity_id}: {str(e)}"
        )

    if result.matched_count == 0:
        logger.error(f"Activity not found for update: {activity_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity with id {activity_id} not found."
        )

    updated = get_activity_by_id(db, activity_id, current_user_id)
    logger.info(f"Updated activity {updated.id}")
    return updated
