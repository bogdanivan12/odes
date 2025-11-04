from typing import List

from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.services.api.src.dtos.input import activity as dto_in
from app.services.api.src.repositories import (
    activities as activities_repo,
    institutions as institutions_repo,
    courses as courses_repo,
    groups as groups_repo,
    users as users_repo
)


def get_activities(db: Database) -> List[models.Activity]:
    """Get all activities"""
    try:
        activities_data = activities_repo.find_all_activities(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving activities: {str(e)}"
        )

    activities = [models.Activity(**activity) for activity in activities_data]

    return activities


def get_activity_by_id(db: Database, activity_id: str) -> models.Activity:
    """Get activity by ID"""
    try:
        activity_data = activities_repo.find_activity_by_id(db, activity_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving activity with id {activity_id}: {str(e)}"
        )

    if not activity_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity with id {activity_id} not found."
        )

    activity = models.Activity(**activity_data)

    return activity


def create_activity(db: Database, request: dto_in.CreateActivity) -> models.Activity:
    """Create a new activity"""
    institution = institutions_repo.find_institution_by_id(db, request.institution_id)
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {request.institution_id} not found."
        )

    course = courses_repo.find_course_by_id(db, request.course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with id {request.course_id} not found."
        )

    group = groups_repo.find_group_by_id(db, request.group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Group with id {request.group_id} not found."
        )

    professor = users_repo.find_user_by_id(db, request.professor_id)
    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Professor with id {request.professor_id} not found."
        )

    activity = models.Activity(**request.model_dump())

    try:
        activities_repo.insert_activity(db, activity)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error creating activity: {str(e)}"
        )

    return activity


def delete_activity(db: Database, activity_id: str) -> None:
    """Delete an activity by ID"""
    try:
        result = activities_repo.delete_activity_by_id(db, activity_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting activity with id {activity_id}: {str(e)}"
        )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity with id {activity_id} not found."
        )


def update_activity(
        db: Database,
        activity_id: str,
        request: dto_in.UpdateActivity
) -> models.Activity:
    """Update an activity by ID"""
    updated_data = request.model_dump(exclude_unset=True)

    if "course_id" in updated_data:
        course = courses_repo.find_course_by_id(db, updated_data["course_id"])
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with id {updated_data['course_id']} not found."
            )

    if "group_id" in updated_data:
        group = groups_repo.find_group_by_id(db, updated_data["group_id"])
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Group with id {updated_data['group_id']} not found."
            )

    if "professor_id" in updated_data:
        professor = users_repo.find_user_by_id(db, updated_data["professor_id"])
        if not professor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Professor with id {updated_data['professor_id']} not found."
            )

    try:
        result = activities_repo.update_activity_by_id(db, activity_id, updated_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating activity with id {activity_id}: {str(e)}"
        )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity with id {activity_id} not found."
        )

    return get_activity_by_id(db, activity_id)
