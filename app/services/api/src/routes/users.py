from starlette import status
from fastapi import APIRouter

from app.libs.db.db import DB
from app.libs.auth import token_utils
from app.libs.auth.token_utils import AUTH
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


@router.get("/me", status_code=status.HTTP_200_OK, response_model=dto_out.GetUser)
async def get_current_user(db: DB, token: AUTH):
    """Get the currently authenticated user"""
    current_user_id = token_utils.get_user_id_from_token(token)
    user = service.get_user_by_id(db, current_user_id)
    return dto_out.GetUser(user=user)


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


@router.put("/me",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetUser)
async def update_user(db: DB, token: AUTH, request: dto_in.UpdateUser):
    """Update current user"""
    current_user_id = token_utils.get_user_id_from_token(token)
    user = service.update_user(db, current_user_id, request)
    return dto_out.GetUser(user=user)


@router.delete("/me",
               status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(db: DB, token: AUTH):
    """Delete current user"""
    current_user_id = token_utils.get_user_id_from_token(token)
    service.delete_user(db, current_user_id)


@router.get("/{professor_id}/activities",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetProfessorActivities)
async def get_professor_activities(db: DB, professor_id: str):
    """Get all activities for a professor"""
    activities = service.get_professor_activities(db, professor_id)
    return dto_out.GetProfessorActivities(activities=activities)
