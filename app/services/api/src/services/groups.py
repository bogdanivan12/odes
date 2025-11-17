from typing import List

from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.libs.logging.logger import get_logger
from app.services.api.src.auth import access_verifiers
from app.services.api.src.dtos.input import group as dto_in
from app.services.api.src.repositories import (
    users as users_repo,
    groups as groups_repo,
    activities as activities_repo
)

logger = get_logger()


def get_groups(db: Database, current_user_id: str) -> List[models.Group]:
    """Get all groups"""
    logger.info("Fetching all groups")
    try:
        groups_data = groups_repo.find_all_groups(db)
    except Exception as e:
        logger.error(f"Failed to retrieve groups: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving groups: {str(e)}"
        )

    user = models.User(**users_repo.find_user_by_id(db, current_user_id))
    groups = [models.Group(**group) for group in groups_data
              if group['institution_id'] in user.user_roles]
    logger.info(f"Fetched {len(groups)} groups")

    return groups


def get_group_by_id(db: Database, group_id: str, current_user_id: str) -> models.Group:
    """Get group by ID"""
    logger.info(f"Fetching group by id: {group_id}")
    try:
        group_data = groups_repo.find_group_by_id(db, group_id)
    except Exception as e:
        logger.error(f"Failed to retrieve group {group_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving group with id {group_id}: {str(e)}"
        )

    if not group_data:
        logger.error(f"Group not found: {group_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Group with id {group_id} not found."
        )

    group = models.Group(**group_data)
    acces_verifiers.raise_group_forbidden(db, current_user_id, group)

    logger.info(f"Fetched group: {group.id}")

    return group


def create_group(db: Database, request: dto_in.CreateGroup, current_user_id: str) -> models.Group:
    """Create a new group"""
    logger.info(f"Creating group {request.name}")
    group = models.Group(**request.model_dump())
    acces_verifiers.raise_group_forbidden(db, current_user_id, group, admin_only=True)

    if group.parent_group_id:
        parent_group = get_group_by_id(db, group.parent_group_id, current_user_id)

        if parent_group.institution_id != group.institution_id:
            logger.error(
                f"Parent group {parent_group.id} not in institution {group.institution_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent group must be from the same institution."
            )

    try:
        groups_repo.insert_group(db, group)
    except Exception as e:
        logger.error(f"Failed to create group: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error creating group: {str(e)}"
        )

    logger.info(f"Created group {group.id}")
    return group


def delete_group(db: Database, group_id: str, current_user_id: str) -> None:
    """Delete a group by ID"""
    logger.info(f"Deleting group {group_id}")

    group = get_group_by_id(db, group_id, current_user_id)
    acces_verifiers.raise_group_forbidden(db, current_user_id, group, admin_only=True)

    try:
        result = groups_repo.delete_group_by_id(db, group_id)
    except Exception as e:
        logger.error(f"Failed to delete group {group_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting group with id {group_id}: {str(e)}"
        )

    try:
        groups_repo.update_groups_by_parent_group_id(db, group_id, {"parent_group_id": None})
    except Exception as e:
        logger.error(f"Failed to update child groups of {group_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating child groups of deleted group with id {group_id}: {str(e)}"
        )

    try:
        activities_repo.delete_activities_by_group_id(db, group_id)
    except Exception as e:
        logger.error(f"Failed to delete activities for group {group_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting activities for group with id {group_id}: {str(e)}"
        )

    if result.deleted_count == 0:
        logger.error(f"Group not found for deletion: {group_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Group with id {group_id} not found."
        )
    logger.info(f"Deleted group {group_id}")


def update_group(
        db: Database,
        group_id: str,
        request: dto_in.UpdateGroup,
        current_user_id: str
) -> models.Group:
    """Update a group by ID"""
    logger.info(f"Updating group {group_id} with data {request.model_dump(exclude_unset=True)}")
    group = get_group_by_id(db, group_id, current_user_id)
    acces_verifiers.raise_group_forbidden(db, current_user_id, group, admin_only=True)

    if request.parent_group_id == group_id:
        logger.error(f"Group {group_id} attempted to set itself as parent")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A group cannot be its own parent."
        )

    updated_data = request.model_dump(exclude_unset=True)

    if "parent_group_id" in updated_data and updated_data["parent_group_id"] is not None:
        parent_group = get_group_by_id(db, updated_data["parent_group_id"], current_user_id)

        if parent_group.institution_id != group.institution_id:
            logger.error(f"Parent group {parent_group.id} not in same institution as {group.id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent group must be from the same institution."
            )

    try:
        result = groups_repo.update_group_by_id(db, group_id, updated_data)
    except Exception as e:
        logger.error(f"Failed to update group {group_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating group with id {group_id}: {str(e)}"
        )

    if result.matched_count == 0:
        logger.error(f"Group not found for update: {group_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Group with id {group_id} not found."
        )

    updated = get_group_by_id(db, group_id, current_user_id)
    logger.info(f"Updated group {updated.id}")
    return updated


def get_group_activities(db: Database, group_id: str, current_user_id: str) -> List[models.Activity]:
    """Get activities for a specific group"""
    logger.info(f"Fetching activities for group {group_id}")
    # Verify group exists
    get_group_by_id(db, group_id, current_user_id)

    try:
        activities_data = activities_repo.find_activities_by_group_id(db, group_id)
    except Exception as e:
        logger.error(f"Failed to retrieve activities for group {group_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving activities for group with id {group_id}: {str(e)}"
        )

    activities = [models.Activity(**activity) for activity in activities_data]
    logger.info(f"Fetched {len(activities)} activities for group {group_id}")

    return activities
