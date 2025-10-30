from starlette import status
from fastapi import APIRouter

from app.libs.db.db import DB
from app.services.api.src.services import institutions as service
from app.services.api.src.dtos.input import institution as dto_in
from app.services.api.src.dtos.output import institution as dto_out


router = APIRouter(prefix="/api/v1/institutions", tags=["institutions"])


@router.get("/",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetAllInstitutions)
async def get_institutions(db: DB):
    """
    Get all institutions

    Args:
        db: Database dependency

    Returns:
        GetAllInstitutions: List of institutions

    Raises:
        HTTPException: If there is an error retrieving institutions
    """
    institutions = service.get_institutions(db)
    return dto_out.GetAllInstitutions(institutions=institutions)


@router.get("/{institution_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitution)
async def get_institution_by_id(db: DB, institution_id: str):
    """
    Get institution by ID

    Args:
        db: Database dependency
        institution_id: ID of the institution

    Returns:
        GetInstitutionById: Institution data

    Raises:
        HTTPException: If there is an error retrieving the institution or if not found
    """
    institution = service.get_institution_by_id(db, institution_id)
    return dto_out.GetInstitution(institution=institution)


@router.post("/",
             status_code=status.HTTP_201_CREATED,
             response_model=dto_out.GetInstitution)
async def create_institution(db: DB, request: dto_in.CreateInstitution):
    """
    Create a new institution

    Args:
        db: Database dependency
        request: CreateInstitution DTO

    Returns:
        GetInstitutionById: Created institution data

    Raises:
        HTTPException: If there is an error creating the institution
    """
    institution = service.create_institution(db, request)
    return dto_out.GetInstitution(institution=institution)


@router.delete("/{institution_id}",
               status_code=status.HTTP_204_NO_CONTENT)
async def delete_institution(db: DB, institution_id: str):
    """
    Delete an institution by ID

    Args:
        db: Database dependency
        institution_id: ID of the institution to delete

    Raises:
        HTTPException: If there is an error deleting the institution or if not found
    """
    service.delete_institution(db, institution_id)


@router.put("/{institution_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitution)
async def update_institution(db: DB, institution_id: str, request: dto_in.UpdateInstitution):
    """
    Update an institution by ID

    Args:
        db: Database dependency
        institution_id: ID of the institution to update
        request: UpdateInstitution DTO

    Returns:
        GetInstitutionById: Updated institution data

    Raises:
        HTTPException: If there is an error updating the institution or if not found
    """
    institution = service.update_institution(db, institution_id, request)
    return dto_out.GetInstitution(institution=institution)


@router.get("/{institution_id}/courses",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitutionCourses)
async def get_institution_courses(db: DB, institution_id: str):
    """
    Get all courses for a specific institution

    Args:
        db: Database dependency
        institution_id: ID of the institution

    Returns:
        GetInstitutionCourses: List of courses for the institution

    Raises:
        HTTPException: If there is an error retrieving the courses
            or if the institution is not found
    """
    courses = service.get_institution_courses(db, institution_id)
    return dto_out.GetInstitutionCourses(courses=courses)
