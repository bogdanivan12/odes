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


def get_institutions(db: Database, current_user_id: str) -> List[models.Institution]:
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

    current_user = models.User(**users_repo.find_user_by_id(db, current_user_id))

    institutions = [
        models.Institution(**institution)
        for institution in institutions_data
        if institution.id in current_user.user_roles
    ]
    logger.info(f"Fetched {len(institutions)} institutions")

    return institutions


def raise_institution_forbidden(
        db: Database,
        current_user_id: str,
        institution_id: str,
        admin_only: bool = False
) -> None:
    """Raise HTTP 403 Forbidden for institution access"""
    current_user = models.User(**users_repo.find_user_by_id(db, current_user_id))
    if admin_only:
        if models.UserRole.ADMIN not in current_user.user_roles.get(institution_id, []):
            error_message = (
                f"User with id {current_user_id} does not have admin rights"
                f" for institution {institution_id}"
            )
            logger.error(error_message)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_message
            )
    else:
        if institution_id not in current_user.user_roles:
            error_message = (
                f"User with id {current_user_id} has no access to institution {institution_id}"
            )
            logger.error(error_message)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_message
            )


def get_institution_by_id(
        db: Database,
        institution_id: str,
        current_user_id: str
) -> models.Institution:
    """Get institution by ID"""
    logger.info(f"Fetching institution by id: {institution_id}")
    raise_institution_forbidden(db, current_user_id, institution_id)

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


def create_institution(
        db: Database,
        request: dto_in.CreateInstitution,
        current_user_id: str
) -> models.Institution:
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

    current_user = models.User(**users_repo.find_user_by_id(db, current_user_id))
    current_user.user_roles[institution.id] = [models.UserRole.ADMIN]
    try:
        users_repo.update_user_by_id(
            db,
            current_user_id,
            {"user_roles": current_user.user_roles}
        )
    except Exception as e:
        logger.error(f"Failed to assign admin role to user {current_user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error assigning admin role to user with id {current_user_id}: {str(e)}"
        )

    logger.info(f"Created institution {institution.id}")
    return institution


def delete_institution(db: Database, institution_id: str, current_user_id) -> None:
    """Delete an institution by ID"""
    logger.info(f"Deleting institution id={institution_id}")
    raise_institution_forbidden(db, current_user_id, institution_id, admin_only=True)

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
        request: dto_in.UpdateInstitution,
        current_user_id: str
) -> models.Institution:
    """Update an institution by ID"""
    raise_institution_forbidden(db, current_user_id, institution_id, admin_only=True)

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


def get_institution_courses(
        db: Database,
        institution_id: str,
        current_user_id: str
) -> List[models.Course]:
    """Get courses of an institution"""
    raise_institution_forbidden(db, current_user_id, institution_id)

    logger.info(f"Fetching courses for institution {institution_id}")
    get_institution_by_id(db, institution_id, current_user_id)

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


def get_institution_rooms(
        db: Database,
        institution_id: str,
        current_user_id: str
) -> List[models.Room]:
    """Get rooms of an institution"""
    raise_institution_forbidden(db, current_user_id, institution_id)

    logger.info(f"Fetching rooms for institution {institution_id}")
    get_institution_by_id(db, institution_id, current_user_id)

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


def get_institution_groups(
        db: Database,
        institution_id: str,
        current_user_id: str
) -> List[models.Group]:
    """Get groups of an institution"""
    logger.info(f"Fetching groups for institution {institution_id}")
    raise_institution_forbidden(db, current_user_id, institution_id)
    get_institution_by_id(db, institution_id, current_user_id)

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


def get_institution_users(
        db: Database,
        institution_id: str,
        current_user_id: str
) -> List[models.User]:
    """Get users of an institution"""
    logger.info(f"Fetching users for institution {institution_id}")
    raise_institution_forbidden(db, current_user_id, institution_id)
    get_institution_by_id(db, institution_id, current_user_id)

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


def get_institution_activities(
        db: Database,
        institution_id: str,
        current_user_id: str
) -> List[models.Activity]:
    """Get activities of an institution"""
    logger.info(f"Fetching activities for institution {institution_id}")
    raise_institution_forbidden(db, current_user_id, institution_id)
    get_institution_by_id(db, institution_id, current_user_id)

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


