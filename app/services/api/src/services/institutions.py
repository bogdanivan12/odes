from typing import List

from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.services.api.src.dtos.input import institution as dto_in
from app.services.api.src.repositories import (
    rooms as rooms_repo,
    groups as groups_repo,
    courses as courses_repo,
    institutions as institutions_repo
)


def get_institutions(db: Database) -> List[models.Institution]:
    """
    Get all institutions

    Args:
        db: Database dependency

    Returns:
        GetAllInstitutions: List of institutions

    Raises:
        HTTPException: If there is an error retrieving institutions
    """
    try:
        institutions_data = institutions_repo.find_all_institutions(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving institutions: {str(e)}"
        )

    institutions = [models.Institution(**institution) for institution in institutions_data]

    return institutions


def get_institution_by_id(db: Database, institution_id: str) -> models.Institution:
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
    try:
        institution_data = institutions_repo.find_institution_by_id(db, institution_id)
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

    return institution


def create_institution(db: Database, request: dto_in.CreateInstitution) -> models.Institution:
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
    institution = models.Institution(**request.model_dump())

    try:
        institutions_repo.insert_institution(db, institution)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error creating institution: {str(e)}"
        )

    return institution


def delete_institution(db: Database, institution_id: str) -> None:
    """
    Delete an institution by ID

    Args:
        db: Database dependency
        institution_id: ID of the institution to delete

    Raises:
        HTTPException: If there is an error deleting the institution or if not found
    """
    try:
        result = institutions_repo.delete_institution_by_id(db, institution_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting institution with id {institution_id}: {str(e)}"
        )

    try:
        courses_repo.delete_courses_by_institution_id(db, institution_id)
        rooms_repo.delete_rooms_by_institution_id(db, institution_id)
        groups_repo.delete_groups_by_institution_id(db, institution_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting related data for institution"
                   f" with id {institution_id}: {str(e)}"
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
) -> models.Institution:
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
    updated_data = request.model_dump(exclude_unset=True)

    try:
        result = institutions_repo.update_institution_by_id(db, institution_id, updated_data)
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


def get_institution_courses(db: Database, institution_id: str) -> List[models.Course]:
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

    try:
        courses_data = courses_repo.find_courses_by_institution_id(db, institution_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving courses for institution with id {institution_id}: {str(e)}"
        )

    courses = [models.Course(**course) for course in courses_data]

    return courses


def get_institution_rooms(db: Database, institution_id: str) -> List[models.Room]:
    """
    Get rooms of an institution

    Args:
        db: Database dependency
        institution_id: ID of the institution

    Returns:
        GetInstitutionRooms: List of rooms

    Raises:
        HTTPException: If there is an error retrieving rooms
    """
    get_institution_by_id(db, institution_id)

    try:
        rooms_data = rooms_repo.find_rooms_by_institution_id(db, institution_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving rooms for institution with id {institution_id}: {str(e)}"
        )

    rooms = [models.Room(**room) for room in rooms_data]

    return rooms


def get_institution_groups(db: Database, institution_id: str) -> List[models.Group]:
    """
    Get groups of an institution

    Args:
        db: Database dependency
        institution_id: ID of the institution

    Returns:
        GetInstitutionGroups: List of groups

    Raises:
        HTTPException: If there is an error retrieving groups
    """
    get_institution_by_id(db, institution_id)

    try:
        groups_data = groups_repo.find_groups_by_institution_id(db, institution_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving groups for institution with id {institution_id}: {str(e)}"
        )

    groups = [models.Group(**group) for group in groups_data]

    return groups
