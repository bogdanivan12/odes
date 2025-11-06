from typing import List

from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.services.api.src.dtos.input import course as dto_in
from app.services.api.src.repositories import (
    courses as courses_repo,
    institutions as institutions_repo,
    activities as activities_repo
)


def get_courses(db: Database) -> List[models.Course]:
    """
    Get all courses

    Args:
        db: Database dependency

    Returns:
        GetAllCourses: List of courses

    Raises:
        HTTPException: If there is an error retrieving courses
    """
    try:
        courses_data = courses_repo.find_all_courses(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving courses: {str(e)}"
        )

    courses = [models.Course(**course) for course in courses_data]

    return courses


def get_course_by_id(db: Database, course_id: str) -> models.Course:
    """
    Get course by ID

    Args:
        db: Database dependency
        course_id: ID of the course

    Returns:
        GetCourseById: Course data

    Raises:
        HTTPException: If there is an error retrieving the course or if not found
    """
    try:
        course_data = courses_repo.find_course_by_id(db, course_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving course with id {course_id}: {str(e)}"
        )

    if not course_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with id {course_id} not found"
        )

    course = models.Course(**course_data)

    return course


def create_course(db: Database, request: dto_in.CreateCourse) -> models.Course:
    """
    Create a new course

    Args:
        db: Database dependency
        request: CreateCourse DTO

    Returns:
        GetCourse: Created course data

    Raises:
        HTTPException: If there is an error creating the course
    """
    institution = institutions_repo.find_institution_by_id(db, request.institution_id)
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {request.institution_id} not found"
        )

    course = models.Course(**request.model_dump())

    try:
        courses_repo.insert_course(db, course)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error creating course: {str(e)}"
        )

    return course


def delete_course(db: Database, course_id: str) -> None:
    """
    Delete a course by ID

    Args:
        db: Database dependency
        course_id: ID of the course to delete

    Raises:
        HTTPException: If there is an error deleting the course or if not found
    """
    try:
        result = courses_repo.delete_course_by_id(db, course_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting course with id {course_id}: {str(e)}"
        )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with id {course_id} not found"
        )


def update_course(db: Database, course_id: str, request: dto_in.UpdateCourse) -> models.Course:
    """
    Update an existing course

    Args:
        db: Database dependency
        course_id: ID of the course to update
        request: UpdateCourse DTO

    Returns:
        GetCourse: Updated course data

    Raises:
        HTTPException: If there is an error updating the course or if not found
    """
    update_data = request.model_dump(exclude_unset=True)

    try:
        result = courses_repo.update_course_by_id(db, course_id, update_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating course with id {course_id}: {str(e)}"
        )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with id {course_id} not found"
        )

    return get_course_by_id(db, course_id)


def get_course_activities(db: Database, course_id: str) -> List[models.Activity]:
    """
    Get all activities for a specific course

    Args:
        db: Database dependency
        course_id: ID of the course

    Returns:
        List[Activity]: List of activities for the course

    Raises:
        HTTPException: If there is an error retrieving activities, or if the course is not found
    """
    if not courses_repo.find_course_by_id(db, course_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with id {course_id} not found"
        )

    try:
        activities_data = activities_repo.find_activities_by_course_id(db, course_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving activities for course with id {course_id}: {str(e)}"
        )

    activities = [models.Activity(**activity) for activity in activities_data]

    return activities
