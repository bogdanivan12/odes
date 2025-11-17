from typing import List

from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.libs.logging.logger import get_logger
from app.services.api.src.auth import access_verifiers
from app.services.api.src.dtos.input import course as dto_in
from app.services.api.src.repositories import (
    users as users_repo,
    courses as courses_repo,
    institutions as institutions_repo,
    activities as activities_repo
)

logger = get_logger()


def get_courses(db: Database, current_user_id: str) -> List[models.Course]:
    """Get all courses"""
    logger.info("Fetching all courses")
    try:
        courses_data = courses_repo.find_all_courses(db)
    except Exception as e:
        logger.error(f"Failed to retrieve courses: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving courses: {str(e)}"
        )

    user = models.User(**users_repo.find_user_by_id(db, current_user_id))
    courses = [models.Course(**course) for course in courses_data
               if course['institution_id'] in user.user_roles]
    logger.info(f"Fetched {len(courses)} courses")

    return courses


def get_course_by_id(db: Database, course_id: str, current_user_id: str) -> models.Course:
    """Get course by ID"""
    logger.info(f"Fetching course by id: {course_id}")
    try:
        course_data = courses_repo.find_course_by_id(db, course_id)
    except Exception as e:
        logger.error(f"Failed to retrieve course {course_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving course with id {course_id}: {str(e)}"
        )

    if not course_data:
        logger.error(f"Course not found: {course_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with id {course_id} not found"
        )

    course = models.Course(**course_data)
    access_verifiers.raise_course_forbidden(db, current_user_id, course)
    logger.info(f"Fetched course: {course.id}")

    return course


def create_course(
        db: Database,
        request: dto_in.CreateCourse,
        current_user_id: str
) -> models.Course:
    """Create a new course"""
    logger.info(f"Creating course {request.name} for institution {request.institution_id}")
    institution = institutions_repo.find_institution_by_id(db, request.institution_id)
    if not institution:
        logger.error(f"Institution not found: {request.institution_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {request.institution_id} not found"
        )

    course = models.Course(**request.model_dump())
    access_verifiers.raise_course_forbidden(db, current_user_id, course, admin_only=True)

    try:
        courses_repo.insert_course(db, course)
    except Exception as e:
        logger.error(f"Failed to create course: {course}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error creating course: {str(e)}"
        )

    logger.info(f"Created course {course.id} for institution {request.institution_id}")
    return course


def delete_course(db: Database, course_id: str, current_user_id: str) -> None:
    """Delete a course by ID"""
    logger.info(f"Deleting course {course_id}")

    course = get_course_by_id(db, course_id, current_user_id)
    access_verifiers.raise_course_forbidden(db, current_user_id, course, admin_only=True)

    try:
        result = courses_repo.delete_course_by_id(db, course_id)
    except Exception as e:
        logger.error(f"Failed to delete course {course_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting course with id {course_id}: {str(e)}"
        )

    try:
        activities_repo.delete_activities_by_course_id(db, course_id)
    except Exception as e:
        logger.error(f"Failed to delete activities for course {course_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting activities for course with id {course_id}: {str(e)}"
        )

    if result.deleted_count == 0:
        logger.error(f"Course not found for deletion: {course_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with id {course_id} not found"
        )
    logger.info(f"Deleted course {course_id}")


def update_course(
        db: Database,
        course_id: str,
        request: dto_in.UpdateCourse,
        current_user_id: str
) -> models.Course:
    """Update an existing course"""
    update_data = request.model_dump(exclude_unset=True)
    logger.info(f"Updating course {course_id} with data {update_data}")

    course = get_course_by_id(db, course_id, current_user_id)
    access_verifiers.raise_course_forbidden(db, current_user_id, course, admin_only=True)

    try:
        result = courses_repo.update_course_by_id(db, course_id, update_data)
    except Exception as e:
        logger.error(f"Failed to update course {course_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating course with id {course_id}: {str(e)}"
        )

    if result.matched_count == 0:
        logger.error(f"Course not found for update: {course_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with id {course_id} not found"
        )

    updated = get_course_by_id(db, course_id, current_user_id)
    logger.info(f"Updated course {updated.id}")
    return updated


def get_course_activities(db: Database, course_id: str, current_user_id: str) -> List[models.Activity]:
    """Get all activities for a specific course"""
    logger.info(f"Fetching activities for course {course_id}")

    course = get_course_by_id(db, course_id, current_user_id)
    access_verifiers.raise_course_forbidden(db, current_user_id, course)

    try:
        activities_data = activities_repo.find_activities_by_course_id(db, course_id)
    except Exception as e:
        logger.error(f"Failed to retrieve activities for course {course_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving activities for course with id {course_id}: {str(e)}"
        )

    activities = [models.Activity(**activity) for activity in activities_data]
    logger.info(f"Fetched {len(activities)} activities for course {course_id}")

    return activities
