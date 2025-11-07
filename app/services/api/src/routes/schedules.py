from starlette import status
from fastapi import APIRouter

from app.libs.db.db import DB
from app.services.api.src.services import schedules as service

router = APIRouter(prefix="/api/v1/schedules", tags=["schedules"])


@router.post("/", status_code=status.HTTP_200_OK)
async def trigger_schedule_generation():
    """Trigger schedule generation process"""
    return service.trigger_schedule_generation()
