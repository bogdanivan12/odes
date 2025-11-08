from starlette import status
from fastapi import APIRouter

from app.libs.db.db import DB
from app.services.api.src.services import schedules as service
from app.services.api.src.dtos.input import schedule as dto_in
from app.services.api.src.dtos.output import schedule as dto_out

router = APIRouter(prefix="/api/v1/schedules", tags=["schedules"])


@router.post("/", status_code=status.HTTP_200_OK, response_model=dto_out.GetSchedule)
async def trigger_schedule_generation(db: DB, request: dto_in.CreateSchedule):
    """Trigger the schedule generation process for a specific institution"""
    schedule = service.trigger_schedule_generation(db, request)
    return dto_out.GetSchedule(schedule=schedule)


@router.get("/", status_code=status.HTTP_200_OK, response_model=dto_out.GetAllSchedules)
async def get_schedules(db: DB):
    """Get all schedules"""
    schedules = service.get_schedules(db)
    return dto_out.GetAllSchedules(schedules=schedules)


@router.get("/{schedule_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetSchedule)
async def get_schedule_by_id(db: DB, schedule_id: str):
    """Get schedule by ID"""
    schedule = service.get_schedule_by_id(db, schedule_id)
    return dto_out.GetSchedule(schedule=schedule)


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(db: DB, schedule_id: str):
    """Delete a schedule by ID"""
    service.delete_schedule(db, schedule_id)

