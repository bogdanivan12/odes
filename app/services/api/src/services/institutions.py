from typing import List

from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.libs.logging.logger import get_logger
from app.services.api.src.dtos.input import institution as dto_in
from app.services.api.src.repositories import (
    rooms as rooms_repo,
    users as users_repo,
    groups as groups_repo,
    courses as courses_repo,
    schedules as schedules_repo,
    activities as activities_repo,
    institutions as institutions_repo,
    scheduled_activities as scheduled_activities_repo,
)

logger = get_logger()


def get_institutions(db: Database) -> List[models.Institution]:
    """Get all institutions"""
    logger.info("Fetching all institutions")
    try:
        institutions_data = institutions_repo.find_all_institutions(db)
    except Exception as e:
        logger.error(f"Failed to retrieve institutions: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving institutions: {str(e)}"
        )

    institutions = [models.Institution(**institution) for institution in institutions_data]
    logger.info(f"Fetched {len(institutions)} institutions")

    return institutions


def get_institution_by_id(db: Database, institution_id: str) -> models.Institution:
    """Get institution by ID"""
    logger.info(f"Fetching institution by id: {institution_id}")
    try:
        institution_data = institutions_repo.find_institution_by_id(db, institution_id)
    except Exception as e:
        logger.error(f"Failed to retrieve institution {institution_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving institution with id {institution_id}: {str(e)}"
        )

    if not institution_data:
        logger.error(f"Institution not found: {institution_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {institution_id} not found."
        )

    institution = models.Institution(**institution_data)
    logger.info(f"Fetched institution: {institution.id}")

    return institution


def create_institution(db: Database, request: dto_in.CreateInstitution) -> models.Institution:
    """Create a new institution"""
    logger.info(f"Creating institution {request.name}")
    institution = models.Institution(**request.model_dump())

    try:
        institutions_repo.insert_institution(db, institution)
    except Exception as e:
        logger.error(f"Failed to create institution: {institution}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error creating institution: {str(e)}"
        )

    logger.info(f"Created institution {institution.id}")
    return institution


def delete_institution(db: Database, institution_id: str) -> None:
    """Delete an institution by ID"""
    logger.info(f"Deleting institution id={institution_id}")
    try:
        result = institutions_repo.delete_institution_by_id(db, institution_id)
    except Exception as e:
        logger.error(f"Failed to delete institution {institution_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting institution with id {institution_id}: {str(e)}"
        )

    institution_users = users_repo.find_users_by_institution_id(db, institution_id)
    try:
        courses_repo.delete_courses_by_institution_id(db, institution_id)
        rooms_repo.delete_rooms_by_institution_id(db, institution_id)
        groups_repo.delete_groups_by_institution_id(db, institution_id)
        activities_repo.delete_activities_by_institution_id(db, institution_id)

        schedules = schedules_repo.find_schedules_by_institution_id(db, institution_id)
        for schedule in schedules:
            scheduled_activities_repo.delete_scheduled_activities_by_schedule_id(
                db, schedule["_id"]
            )

        schedules_repo.delete_schedules_by_institution_id(db, institution_id)

        for user in institution_users:
            if "institution_id" not in user["user_roles"]:
                continue
            user["user_roles"].pop("institution_id")
            update_data = {"user_roles": user["user_roles"]}
            users_repo.update_user_by_id(db, user["_id"], update_data)
    except Exception as e:
        logger.error(f"Failed to delete related data for institution {institution_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting related data for institution"
                   f" with id {institution_id}: {str(e)}"
        )

    if result.deleted_count == 0:
        logger.error(f"Institution not found for deletion: {institution_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {institution_id} not found."
        )
    logger.info(f"Deleted institution {institution_id}")


def update_institution(
        db: Database,
        institution_id: str,
        request: dto_in.UpdateInstitution
) -> models.Institution:
    """Update an institution by ID"""
    updated_data = request.model_dump(exclude_unset=True)
    logger.info(f"Updating institution {institution_id} with data {updated_data}")

    try:
        result = institutions_repo.update_institution_by_id(db, institution_id, updated_data)
    except Exception as e:
        logger.error(f"Failed to update institution {institution_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating institution with id {institution_id}: {str(e)}"
        )

    if result.matched_count == 0:
        logger.error(f"Institution not found for update: {institution_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {institution_id} not found."
        )

    logger.info(f"Updated institution {institution_id}")

    return get_institution_by_id(db, institution_id)


