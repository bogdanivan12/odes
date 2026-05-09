import os
from typing import Dict, List, Set

from celery import Celery
from starlette import status
from fastapi import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.libs.logging.logger import get_logger
from app.services.api.src.auth import access_verifiers
from app.services.api.src.repositories import (
    activities as activities_repo,
    groups as groups_repo,
    institutions as institutions_repo,
    schedules as schedules_repo,
    scheduled_activities as scheduled_activities_repo,
    users as users_repo,
)
from app.services.api.src.dtos.input import schedule as dto_in
from app.services.api.src.dtos.output import schedule as dto_out


CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL")
celery_client = Celery("api", broker=CELERY_BROKER_URL)

logger = get_logger()


def trigger_schedule_generation(
        db: Database,
        request: dto_in.CreateSchedule,
        current_user_id: str,
        token: str
) -> models.Schedule:
    """Trigger schedule generation process"""
    institution_id = request.institution_id
    institution_data = institutions_repo.find_institution_by_id(db, institution_id)

    if not institution_data:
        logger.error(f"Institution not found: {institution_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {institution_id} not found."
        )

    institution = models.Institution(**institution_data)

    logger.info(f"Fetching activities for institution {institution_id}")
    activities = activities_repo.find_activities_by_institution_id(db, institution_id)

    if not activities:
        logger.error(f"No activities found for institution {institution_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No activities found for institution with id {institution_id}."
        )

    logger.info(f"Found {len(activities)} activities for institution {institution_id}")

    schedule = models.Schedule(
        institution_id=institution.id,
        time_grid_config=institution.time_grid_config,
    )

    # Check authorization - user must be admin of the institution
    access_verifiers.raise_schedule_forbidden(db, current_user_id, schedule, admin_only=True)

    try:
        schedules_repo.insert_schedule(db, schedule)
    except Exception as e:
        logger.error(f"Failed to insert schedule: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error inserting schedule: {str(e)}"
        )

    logger.info(f"Triggering schedule generation process for institution {institution_id}")

    celery_client.send_task(
        task_id=schedule.id,
        name="generate_schedule",
        kwargs={
            "institution_id": institution_id,
            "schedule_id": schedule.id,
            "token": token
        },
        queue="schedule_generator_queue"
    )

    logger.info(f"Schedule generation process triggered for institution {institution_id}:"
                f" id = {schedule.id}")

    return schedule


def get_schedules(db: Database, current_user_id: str) -> List[models.Schedule]:
    """Get all schedules"""
    logger.info("Fetching all schedules")
    try:
        schedules_data = schedules_repo.find_all_schedules(db)
    except Exception as e:
        logger.error(f"Failed to retrieve schedules: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving schedules: {str(e)}"
        )

    user = models.User(**users_repo.find_user_by_id(db, current_user_id))
    schedules = [models.Schedule(**schedule) for schedule in schedules_data
                 if schedule['institution_id'] in user.user_roles]
    logger.info(f"Fetched {len(schedules)} schedules")

    return schedules


def get_schedule_by_id(db: Database, schedule_id: str, current_user_id: str) -> models.Schedule:
    """Get schedule by ID"""
    logger.info(f"Fetching schedule by id: {schedule_id}")
    try:
        schedule_data = schedules_repo.find_schedule_by_id(db, schedule_id)
    except Exception as e:
        logger.error(f"Failed to retrieve schedule {schedule_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving schedule with id {schedule_id}: {str(e)}"
        )

    if not schedule_data:
        logger.error(f"Schedule not found: {schedule_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule with id {schedule_id} not found."
        )

    schedule = models.Schedule(**schedule_data)
    access_verifiers.raise_schedule_forbidden(db, current_user_id, schedule)

    logger.info(f"Fetched schedule: {schedule.id}")

    return schedule


