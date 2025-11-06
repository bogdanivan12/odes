from starlette import status
from fastapi import APIRouter

from app.libs.db.db import DB
from app.services.api.src.services import activities as service
from app.services.api.src.dtos.input import activity as dto_in
from app.services.api.src.dtos.output import activity as dto_out


router = APIRouter(prefix="/api/v1/activities", tags=["activities"])


@router.get("/",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetAllActivities)
async def get_activities(db: DB):
    """Get all activities"""
    activities = service.get_activities(db)
    return dto_out.GetAllActivities(activities=activities)


@router.get("/{activity_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetActivity)
async def get_activity_by_id(db: DB, activity_id: str):
    """Get activity by ID"""
    activity = service.get_activity_by_id(db, activity_id)
    return dto_out.GetActivity(activity=activity)


@router.post("/",
             status_code=status.HTTP_201_CREATED,
             response_model=dto_out.GetActivity)
async def create_activity(db: DB, request: dto_in.CreateActivity):
    """Create a new activity"""
    activity = service.create_activity(db, request)
    return dto_out.GetActivity(activity=activity)


@router.delete("/{activity_id}",
               status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(db: DB, activity_id: str):
    """Delete an activity by ID"""
    service.delete_activity(db, activity_id)


@router.put("/{activity_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetActivity)
async def update_activity(db: DB, activity_id: str, request: dto_in.UpdateActivity):
    """Update an activity by ID"""
    activity = service.update_activity(db, activity_id, request)
    return dto_out.GetActivity(activity=activity)
