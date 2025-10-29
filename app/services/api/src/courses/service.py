from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.services.api.src.courses import dto_in, dto_out


def get_courses(db: Database) -> dto_out.GetAllCourses:
    """
    Get all courses

    Args:
        db: Database dependency

    Returns:
        GetAllCourses: List of courses

    Raises:
        HTTPException: If there is an error retrieving courses
    """
    collection = db.get_collection(models.Course.COLLECTION_NAME)

    try:
        courses_data = collection.find({}).to_list()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving courses: {str(e)}"
        )

    courses = [
        models.Course(**course)
        for course in courses_data
    ]

    return dto_out.GetAllCourses(courses=courses)


def get_course_by_id(db: Database, course_id: str) -> dto_out.GetCourse:
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
    collection = db.get_collection(models.Course.COLLECTION_NAME)

    try:
        course_data = collection.find_one({"_id": course_id})
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

    return dto_out.GetCourse(course=course)


def create_course(db: Database, request: dto_in.CreateCourse) -> dto_out.GetCourse:
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
    institutions_collection = db.get_collection(models.Institution.COLLECTION_NAME)
    institution = institutions_collection.find_one({"_id": request.institution_id})
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {request.institution_id} not found"
        )

    collection = db.get_collection(models.Course.COLLECTION_NAME)

    course = models.Course(**request.model_dump())

    try:
        collection.insert_one(course.model_dump(by_alias=True))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error creating course: {str(e)}"
        )

    return dto_out.GetCourse(course=course)


def delete_course(db: Database, course_id: str) -> None:
    """
    Delete a course by ID

    Args:
        db: Database dependency
        course_id: ID of the course to delete

    Raises:
        HTTPException: If there is an error deleting the course or if not found
    """
    collection = db.get_collection(models.Course.COLLECTION_NAME)

    try:
        result = collection.delete_one({"_id": course_id})
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


def update_course(db: Database, course_id: str, request: dto_in.UpdateCourse) -> dto_out.GetCourse:
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
    collection = db.get_collection(models.Course.COLLECTION_NAME)

    update_data = {k: v for k, v in request.model_dump().items() if v is not None}

    try:
        result = collection.update_one(
            {"_id": course_id},
            {"$set": update_data}
        )
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
