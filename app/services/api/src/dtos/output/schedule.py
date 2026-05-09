from typing import List, Literal

from pydantic import BaseModel

from app.libs.db import models


class GetAllSchedules(BaseModel):
    """DTO for retrieving all schedules"""
    schedules: List[models.Schedule]


class GetSchedule(BaseModel):
    """DTO for retrieving a schedule"""
    schedule: models.Schedule


class GetScheduledActivitiesBySchedule(BaseModel):
    """DTO for retrieving scheduled_activities by schedule"""
    scheduled_activities: List[models.ScheduledActivity]


# ── Conflict check response ───────────────────────────────────────────────────

class ConflictItem(BaseModel):
    type: Literal["room", "professor", "group"]
    conflicting_record_id: str
    description: str


class RecordConflicts(BaseModel):
    record_id: str
    conflicts: List[ConflictItem]


class CheckConflictsResponse(BaseModel):
    results: List[RecordConflicts]  # only records that have at least one conflict
