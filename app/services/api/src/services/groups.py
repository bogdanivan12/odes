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


def _ancestor_chain_ids(db: Database, group_id: str) -> List[str]:
    """Return the list of ancestor group IDs of ``group_id`` (parent →
    grandparent → ... → root), excluding ``group_id`` itself.

    Walks ``parent_group_id`` and uses a visited-set so a malformed
    cyclic hierarchy can't hang the request."""
    ancestors: List[str] = []
    visited: set = set()
    row = groups_repo.find_group_by_id(db, group_id)
    current_id = row.get("parent_group_id") if row else None
    while current_id is not None:
        if current_id in visited:
            break   # safety net against pre-existing cycles
        visited.add(current_id)
        ancestors.append(current_id)
        parent_row = groups_repo.find_group_by_id(db, current_id)
        current_id = parent_row.get("parent_group_id") if parent_row else None
    return ancestors


def _would_create_cycle(db: Database, group_id: str, new_parent_id: str) -> bool:
    """
    Return True if making new_parent_id the parent of group_id would introduce
    a cycle in the group hierarchy.

    Strategy: walk the ancestor chain starting from new_parent_id.  If we ever
    reach group_id the proposed edge (group_id → new_parent_id) would close a
    loop.  We also track visited IDs so we terminate safely even if the
    existing data already contains a cycle.
    """
    visited: set = set()
    current_id: str | None = new_parent_id
    while current_id is not None:
        if current_id == group_id:
            return True
        if current_id in visited:
            # Existing cycle in the data — stop to avoid an infinite loop
            break
        visited.add(current_id)
        row = groups_repo.find_group_by_id(db, current_id)
        current_id = row.get("parent_group_id") if row else None
    return False


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
    access_verifiers.raise_group_forbidden(db, current_user_id, group)

    logger.info(f"Fetched group: {group.id}")

    return group


def create_group(db: Database, request: dto_in.CreateGroup, current_user_id: str) -> models.Group:
    """Create a new group"""
    logger.info(f"Creating group {request.name}")
    group = models.Group(**request.model_dump())
    access_verifiers.raise_group_forbidden(db, current_user_id, group, admin_only=True)

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
    access_verifiers.raise_group_forbidden(db, current_user_id, group, admin_only=True)

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
    access_verifiers.raise_group_forbidden(db, current_user_id, group, admin_only=True)

    if request.parent_group_id == group_id:
        logger.error(f"Group {group_id} attempted to set itself as parent")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A group cannot be its own parent."
        )

    updated_data = request.model_dump(exclude_unset=True)

    if "parent_group_id" in updated_data and updated_data["parent_group_id"] is not None:
        new_parent_id = updated_data["parent_group_id"]

        if _would_create_cycle(db, group_id, new_parent_id):
            logger.error(
                f"Setting parent of group {group_id} to {new_parent_id} would create a cycle"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Setting this parent would create a cycle in the group hierarchy."
            )

        parent_group = get_group_by_id(db, new_parent_id, current_user_id)

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


def update_group_timeslot_preferences(
        db: Database,
        group_id: str,
        request: dto_in.UpdateGroupTimeslotPreferences,
        current_user_id: str,
) -> models.Group:
    """Set timeslot preferences for a group (institution admin only)"""
    logger.info(f"Updating timeslot preferences for group {group_id}")
    group = get_group_by_id(db, group_id, current_user_id)
    access_verifiers.raise_group_forbidden(db, current_user_id, group, admin_only=True)

    prefs_data = [p.model_dump() for p in request.preferences]
    try:
        groups_repo.update_group_by_id(db, group_id, {"timeslot_preferences": prefs_data})
    except Exception as e:
        logger.error(f"Failed to update timeslot preferences for group {group_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating timeslot preferences: {str(e)}",
        )

    return get_group_by_id(db, group_id, current_user_id)


def get_group_students(db: Database, group_id: str, current_user_id: str) -> List[models.User]:
    """List the students belonging to a group.

    Access: any member of the group's institution can read this (same
    rule as ``get_group_by_id``).  Filters users by:
      - ``group_ids`` contains this group_id (they're a member), AND
      - ``user_roles[institution_id]`` contains STUDENT (they're a student
        in this institution, not just a prof/admin who happens to have
        the group in their group_ids).
    """
    logger.info(f"Fetching students for group {group_id}")
    group = get_group_by_id(db, group_id, current_user_id)   # access check
    try:
        students_data = users_repo.find_students_by_group_id(
            db, group_id, group.institution_id,
        )
    except Exception as e:
        logger.error(f"Failed to retrieve students for group {group_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving students for group with id {group_id}: {str(e)}"
        )
    students = [models.User(**u) for u in students_data]
    logger.info(f"Fetched {len(students)} students for group {group_id}")
    return students


def add_student_to_group(
        db: Database,
        group_id: str,
        user_id: str,
        current_user_id: str,
) -> models.User:
    """Add a student to a group **and all its ancestor groups** (institution
    admin only).

    Ancestor propagation: enrollment in a descendant group semantically
    implies enrollment in every ancestor (an activity on "Year 1" is
    attended by every section).  We materialise this by adding the user
    to each ancestor's ``group_ids`` here, instead of relying on every
    consumer to walk the hierarchy at read-time.

    Verifies:
      - The caller is an admin of the group's institution.
      - The target user exists and has STUDENT role in the group's
        institution.  Promoting non-students to group membership is
        intentionally rejected — group membership is an academic-
        enrollment concept.
    """
    logger.info(f"Adding user {user_id} to group {group_id}")
    group = get_group_by_id(db, group_id, current_user_id)
    access_verifiers.raise_group_forbidden(db, current_user_id, group, admin_only=True)

    user_data = users_repo.find_user_by_id(db, user_id)
    if not user_data:
        logger.error(f"User not found: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found."
        )
    user = models.User(**user_data)

    if models.UserRole.STUDENT not in user.user_roles.get(group.institution_id, []):
        logger.error(
            f"User {user_id} is not a student in institution {group.institution_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a student in this institution.",
        )

    # Group + ancestor chain.  ``$addToSet`` makes each add idempotent so
    # re-adding an already-member student is a safe no-op.
    target_group_ids = [group_id] + _ancestor_chain_ids(db, group_id)
    try:
        for gid in target_group_ids:
            users_repo.add_group_to_user_by_id(db, user_id, gid)
    except Exception as e:
        logger.error(f"Failed to add group chain to user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error adding user to group: {str(e)}",
        )
    if len(target_group_ids) > 1:
        logger.info(
            f"Propagated membership of user {user_id} to {len(target_group_ids) - 1} "
            f"ancestor group(s) of {group_id}."
        )

    return models.User(**users_repo.find_user_by_id(db, user_id))


def remove_student_from_group(
        db: Database,
        group_id: str,
        user_id: str,
        current_user_id: str,
) -> None:
    """Remove a student from a group (institution admin only).

    Idempotent: removing a non-member is a successful no-op."""
    logger.info(f"Removing user {user_id} from group {group_id}")
    group = get_group_by_id(db, group_id, current_user_id)
    access_verifiers.raise_group_forbidden(db, current_user_id, group, admin_only=True)

    if not users_repo.find_user_by_id(db, user_id):
        logger.error(f"User not found: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found."
        )

    try:
        users_repo.remove_group_from_user_by_id(db, user_id, group_id)
    except Exception as e:
        logger.error(f"Failed to remove group {group_id} from user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error removing user from group: {str(e)}",
        )


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
