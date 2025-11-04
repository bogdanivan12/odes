from starlette import status
from fastapi import APIRouter

from app.libs.db.db import DB
from app.libs.db import models
from app.services.api.src.services import users as service
from app.services.api.src.dtos.input import user as dto_in
from app.services.api.src.dtos.output import user as dto_out

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("/",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetAllUsers)
async def get_users(db: DB):
    """Get all users"""
    users = service.get_users(db)
    return dto_out.GetAllUsers(users=users)


@router.get("/{user_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetUser)
async def get_user_by_id(db: DB, user_id: str):
    """Get user by ID"""
    user = service.get_user_by_id(db, user_id)
    return dto_out.GetUser(user=user)


@router.post("/",
             status_code=status.HTTP_201_CREATED,
             response_model=dto_out.GetUser)
async def create_user(db: DB, request: dto_in.CreateUser):
    """Create a new user"""
    user = service.create_user(db, request)
    return dto_out.GetUser(user=user)


@router.put("/{user_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetUser)
async def update_user(db: DB, user_id: str, request: dto_in.UpdateUser):
    """Update an existing user"""
    user = service.update_user(db, user_id, request)
    return dto_out.GetUser(user=user)


@router.delete("/{user_id}",
               status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(db: DB, user_id: str):
    """Delete an user by ID"""
    service.delete_user(db, user_id)


@router.post("/{user_id}/institutions/{institution_id}/roles/{role}",
             status_code=status.HTTP_204_NO_CONTENT)
async def assign_role_to_user(db: DB, user_id: str, institution_id: str, role: models.UserRole):
    """Assign a role to a user for a specific institution"""
    service.assign_role_to_user(db, user_id, institution_id, role)


@router.delete("/{user_id}/institutions/{institution_id}/roles/{role}",
               status_code=status.HTTP_204_NO_CONTENT)
async def remove_role_from_user(db: DB, user_id: str, institution_id: str, role: models.UserRole):
    """Remove a role from a user for a specific institution"""
    service.remove_role_from_user(db, user_id, institution_id, role)


@router.delete("/{user_id}/institutions/{institution_id}/",
               status_code=status.HTTP_204_NO_CONTENT)
async def remove_user_from_institution(db: DB, user_id: str, institution_id: str):
    """Remove all roles from a user for a specific institution"""
    service.remove_user_from_institution(db, user_id, institution_id)
