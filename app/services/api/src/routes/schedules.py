from starlette import status
from fastapi import APIRouter

from app.libs.db.db import DB
from app.libs.auth import token_utils
from app.libs.auth.token_utils import AUTH
from app.services.api.src.services import schedules as service
from app.services.api.src.dtos.input import schedule as dto_in
from app.services.api.src.dtos.output import schedule as dto_out

router = APIRouter(prefix="/api/v1/schedules", tags=["schedules"])


@router.post("/", status_code=status.HTTP_200_OK, response_model=dto_out.GetSchedule)
async def trigger_schedule_generation(db: DB, request: dto_in.CreateSchedule, token: AUTH):
    """Trigger the schedule generation process for a specific institution"""
    current_user_id = token_utils.get_user_id_from_token(token)
    schedule = service.trigger_schedule_generation(db, request, current_user_id, token)
    return dto_out.GetSchedule(schedule=schedule)


@router.get("/", status_code=status.HTTP_200_OK, response_model=dto_out.GetAllSchedules)
async def get_schedules(db: DB, token: AUTH):
    """Get all schedules"""
    current_user_id = token_utils.get_user_id_from_token(token)
    schedules = service.get_schedules(db, current_user_id)
    return dto_out.GetAllSchedules(schedules=schedules)


@router.get("/{schedule_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetSchedule)
async def get_schedule_by_id(db: DB, schedule_id: str, token: AUTH):
    """Get schedule by ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    schedule = service.get_schedule_by_id(db, schedule_id, current_user_id)
    return dto_out.GetSchedule(schedule=schedule)


@router.put("/{schedule_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetSchedule)
async def update_schedule(db: DB, schedule_id: str, request: dto_in.UpdateSchedule, token: AUTH):
    """Update a schedule by ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    schedule = service.update_schedule(db, schedule_id, request, current_user_id)
    return dto_out.GetSchedule(schedule=schedule)


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(db: DB, schedule_id: str, token: AUTH):
    """Delete a schedule by ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    service.delete_schedule(db, schedule_id, current_user_id)


@router.get("/{schedule_id}/scheduled-activities",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetScheduledActivitiesBySchedule)
async def get_scheduled_activities_by_schedule_id(db: DB, schedule_id: str, token: AUTH):
    """Get scheduled activities by schedule ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    scheduled_activities = service.get_scheduled_activities_by_schedule_id(
        db, schedule_id, current_user_id
    )
    return dto_out.GetScheduledActivitiesBySchedule(scheduled_activities=scheduled_activities)