def get_institution_courses(db: Database, institution_id: str) -> List[models.Course]:
    """Get courses of an institution"""
    logger.info(f"Fetching courses for institution {institution_id}")
    get_institution_by_id(db, institution_id)

    try:
        courses_data = courses_repo.find_courses_by_institution_id(db, institution_id)
    except Exception as e:
        logger.error(f"Failed to retrieve courses for institution {institution_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving courses for institution with id {institution_id}: {str(e)}"
        )

    courses = [models.Course(**course) for course in courses_data]

    logger.info(f"Fetched {len(courses)} courses for institution {institution_id}")
    return courses


def get_institution_rooms(db: Database, institution_id: str) -> List[models.Room]:
    """Get rooms of an institution"""
    logger.info(f"Fetching rooms for institution {institution_id}")
    get_institution_by_id(db, institution_id)

    try:
        rooms_data = rooms_repo.find_rooms_by_institution_id(db, institution_id)
    except Exception as e:
        logger.error(f"Failed to retrieve rooms for institution {institution_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving rooms for institution with id {institution_id}: {str(e)}"
        )

    rooms = [models.Room(**room) for room in rooms_data]

    logger.info(f"Fetched {len(rooms)} rooms for institution {institution_id}")
    return rooms


def get_institution_groups(db: Database, institution_id: str) -> List[models.Group]:
    """Get groups of an institution"""
    logger.info(f"Fetching groups for institution {institution_id}")
    get_institution_by_id(db, institution_id)

    try:
        groups_data = groups_repo.find_groups_by_institution_id(db, institution_id)
    except Exception as e:
        logger.error(f"Failed to retrieve groups for institution {institution_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving groups for institution with id {institution_id}: {str(e)}"
        )

    groups = [models.Group(**group) for group in groups_data]

    logger.info(f"Fetched {len(groups)} groups for institution {institution_id}")
    return groups


def get_institution_users(db: Database, institution_id: str) -> List[models.User]:
    """Get users of an institution"""
    logger.info(f"Fetching users for institution {institution_id}")
    get_institution_by_id(db, institution_id)

    try:
        users_data = users_repo.find_users_by_institution_id(db, institution_id)
    except Exception as e:
        logger.error(f"Failed to retrieve users for institution {institution_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving users for institution with id {institution_id}: {str(e)}"
        )

    users = [models.User(**user) for user in users_data]

    logger.info(f"Fetched {len(users)} users for institution {institution_id}")
    return users


def get_institution_activities(db: Database, institution_id: str) -> List[models.Activity]:
    """Get activities of an institution"""
    logger.info(f"Fetching activities for institution {institution_id}")
    get_institution_by_id(db, institution_id)

    try:
        activities_data = activities_repo.find_activities_by_institution_id(db, institution_id)
    except Exception as e:
        logger.error(f"Failed to retrieve activities for institution {institution_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving activities for institution with id {institution_id}: "
                   f"{str(e)}"
        )

    activities = [models.Activity(**activity) for activity in activities_data]

    logger.info(f"Fetched {len(activities)} activities for institution {institution_id}")
    return activities


def get_institution_schedules(db: Database, institution_id: str) -> List[models.Schedule]:
    """Get schedules of an institution"""
    logger.info(f"Fetching schedules for institution {institution_id}")
    get_institution_by_id(db, institution_id)

    try:
        schedules_data = schedules_repo.find_schedules_by_institution_id(db, institution_id)
    except Exception as e:
        logger.error(f"Failed to retrieve schedules for institution {institution_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving schedules for institution with id {institution_id}: {str(e)}"
        )

    schedules = [models.Schedule(**schedule) for schedule in schedules_data]

    logger.info(f"Fetched {len(schedules)} schedules for institution {institution_id}")
    return schedules
