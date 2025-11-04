from typing import List

from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.libs.stringproc import stringproc
from app.services.api.src.dtos.input import user as dto_in
from app.services.api.src.repositories import users as users_repo


def get_users(db: Database) -> List[models.User]:
    """Get all users"""
    try:
        users_data = users_repo.find_all_users(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving users: {str(e)}"
        )

    users = [models.User(**user) for user in users_data]

    return users


def get_user_by_id(db: Database, user_id: str) -> models.User:
    """Get user by ID"""
    try:
        user_data = users_repo.find_user_by_id(db, user_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving user with id {user_id}: {str(e)}"
        )

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )

    user = models.User(**user_data)

    return user


def create_user(db: Database, request: dto_in.CreateUser) -> models.User:
    """Create a new user"""
    user_data = request.model_dump()

    password = user_data.pop("password")
    hashed_password = stringproc.hash_password(password)

    user = models.User(**request.model_dump(), hashed_password=hashed_password)

    existing_user = users_repo.find_user_by_email(db, user.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email {user.email} already exists"
        )

    try:
        users_repo.insert_user(db, user)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error creating user: {str(e)}"
        )

    return user


def delete_user(db: Database, user_id: str) -> None:
    """Delete an user by ID"""
    try:
        result = users_repo.delete_user_by_id(db, user_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting user with id {user_id}: {str(e)}"
        )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )


def update_user(db: Database, user_id: str, request: dto_in.UpdateUser) -> models.User:
    """Update an existing user"""
    update_data = request.model_dump(exclude_unset=True)

    if "password" in update_data:
        password = update_data.pop("password")
        hashed_password = stringproc.hash_password(password)
        update_data["hashed_password"] = hashed_password

    existing_user = users_repo.find_user_by_email(db, update_data.get("email"))
    if existing_user and existing_user["_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email {request.email} already exists"
        )

    try:
        result = users_repo.update_user_by_id(db, user_id, update_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating user with id {user_id}: {str(e)}"
        )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )

    return get_user_by_id(db, user_id)


def assign_role_to_user(db: Database, user_id: str, institution_id: str, role: models.UserRole):
    """Assign a role to a user for a specific institution"""
    user = get_user_by_id(db, user_id)

    user_institution_roles = user.user_roles.get(institution_id, [])

    if role in user_institution_roles:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with id {user_id} already has role {role} for institution {institution_id}"
        )

    user_institution_roles.append(role)
    user.user_roles[institution_id] = user_institution_roles

    update_data = {"user_roles": user.user_roles}
    try:
        users_repo.update_user_by_id(db, user_id, update_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error assigning role to user with id {user_id}: {str(e)}"
        )


def remove_role_from_user(db: Database, user_id: str, institution_id: str, role: models.UserRole):
    """Remove a role from a user for a specific institution"""
    user = get_user_by_id(db, user_id)

    user_institution_roles = user.user_roles.get(institution_id, [])

    if role not in user_institution_roles:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} does not have role {role} for institution {institution_id}"
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
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error removing role from user with id {user_id}: {str(e)}"
        )


def remove_user_from_institution(db: Database, user_id: str, institution_id: str):
    """Remove all roles of a user for a specific institution"""
    user = get_user_by_id(db, user_id)

    if institution_id not in user.user_roles:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} has no roles for institution {institution_id}"
        )

    user.user_roles.pop(institution_id)

    update_data = {"user_roles": user.user_roles}
    try:
        users_repo.update_user_by_id(db, user_id, update_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error removing user from institution with id {institution_id}: {str(e)}"
        )
