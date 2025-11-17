from starlette import status
from fastapi import APIRouter

from app.libs.db.db import DB
from app.services.api.src.auth import token_utils
from app.services.api.src.auth.token_utils import AUTH
from app.services.api.src.services import scheduled_activities as service
from app.services.api.src.dtos.input import scheduled_activity as dto_in
from app.services.api.src.dtos.output import scheduled_activity as dto_out


router = APIRouter(prefix="/api/v1/scheduled_activities", tags=["scheduled_activities"])


@router.get("/",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetAllScheduledActivities)
async def get_scheduled_activities(db: DB, token: AUTH):
    """Get all scheduled_activities"""
    current_user_id = token_utils.get_user_id_from_token(token)
    scheduled_activities = service.get_scheduled_activities(db, current_user_id)
    return dto_out.GetAllScheduledActivities(scheduled_activities=scheduled_activities)


@router.get("/{scheduled_activity_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetScheduledActivity)
async def get_scheduled_activity_by_id(db: DB, scheduled_activity_id: str, token: AUTH):
    """Get scheduled_activity by ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    scheduled_activity = service.get_scheduled_activity_by_id(
        db, scheduled_activity_id, current_user_id
    )
    return dto_out.GetScheduledActivity(scheduled_activity=scheduled_activity)


@router.post("/",
             status_code=status.HTTP_201_CREATED,
             response_model=dto_out.GetScheduledActivity)
async def create_scheduled_activity(db: DB, request: dto_in.CreateScheduledActivity, token: AUTH):
    """Create a new scheduled_activity"""
    current_user_id = token_utils.get_user_id_from_token(token)
    scheduled_activity = service.create_scheduled_activity(db, request, current_user_id)
    return dto_out.GetScheduledActivity(scheduled_activity=scheduled_activity)


@router.delete("/{scheduled_activity_id}",
               status_code=status.HTTP_204_NO_CONTENT)
async def delete_scheduled_activity(db: DB, scheduled_activity_id: str, token: AUTH):
    """Delete a scheduled_activity by ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    service.delete_scheduled_activity(db, scheduled_activity_id, current_user_id)


@router.put("/{scheduled_activity_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetScheduledActivity)
async def update_scheduled_activity(
        db: DB,
        scheduled_activity_id: str,
        request: dto_in.UpdateScheduledActivity,
        token: AUTH
):
    """Update a scheduled_activity by ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    scheduled_activity = service.update_scheduled_activity(
        db, scheduled_activity_id, request, current_user_id
    )
    return dto_out.GetScheduledActivity(scheduled_activity=scheduled_activity)


@router.post("/bulk", status_code=status.HTTP_201_CREATED)
async def insert_scheduled_activities_bulk(
    db: DB,
    request: dto_in.InsertManyScheduledActivities,
    token: AUTH
):
    """Create scheduled_activities in bulk"""
    current_user_id = token_utils.get_user_id_from_token(token)
    service.insert_scheduled_activities_bulk(db, request, current_user_id)
