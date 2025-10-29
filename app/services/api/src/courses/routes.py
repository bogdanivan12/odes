from starlette import status
from fastapi import APIRouter

from app.libs.db.db import DB
from app.services.api.src.courses import service, dto_in, dto_out


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
    return service.get_courses(db)


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
    return service.get_course_by_id(db, course_id)


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
    return service.create_course(db, request)


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
    return service.update_course(db, course_id, request)


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
    return service.delete_course(db, course_id)
