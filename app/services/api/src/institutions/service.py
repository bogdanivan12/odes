from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.services.api.src.institutions import dto_in, dto_out


def get_institutions(db: Database) -> dto_out.GetAllInstitutions:
    """
    Get all institutions

    Args:
        db: Database dependency

    Returns:
        GetAllInstitutions: List of institutions

    Raises:
        HTTPException: If there is an error retrieving institutions
    """
    collection = db.get_collection(models.Institution.COLLECTION_NAME)

    try:
        institutions_data = collection.find({}).to_list()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving institutions: {str(e)}"
        )

    institutions = [
        models.Institution(**institiution)
        for institiution in institutions_data
    ]

    return dto_out.GetAllInstitutions(institutions=institutions)


def get_institution_by_id(db: Database, institution_id: str) -> dto_out.GetInstitution:
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
    collection = db.get_collection(models.Institution.COLLECTION_NAME)

    try:
        institution_data = collection.find_one({"_id": institution_id})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving institution with id {institution_id}: {str(e)}"
        )

    if not institution_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {institution_id} not found."
        )

    institution = models.Institution(**institution_data)

    return dto_out.GetInstitution(institution=institution)


def create_institution(db: Database, request: dto_in.CreateInstitution) -> dto_out.GetInstitution:
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
    collection = db.get_collection(models.Institution.COLLECTION_NAME)

    institution = models.Institution(**request.model_dump())

    try:
        collection.insert_one(institution.model_dump(by_alias=True))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error creating institution: {str(e)}"
        )

    return dto_out.GetInstitution(institution=institution)


def delete_institution(db: Database, institution_id: str) -> None:
    """
    Delete an institution by ID

    Args:
        db: Database dependency
        institution_id: ID of the institution to delete

    Raises:
        HTTPException: If there is an error deleting the institution or if not found
    """
    collection = db.get_collection(models.Institution.COLLECTION_NAME)

    try:
        result = collection.delete_one({"_id": institution_id})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting institution with id {institution_id}: {str(e)}"
        )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {institution_id} not found."
        )


def update_institution(
        db: Database,
        institution_id: str,
        request: dto_in.UpdateInstitution
) -> dto_out.GetInstitution:
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
    collection = db.get_collection(models.Institution.COLLECTION_NAME)

    updated_data = request.model_dump(exclude_unset=True)

    try:
        result = collection.update_one(
            {"_id": institution_id},
            {"$set": updated_data}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating institution with id {institution_id}: {str(e)}"
        )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {institution_id} not found."
        )

    return get_institution_by_id(db, institution_id)


def get_institution_courses(db: Database, institution_id: str) -> dto_out.GetInstitutionCourses:
    """
    Get courses of an institution

    Args:
        db: Database dependency
        institution_id: ID of the institution

    Returns:
        GetInstitutionCourses: List of courses

    Raises:
        HTTPException: If there is an error retrieving courses
    """
    get_institution_by_id(db, institution_id)

    courses_collection = db.get_collection(models.Course.COLLECTION_NAME)

    try:
        courses_data = courses_collection.find({"institution_id": institution_id}).to_list()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving courses for institution with id {institution_id}: {str(e)}"
        )

    courses = [
        models.Course(**course)
        for course in courses_data
    ]

    return dto_out.GetInstitutionCourses(courses=courses)
