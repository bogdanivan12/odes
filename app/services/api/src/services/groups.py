from typing import List

from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.services.api.src.dtos.input import group as dto_in
from app.services.api.src.repositories import (
    groups as groups_repo,
    activities as activities_repo
)


def get_groups(db: Database) -> List[models.Group]:
    """
    Get all groups

    Args:
        db: Database dependency

    Returns:
        GetAllGroups: List of groups

    Raises:
        HTTPException: If there is an error retrieving groups
    """
    try:
        groups_data = groups_repo.find_all_groups(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving groups: {str(e)}"
        )

    groups = [models.Group(**group) for group in groups_data]

    return groups


def get_group_by_id(db: Database, group_id: str) -> models.Group:
    """
    Get group by ID

    Args:
        db: Database dependency
        group_id: ID of the group

    Returns:
        GetGroupById: Group data

    Raises:
        HTTPException: If there is an error retrieving the group or if not found
    """
    try:
        group_data = groups_repo.find_group_by_id(db, group_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving group with id {group_id}: {str(e)}"
        )

    if not group_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Group with id {group_id} not found."
        )

    group = models.Group(**group_data)

    return group


def create_group(db: Database, request: dto_in.CreateGroup) -> models.Group:
    """
    Create a new group

    Args:
        db: Database dependency
        request: CreateGroup DTO

    Returns:
        GetGroupById: Created group data

    Raises:
        HTTPException: If there is an error creating the group
    """
    group = models.Group(**request.model_dump())

    if group.parent_group_id:
        get_group_by_id(db, group.parent_group_id)

    try:
        groups_repo.insert_group(db, group)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error creating group: {str(e)}"
        )

    return group


def delete_group(db: Database, group_id: str) -> None:
    """
    Delete a group by ID

    Args:
        db: Database dependency
        group_id: ID of the group to delete

    Raises:
        HTTPException: If there is an error deleting the group or if not found
    """
    try:
        result = groups_repo.delete_group_by_id(db, group_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting group with id {group_id}: {str(e)}"
        )

    try:
        groups_repo.update_groups_by_parent_group_id(db, group_id, {"parent_group_id": None})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating child groups of deleted group with id {group_id}: {str(e)}"
        )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Group with id {group_id} not found."
        )


def update_group(db: Database, group_id: str, request: dto_in.UpdateGroup) -> models.Group:
    """
    Update a group by ID

    Args:
        db: Database dependency
        group_id: ID of the group to update
        request: UpdateGroup DTO

    Returns:
        GetGroupById: Updated group data

    Raises:
        HTTPException: If there is an error updating the group or if not found
    """
    if request.parent_group_id == group_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A group cannot be its own parent."
        )

    updated_data = request.model_dump(exclude_unset=True)

    if "parent_group_id" in updated_data and updated_data["parent_group_id"] is not None:
        get_group_by_id(db, updated_data["parent_group_id"])

    try:
        result = groups_repo.update_group_by_id(db, group_id, updated_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating group with id {group_id}: {str(e)}"
        )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Group with id {group_id} not found."
        )

    return get_group_by_id(db, group_id)


def get_group_activities(db: Database, group_id: str) -> List[models.Activity]:
    """
    Get activities for a specific group

    Args:
        db: Database dependency
        group_id: ID of the group

    Returns:
        List[Activity]: List of activities for the group

    Raises:
        HTTPException: If there is an error retrieving activities or if group not found
    """
    # Verify group exists
    get_group_by_id(db, group_id)

    try:
        activities_data = activities_repo.find_activities_by_group_id(db, group_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving activities for group with id {group_id}: {str(e)}"
        )

    activities = [models.Activity(**activity) for activity in activities_data]

    return activities