def delete_schedule(db: Database, schedule_id: str, current_user_id: str) -> None:
    """Delete a schedule by ID"""
    logger.info(f"Deleting schedule id={schedule_id}")

    schedule = get_schedule_by_id(db, schedule_id, current_user_id)
    access_verifiers.raise_schedule_forbidden(db, current_user_id, schedule, admin_only=True)

    try:
        result = schedules_repo.delete_schedule_by_id(db, schedule_id)
    except Exception as e:
        logger.error(f"Failed to delete schedule {schedule_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting schedule with id {schedule_id}: {str(e)}"
        )

    if result.deleted_count == 0:
        logger.error(f"Schedule not found for deletion: {schedule_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule with id {schedule_id} not found."
        )
    logger.info(f"Deleted schedule {schedule_id}")


def get_scheduled_activities_by_schedule_id(
        db: Database,
        schedule_id: str,
        current_user_id: str
) -> List[models.ScheduledActivity]:
    """Get scheduled activities by schedule ID"""
    logger.info(f"Fetching scheduled activities for schedule id: {schedule_id}")

    # Verify schedule exists and user has access
    get_schedule_by_id(db, schedule_id, current_user_id)

    try:
        scheduled_activities_data = (
            scheduled_activities_repo.find_scheduled_activities_by_schedule_id(db, schedule_id)
        )
    except Exception as e:
        logger.error(f"Failed to retrieve scheduled activities for schedule {schedule_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving scheduled activities for schedule id {schedule_id}: {str(e)}"
        )

    scheduled_activities = [
        models.ScheduledActivity(**scheduled_activity)
        for scheduled_activity in scheduled_activities_data
    ]
    logger.info(f"Fetched {len(scheduled_activities)} scheduled activities for schedule id: "
                f"{schedule_id}")

    return scheduled_activities


def update_schedule(
        db: Database,
        schedule_id: str,
        request: dto_in.UpdateSchedule,
        current_user_id: str
) -> models.Schedule:
    """Update a schedule by ID"""
    logger.info(f"Updating schedule id={schedule_id}")

    schedule = get_schedule_by_id(db, schedule_id, current_user_id)
    access_verifiers.raise_schedule_forbidden(db, current_user_id, schedule, admin_only=True)

    update_data = request.model_dump(exclude_unset=True)

    try:
        result = schedules_repo.update_schedule_by_id(db, schedule_id, update_data)
    except Exception as e:
        logger.error(f"Failed to update schedule {schedule_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating schedule with id {schedule_id}: {str(e)}"
        )

    if result.matched_count == 0:
        logger.error(f"Schedule not found for update: {schedule_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule with id {schedule_id} not found."
        )

    updated_schedule = get_schedule_by_id(db, schedule_id, current_user_id)
    logger.info(f"Updated schedule id={schedule_id}")

    return updated_schedule


# ── Schedule editing helpers ──────────────────────────────────────────────────

def _build_ancestor_set(group_id: str, groups_map: Dict[str, models.Group]) -> Set[str]:
    """Return the set of all ancestor group IDs for a given group (not including itself)."""
    ancestors: Set[str] = set()
    visited: Set[str] = set()
    current_id = group_id
    while True:
        g = groups_map.get(current_id)
        if not g or not g.parent_group_id or g.parent_group_id in visited:
            break
        ancestors.add(g.parent_group_id)
        visited.add(current_id)
        current_id = g.parent_group_id
    return ancestors


def _get_effective_weeks(
    rec: dict,
    activity: models.Activity,
    total_weeks: int,
) -> Set[int]:
    """Return the set of 0-indexed week numbers during which a record is active."""
    if activity.frequency == models.Frequency.WEEKLY:
        return set(range(total_weeks))
    return set(rec["active_weeks"])


def _timeslots_overlap(
    rec_a: dict,
    act_a: models.Activity,
    rec_b: dict,
    act_b: models.Activity,
    tpd: int,
) -> bool:
    """Return True if rec_a and rec_b occupy overlapping timeslots on the same day."""
    day_a = rec_a["start_timeslot"] // tpd
    day_b = rec_b["start_timeslot"] // tpd
    if day_a != day_b:
        return False
    slot_a = rec_a["start_timeslot"] % tpd
    slot_b = rec_b["start_timeslot"] % tpd
    end_a = slot_a + act_a.duration_slots
    end_b = slot_b + act_b.duration_slots
    return slot_a < end_b and slot_b < end_a


