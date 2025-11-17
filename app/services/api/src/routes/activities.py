from starlette import status
from fastapi import APIRouter

from app.libs.db.db import DB
from app.services.api.src.auth import token_utils
from app.services.api.src.auth.token_utils import AUTH
from app.services.api.src.services import activities as service
from app.services.api.src.dtos.input import activity as dto_in
from app.services.api.src.dtos.output import activity as dto_out


router = APIRouter(prefix="/api/v1/activities", tags=["activities"])


@router.get("/",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetAllActivities)
async def get_activities(db: DB, token: AUTH):
    """Get all activities"""
    current_user_id = token_utils.get_user_id_from_token(token)
    activities = service.get_activities(db, current_user_id)
    return dto_out.GetAllActivities(activities=activities)


@router.get("/{activity_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetActivity)
async def get_activity_by_id(db: DB, activity_id: str, token: AUTH):
    """Get activity by ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    activity = service.get_activity_by_id(db, activity_id, current_user_id)
    return dto_out.GetActivity(activity=activity)


@router.post("/",
             status_code=status.HTTP_201_CREATED,
             response_model=dto_out.GetActivity)
async def create_activity(db: DB, request: dto_in.CreateActivity, token: AUTH):
    """Create a new activity"""
    current_user_id = token_utils.get_user_id_from_token(token)
    activity = service.create_activity(db, request, current_user_id)
    return dto_out.GetActivity(activity=activity)


@router.delete("/{activity_id}",
               status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(db: DB, activity_id: str, token: AUTH):
    """Delete an activity by ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    service.delete_activity(db, activity_id, current_user_id)


@router.put("/{activity_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetActivity)
async def update_activity(db: DB, activity_id: str, request: dto_in.UpdateActivity, token: AUTH):
    """Update an activity by ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    activity = service.update_activity(db, activity_id, request, current_user_id)
    return dto_out.GetActivity(activity=activity)