def get_institution_schedules(
        db: Database,
        institution_id: str,
        current_user_id: str
) -> List[models.Schedule]:
    """Get schedules of an institution"""
    logger.info(f"Fetching schedules for institution {institution_id}")
    raise_institution_forbidden(db, current_user_id, institution_id)
    get_institution_by_id(db, institution_id, current_user_id)

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


def assign_role_to_user(
        db: Database,
        user_id: str,
        institution_id: str,
        role: models.UserRole,
        current_user_id: str
):
    """Assign a role to a user for a specific institution"""
    logger.info(f"Assigning role {role} to user {user_id} for institution {institution_id}")
    raise_institution_forbidden(db, current_user_id, institution_id, admin_only=True)
    institution = get_institution_by_id(db, institution_id, current_user_id)

    user = users_repo.find_user_by_id(db, user_id)
    if not user:
        logger.error(f"User not found: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found."
        )
    user = models.User(**user)

    user_institution_roles = user.user_roles.get(institution_id, [])

    if role in user_institution_roles:
        logger.error(f"User with id {user_id} already has role {role}"
                       f" for institution {institution_id}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with id {user_id} already has role {role}"
                   f" for institution {institution_id}"
        )

    user_institution_roles.append(role)
    user.user_roles[institution_id] = user_institution_roles

    update_data = {"user_roles": user.user_roles}
    try:
        users_repo.update_user_by_id(db, user_id, update_data)
    except Exception as e:
        logger.error(f"Failed to assign role to user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error assigning role to user with id {user_id}: {str(e)}"
        )

    logger.info(f"Assigned role {role} to user {user_id} for institution {institution_id}")


def remove_role_from_user(
        db: Database,
        user_id: str,
        institution_id: str,
        role: models.UserRole,
        current_user_id: str
):
    """Remove a role from a user for a specific institution"""
    logger.info(f"Removing role {role} from user {user_id} for institution {institution_id}")
    raise_institution_forbidden(db, current_user_id, institution_id, admin_only=True)
    institution = get_institution_by_id(db, institution_id, current_user_id)

    user = users_repo.find_user_by_id(db, user_id)
    if not user:
        logger.error(f"User not found: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found."
        )
    user = models.User(**user)

    user_institution_roles = user.user_roles.get(institution_id, [])

    if role not in user_institution_roles:
        logger.error(f"User with id {user_id} does not have role {role}"
                       f" for institution {institution_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} does not have role {role}"
                   f" for institution {institution_id}"
        )

    user_institution_roles.remove(role)
    if user_institution_roles:
        user.user_roles[institution_id] = user_institution_roles
    else:
        user.user_roles.pop(institution_id)

    update_data = {"user_roles": user.user_roles}
    try:
        users_repo.update_user_by_id(db, user_id, update_data)
    except Exception as e:
        logger.error(f"Failed to remove role from user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error removing role from user with id {user_id}: {str(e)}"
        )

    logger.info(f"Removed role {role} from user {user_id} for institution {institution_id}")


def remove_user_from_institution(
        db: Database,
        user_id: str,
        institution_id: str,
        current_user_id: str
):
    """Remove all roles of a user for a specific institution"""
    logger.info(f"Removing user {user_id} from institution {institution_id}")
    raise_institution_forbidden(db, current_user_id, institution_id, admin_only=True)
    institution = get_institution_by_id(db, institution_id, current_user_id)

    user = users_repo.find_user_by_id(db, user_id)
    if not user:
        logger.error(f"User not found: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found."
        )
    user = models.User(**user)

    if institution_id not in user.user_roles:
        logger.error(f"User with id {user_id} has no roles for institution {institution_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} has no roles for institution {institution_id}"
        )

    user.user_roles.pop(institution_id)

    update_data = {"user_roles": user.user_roles}
    try:
        users_repo.update_user_by_id(db, user_id, update_data)
    except Exception as e:
        logger.error(f"Failed to remove user from institution {institution_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error removing user from institution with id {institution_id}: {str(e)}"
        )

    logger.info(f"Removed user {user_id} from institution {institution_id}")