# ── Public service functions ──────────────────────────────────────────────────

def _run_conflict_check(
    db: Database,
    schedule: models.Schedule,
    changes: List[dto_in.ScheduleChangeItem],
) -> List[dto_out.RecordConflicts]:
    """
    Core conflict-detection logic (no auth — callers must have already verified access).

    Applies all proposed changes as overrides on top of the current schedule state,
    then checks every changed record against every other record for:
      • room double-booking
      • professor double-booking
      • group overlap (including ancestor/descendant groups)

    Only NEW conflicts are returned — conflicts that already existed between the same
    pair of records in the original schedule are silently skipped.  This means moving
    an activity away from a slot it was already sharing with another activity is never
    flagged, and all pending moves are evaluated simultaneously so that swapping two
    activities never produces a spurious self-conflict.
    """
    schedule_id = schedule.id
    tpd = schedule.time_grid_config.timeslots_per_day
    total_weeks = schedule.time_grid_config.weeks
    institution_id = schedule.institution_id

    changes_map: Dict[str, dto_in.ScheduleChangeItem] = {c.record_id: c for c in changes}
    changed_ids: Set[str] = set(changes_map.keys())

    # Load raw records once; build both the original state and the effective state.
    raw_records = scheduled_activities_repo.find_scheduled_activities_by_schedule_id(db, schedule_id)
    original_map: Dict[str, dict] = {}   # rec_id → record at original position
    effective: List[dict] = []           # all records at their post-change positions

    for raw in raw_records:
        rec_id = str(raw["_id"])
        orig = {
            "id": rec_id,
            "activity_id": str(raw["activity_id"]),
            "room_id": str(raw.get("room_id", "")),
            "start_timeslot": raw["start_timeslot"],
            "active_weeks": raw.get("active_weeks", []),
        }
        original_map[rec_id] = orig

        if rec_id in changes_map:
            c = changes_map[rec_id]
            effective.append({
                "id": rec_id,
                "activity_id": str(raw["activity_id"]),
                "room_id": c.new_room_id,
                "start_timeslot": c.new_start_timeslot,
                "active_weeks": raw.get("active_weeks", []),
            })
        else:
            effective.append(dict(orig))

    # Load activities (one fetch per unique activity_id)
    unique_act_ids = list({r["activity_id"] for r in effective})
    activities_map: Dict[str, models.Activity] = {}
    for act_id in unique_act_ids:
        raw_act = activities_repo.find_activity_by_id(db, act_id)
        if raw_act:
            act = models.Activity(**raw_act)
            activities_map[act.id] = act

    # Load groups for ancestor computation
    raw_groups = groups_repo.find_groups_by_institution_id(db, institution_id)
    groups_map: Dict[str, models.Group] = {}
    for raw_g in raw_groups:
        g = models.Group(**raw_g)
        groups_map[g.id] = g

    ancestor_cache: Dict[str, Set[str]] = {}
    for act in activities_map.values():
        if act.group_id and act.group_id not in ancestor_cache:
            ancestor_cache[act.group_id] = _build_ancestor_set(act.group_id, groups_map)

    conflicts_by_record: Dict[str, List[dto_out.ConflictItem]] = {}

    for rec_a in effective:
        if rec_a["id"] not in changed_ids:
            continue
        act_a = activities_map.get(rec_a["activity_id"])
        if not act_a:
            continue
        weeks_a = _get_effective_weeks(rec_a, act_a, total_weeks)
        anc_a = ancestor_cache.get(act_a.group_id, set())
        orig_a = original_map[rec_a["id"]]

        for rec_b in effective:
            if rec_a["id"] == rec_b["id"]:
                continue
            act_b = activities_map.get(rec_b["activity_id"])
            if not act_b:
                continue

            weeks_b = _get_effective_weeks(rec_b, act_b, total_weeks)
            if not (weeks_a & weeks_b):
                continue

            if not _timeslots_overlap(rec_a, act_a, rec_b, act_b, tpd):
                continue

            # Determine whether this pair already conflicted in the original schedule.
            # A conflict is pre-existing when both records overlapped at their original
            # positions — if so, the current move did not introduce it and we skip it.
            orig_b = original_map.get(rec_b["id"])
            orig_weeks_a = _get_effective_weeks(orig_a, act_a, total_weeks)
            orig_weeks_b = _get_effective_weeks(orig_b, act_b, total_weeks) if orig_b else set()
            originally_overlapping = (
                orig_b is not None
                and bool(orig_weeks_a & orig_weeks_b)
                and _timeslots_overlap(orig_a, act_a, orig_b, act_b, tpd)
            )

            anc_b = ancestor_cache.get(act_b.group_id, set())
            rec_conflicts = conflicts_by_record.setdefault(rec_a["id"], [])

            # Room double-booking
            if rec_a["room_id"] and rec_b["room_id"] and rec_a["room_id"] == rec_b["room_id"]:
                was_room_conflict = originally_overlapping and orig_b and orig_a["room_id"] == orig_b["room_id"]
                if not was_room_conflict:
                    rec_conflicts.append(dto_out.ConflictItem(
                        type="room",
                        conflicting_record_id=rec_b["id"],
                        description="Room is already occupied at this timeslot.",
                    ))

            # Professor double-booking
            if (act_a.professor_id and act_b.professor_id
                    and act_a.professor_id == act_b.professor_id):
                was_prof_conflict = originally_overlapping
                if not was_prof_conflict:
                    rec_conflicts.append(dto_out.ConflictItem(
                        type="professor",
                        conflicting_record_id=rec_b["id"],
                        description="Professor is already assigned to another activity at this timeslot.",
                    ))

            # Group overlap (same group or ancestor–descendant relationship)
            if act_a.group_id and act_b.group_id:
                groups_clash = (
                    act_a.group_id == act_b.group_id
                    or act_b.group_id in anc_a
                    or act_a.group_id in anc_b
                )
                if groups_clash:
                    was_group_conflict = originally_overlapping and (
                        act_a.group_id == act_b.group_id
                        or act_b.group_id in anc_a
                        or act_a.group_id in anc_b
                    )
                    if not was_group_conflict:
                        rec_conflicts.append(dto_out.ConflictItem(
                            type="group",
                            conflicting_record_id=rec_b["id"],
                            description="Group already has another activity at this timeslot.",
                        ))

    return [
        dto_out.RecordConflicts(record_id=rid, conflicts=items)
        for rid, items in conflicts_by_record.items()
        if items
    ]


