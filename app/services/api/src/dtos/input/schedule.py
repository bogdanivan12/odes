from typing import List, Optional

from pydantic import BaseModel

from app.libs.db import models


class CreateSchedule(BaseModel):
    """DTO for creating a schedule"""
    institution_id: str


class UpdateSchedule(BaseModel):
    """DTO for updating a schedule"""
    status: Optional[models.ScheduleStatus] = None
    error_message: Optional[str] = None


# ── Schedule editing ─────────────────────────────────────────────────────────

class ScheduleChangeItem(BaseModel):
    """A single proposed change to a scheduled activity record."""
    record_id: str          # _id of the ScheduledActivity document
    new_start_timeslot: int
    new_room_id: str


class CheckConflictsRequest(BaseModel):
    """All pending changes to check for conflicts before saving."""
    changes: List[ScheduleChangeItem]


class BatchUpdateRecordsRequest(BaseModel):
    """Apply a batch of changes in-place. force=True skips the conflict gate."""
    changes: List[ScheduleChangeItem]
    force: bool = False
