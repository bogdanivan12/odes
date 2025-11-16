from typing import List

from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.libs.logging.logger import get_logger
from app.libs.stringproc import stringproc
from app.services.api.src.dtos.input import user as dto_in
from app.services.api.src.repositories import (
    users as users_repo,
    activities as activities_repo,
    institutions as institutions_repo,
    groups as groups_repo
)


logger = get_logger()


def get_users(db: Database) -> List[models.User]:
    """Get all users"""
    logger.info("Fetching all users")
    try:
        users_data = users_repo.find_all_users(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving users: {str(e)}"
        )

    users = [models.User(**user) for user in users_data]
    logger.info(f"Fetched {len(users)} users")

    return users


def get_user_by_id(db: Database, user_id: str) -> models.User:
    """Get user by ID"""
    logger.info(f"Fetching user by id: {user_id}")
    try:
        user_data = users_repo.find_user_by_id(db, user_id)
    except Exception as e:
        logger.error(f"Failed to retrieve user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving user with id {user_id}: {str(e)}"
        )

    if not user_data:
        logger.error(f"User not found: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )

    user = models.User(**user_data)
    logger.info(f"Fetched user: {user.id}")

    return user


def create_user(db: Database, request: dto_in.CreateUser) -> models.User:
    """Create a new user"""
    logger.info(f"Creating user {request.email}")

    user_data = request.model_dump()
    password = user_data.pop("password")
    hashed_password = stringproc.hash_password(password)

    user = models.User(**user_data)
    user.hashed_password = hashed_password

    existing_user = users_repo.find_user_by_email(db, str(user.email))
    if existing_user:
        logger.error(f"User with email {user.email} already exists")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email {user.email} already exists"
        )

    try:
        users_repo.insert_user(db, user)
    except Exception as e:
        logger.error(f"Failed to create user: {user.email}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error creating user: {str(e)}"
        )

    logger.info(f"Created user {user.id}")
    return user


def delete_user(db: Database, user_id: str) -> None:
    """Delete an user by ID"""
    logger.info(f"Deleting user {user_id}")
    try:
        result = users_repo.delete_user_by_id(db, user_id)
    except Exception as e:
        logger.error(f"Failed to delete user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting user with id {user_id}: {str(e)}"
        )

    prof_activities = activities_repo.find_activities_by_professor_id(db, user_id)
    logger.info(f"Deleting {len(prof_activities)} activities for user {user_id}")
    try:
        for activity in prof_activities:
            activities_repo.update_activity_by_id(db, activity["_id"], {"professor_id": None})
    except Exception as e:
        logger.error(f"Failed to delete activities for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting related data for user with id {user_id}: {str(e)}"
        )

    if result.deleted_count == 0:
        logger.error(f"User not found for deletion: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )


def update_user(db: Database, user_id: str, request: dto_in.UpdateUser) -> models.User:
    """Update an existing user"""
    update_data = request.model_dump(exclude_unset=True)
    logger.info(f"Updating user {user_id} with data {update_data}")

    if "password" in update_data:
        password = update_data.pop("password")
        hashed_password = stringproc.hash_password(password)
        update_data["hashed_password"] = hashed_password

    existing_user = users_repo.find_user_by_email(db, update_data.get("email"))
    if existing_user and existing_user["_id"] != user_id:
        logger.error(f"User with email {request.email} already exists")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email {request.email} already exists"
        )

    if "user_roles" in update_data and update_data.get("user_roles") is not None:
        all_institution_ids = [
            institution["_id"] for institution in institutions_repo.find_all_institutions(db)
        ]

        for institution_id in update_data["user_roles"]:
            if institution_id not in all_institution_ids:
                logger.error(f"Institution with id {institution_id} does not exist")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Institution with id {institution_id} does not exist"
                )

    if "group_ids" in update_data and update_data.get("group_ids") is not None:
        user_institution_groups = []
        for institution_id in update_data["user_roles"]:
            user_institution_groups.extend(
                [group["_id"]
                 for group in groups_repo.find_groups_by_institution_id(db, institution_id)]
            )

        for group_id in update_data["group_ids"]:
            group_data = groups_repo.find_group_by_id(db, group_id)
            if not group_data:
                logger.error(f"Group not found for update: {group_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Group with id {group_id} not found"
                )

            if group_id not in user_institution_groups:
                logger.error(f"Group with id {group_id} does not belong to any institution")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Group with id {group_id} does not belong to any institution"
                )

    try:
        result = users_repo.update_user_by_id(db, user_id, update_data)
    except Exception as e:
        logger.error(f"Failed to update user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating user with id {user_id}: {str(e)}"
        )

    if result.matched_count == 0:
        logger.error(f"User not found for update: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )

    return get_user_by_id(db, user_id)


def get_professor_activities(db: Database, professor_id: str) -> List[models.Activity]:
    """Get all activities for a specific professor"""
    logger.info(f"Fetching activities for professor {professor_id}")
    user = get_user_by_id(db, professor_id)

    if not any(models.UserRole.PROFESSOR in user_roles for user_roles in user.user_roles.values()):
        logger.error(f"User with id {professor_id} is not a professor")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with id {professor_id} is not a professor"
        )

    try:
        activities_data = activities_repo.find_activities_by_professor_id(db, professor_id)
    except Exception as e:
        logger.error(f"Failed to retrieve activities for professor {professor_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving activities for professor with id {professor_id}: {str(e)}"
        )

    activities = [models.Activity(**activity) for activity in activities_data]

    logger.info(f"Fetched {len(activities)} activities for professor {professor_id}")
    return activities