def check_conflicts(
    db: Database,
    schedule_id: str,
    request: dto_in.CheckConflictsRequest,
    current_user_id: str,
) -> dto_out.CheckConflictsResponse:
    """Check what conflicts a batch of proposed moves would introduce."""
    schedule = get_schedule_by_id(db, schedule_id, current_user_id)
    access_verifiers.raise_schedule_forbidden(db, current_user_id, schedule, admin_only=True)
    results = _run_conflict_check(db, schedule, request.changes)
    return dto_out.CheckConflictsResponse(results=results)


def batch_update_records(
    db: Database,
    schedule_id: str,
    request: dto_in.BatchUpdateRecordsRequest,
    current_user_id: str,
) -> List[models.ScheduledActivity]:
    """
    Apply a batch of timeslot/room changes in-place.

    If force=False and conflicts exist, raises HTTP 409 with the conflict list.
    If force=True, saves unconditionally.
    """
    schedule = get_schedule_by_id(db, schedule_id, current_user_id)
    access_verifiers.raise_schedule_forbidden(db, current_user_id, schedule, admin_only=True)

    if not request.force:
        conflicts = _run_conflict_check(db, schedule, request.changes)
        if conflicts:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": "Schedule conflicts detected. Use force=true to save anyway.",
                    "results": [c.model_dump() for c in conflicts],
                },
            )

    for change in request.changes:
        scheduled_activities_repo.update_scheduled_activity_by_id(
            db,
            change.record_id,
            {"start_timeslot": change.new_start_timeslot, "room_id": change.new_room_id},
        )

    logger.info(f"Applied {len(request.changes)} record update(s) to schedule {schedule_id}")
    return get_scheduled_activities_by_schedule_id(db, schedule_id, current_user_id)
