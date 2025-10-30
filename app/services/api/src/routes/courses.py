from starlette import status
from fastapi import APIRouter

from app.libs.db.db import DB
from app.services.api.src.services import courses as service
from app.services.api.src.dtos.input import course as dto_in
from app.services.api.src.dtos.output import course as dto_out

router = APIRouter(prefix="/api/v1/courses", tags=["courses"])


@router.get("/",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetAllCourses)
async def get_courses(db: DB):
    """
    Get all courses

    Args:
        db: Database dependency

    Returns:
        GetAllCourses: List of courses

    Raises:
        HTTPException: If there is an error retrieving courses
    """
    courses = service.get_courses(db)
    return dto_out.GetAllCourses(courses=courses)


@router.get("/{course_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetCourse)
async def get_course_by_id(db: DB, course_id: str):
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
    course = service.get_course_by_id(db, course_id)
    return dto_out.GetCourse(course=course)


@router.post("/",
             status_code=status.HTTP_201_CREATED,
             response_model=dto_out.GetCourse)
async def create_course(db: DB, request: dto_in.CreateCourse):
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
    course = service.create_course(db, request)
    return dto_out.GetCourse(course=course)


@router.put("/{course_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetCourse)
async def update_course(db: DB, course_id: str, request: dto_in.UpdateCourse):
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
    course = service.update_course(db, course_id, request)
    return dto_out.GetCourse(course=course)


@router.delete("/{course_id}",
               status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(db: DB, course_id: str):
    """
    Delete a course by ID

    Args:
        db: Database dependency
        course_id: ID of the course to delete

    Returns:
        None

    Raises:
        HTTPException: If there is an error deleting the course or if not found
    """
    service.delete_course(db, course_id)
