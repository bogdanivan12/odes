from datetime import date as date_cls, datetime, timedelta, timezone
from typing import List, Optional, Tuple

from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.libs.logging.logger import get_logger
from app.services.api.src.auth import access_verifiers
from app.services.api.src.dtos.input import reservation as dto_in
from app.services.api.src.dtos.output import reservation as dto_out
from app.services.api.src.repositories import (
    reservations as reservations_repo,
    institutions as institutions_repo,
    rooms as rooms_repo,
)


logger = get_logger()


# ── helpers ──────────────────────────────────────────────────────────────────

def _hhmm(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def _load_institution(db: Database, institution_id: str) -> models.Institution:
    data = institutions_repo.find_institution_by_id(db, institution_id)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {institution_id} not found.",
        )
    return models.Institution(**data)


def _resolve_week(
    institution: models.Institution, iso_date: str
) -> Optional[Tuple[int, int]]:
    """Map a real date to (week_pattern_0based, weekday) using the calendar
    mapping.  A date matches a configured week when it falls in the *same
    Monday–Sunday (ISO) week* as that week's start_date, so any day of the real
    week is reservable in natural Mon→Sun order regardless of which weekday the
    institution's grid starts on.  weekday is 0=Mon … 6=Sun.  None when no week
    matches."""
    tgc = institution.time_grid_config
    try:
        target = date_cls.fromisoformat(iso_date)
    except ValueError:
        return None
    target_monday = target - timedelta(days=target.weekday())
    for cw in tgc.calendar_weeks:
        try:
            start = date_cls.fromisoformat(cw.start_date)
        except ValueError:
            continue
        week_monday = start - timedelta(days=start.weekday())
        if week_monday == target_monday:
            return cw.week_number - 1, target.weekday()
    return None


def _compute_conflicts(
    db: Database,
    institution: models.Institution,
    room_id: str,
    iso_date: str,
    start_minute: int,
    end_minute: int,
    exclude_reservation_id: Optional[str] = None,
) -> List[dto_out.ReservationConflict]:
    """Conflicts of a proposed (room, date, [start, end)) against the active
    schedule and existing APPROVED reservations."""
    conflicts: List[dto_out.ReservationConflict] = []

    resolved = _resolve_week(institution, iso_date)
    if resolved is None:
        conflicts.append(dto_out.ReservationConflict(
            type="schedule",
            description="The selected date is not within a configured calendar week.",
        ))
        return conflicts
    week_pattern, reservation_weekday = resolved

    tgc = institution.time_grid_config
    tpd = tgc.timeslots_per_day
    slot_dur = tgc.timeslot_duration_minutes
    grid_start = tgc.start_hour * 60 + tgc.start_minute

    # ── Active-schedule activities in this room ─────────────────────────────
    schedule_id = institution.active_schedule_id
    if schedule_id:
        sched = db.get_collection(models.ScheduledActivity.COLLECTION_NAME).find(
            {"schedule_id": schedule_id, "room_id": room_id}
        ).to_list()
        activity_ids = list({s["activity_id"] for s in sched})
        acts = db.get_collection(models.Activity.COLLECTION_NAME).find(
            {"_id": {"$in": activity_ids}}
        ).to_list()
        acts_by_id = {a["_id"]: a for a in acts}
        course_ids = list({a.get("course_id") for a in acts if a.get("course_id")})
        courses = db.get_collection(models.Course.COLLECTION_NAME).find(
            {"_id": {"$in": course_ids}}
        ).to_list()
        course_name = {c["_id"]: c.get("name", "") for c in courses}

        for s in sched:
            act = acts_by_id.get(s["activity_id"])
            if not act:
                continue
            freq = str(act.get("frequency", "weekly")).lower()
            active = (freq == "weekly") or (week_pattern in (s.get("active_weeks") or []))
            if not active:
                continue
            # The schedule's day index is relative to the grid's start_day; convert
            # it to a real weekday (Mon=0) to compare with the reservation's day.
            activity_weekday = (tgc.start_day + s["start_timeslot"] // tpd) % 7
            if activity_weekday != reservation_weekday:
                continue
            slot_in_day = s["start_timeslot"] % tpd
            act_start = grid_start + slot_in_day * slot_dur
            act_end = act_start + act.get("duration_slots", 1) * slot_dur
            if max(start_minute, act_start) < min(end_minute, act_end):
                name = course_name.get(act.get("course_id"), "A scheduled class")
                conflicts.append(dto_out.ReservationConflict(
                    type="schedule",
                    description=f"{name or 'A scheduled class'} occupies this room "
                                f"{_hhmm(act_start)}–{_hhmm(act_end)}.",
                ))

    # ── Approved reservations for this room on this date ────────────────────
    approved = reservations_repo.find_approved_reservations_for_room_on_date(
        db, room_id, iso_date, exclude_reservation_id
    )
    for r in approved:
        if max(start_minute, r["start_minute"]) < min(end_minute, r["end_minute"]):
            conflicts.append(dto_out.ReservationConflict(
                type="reservation",
                description=f"An approved reservation already occupies this room "
                            f"{_hhmm(r['start_minute'])}–{_hhmm(r['end_minute'])}.",
            ))

    return conflicts


# ── public service functions ─────────────────────────────────────────────────

def get_reservations(db: Database, institution_id: str, current_user_id: str) -> List[models.Reservation]:
    access_verifiers.raise_institution_forbidden(db, current_user_id, institution_id)
    data = reservations_repo.find_reservations_by_institution_id(db, institution_id)
    return [models.Reservation(**r) for r in data]


def check_conflict(
    db: Database,
    institution_id: str,
    request: dto_in.CheckReservationConflict,
    current_user_id: str,
) -> dto_out.CheckReservationConflictResponse:
    access_verifiers.raise_institution_forbidden(db, current_user_id, institution_id)
    institution = _load_institution(db, institution_id)
    conflicts: List[dto_out.ReservationConflict] = []
    if request.end_minute <= request.start_minute:
        conflicts.append(dto_out.ReservationConflict(
            type="reservation", description="End time must be after start time."))
    else:
        conflicts = _compute_conflicts(
            db, institution, request.room_id, request.date,
            request.start_minute, request.end_minute, request.exclude_reservation_id,
        )
    return dto_out.CheckReservationConflictResponse(ok=len(conflicts) == 0, conflicts=conflicts)


def create_reservation(
    db: Database,
    institution_id: str,
    request: dto_in.CreateReservation,
    current_user_id: str,
) -> models.Reservation:
    access_verifiers.raise_institution_forbidden(db, current_user_id, institution_id)
    institution = _load_institution(db, institution_id)

    if request.end_minute <= request.start_minute:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="End time must be after start time.")
    room = rooms_repo.find_room_by_id(db, request.room_id)
    if not room or room.get("institution_id") != institution_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Room not found in this institution.")
    if _resolve_week(institution, request.date) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="The selected date is not within a configured calendar week.")

    conflicts = _compute_conflicts(
        db, institution, request.room_id, request.date,
        request.start_minute, request.end_minute,
    )
    if conflicts:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="; ".join(c.description for c in conflicts),
        )

    reservation = models.Reservation(
        institution_id=institution_id,
        room_id=request.room_id,
        requester_id=current_user_id,
        date=request.date,
        start_minute=request.start_minute,
        end_minute=request.end_minute,
        reason=request.reason,
    )
    reservations_repo.insert_reservation(db, reservation)
    logger.info(f"Reservation {reservation.id} created by {current_user_id}")
    return reservation


def _load_reservation(db: Database, reservation_id: str) -> models.Reservation:
    data = reservations_repo.find_reservation_by_id(db, reservation_id)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Reservation {reservation_id} not found.")
    return models.Reservation(**data)


def approve_reservation(db: Database, reservation_id: str, current_user_id: str) -> models.Reservation:
    reservation = _load_reservation(db, reservation_id)
    access_verifiers.raise_institution_forbidden(
        db, current_user_id, reservation.institution_id, admin_only=True)

    # Re-check conflicts at approval time: pending requests don't hold a slot, so
    # an earlier-approved reservation (or schedule) may now collide.
    institution = _load_institution(db, reservation.institution_id)
    conflicts = _compute_conflicts(
        db, institution, reservation.room_id, reservation.date,
        reservation.start_minute, reservation.end_minute, exclude_reservation_id=reservation.id,
    )
    if conflicts:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot approve - it now conflicts with: "
                   + "; ".join(c.description for c in conflicts),
        )

    reservations_repo.update_reservation_by_id(db, reservation_id, {
        "status": models.ReservationStatus.APPROVED.value,
        "decided_by": current_user_id,
        "decision_reason": None,
        "decided_at": datetime.now(timezone.utc),
    })
    return _load_reservation(db, reservation_id)


def refuse_reservation(
    db: Database, reservation_id: str, request: dto_in.RefuseReservation, current_user_id: str
) -> models.Reservation:
    reservation = _load_reservation(db, reservation_id)
    access_verifiers.raise_institution_forbidden(
        db, current_user_id, reservation.institution_id, admin_only=True)
    reservations_repo.update_reservation_by_id(db, reservation_id, {
        "status": models.ReservationStatus.REFUSED.value,
        "decided_by": current_user_id,
        "decision_reason": request.reason,
        "decided_at": datetime.now(timezone.utc),
    })
    return _load_reservation(db, reservation_id)


def delete_reservation(db: Database, reservation_id: str, current_user_id: str) -> None:
    reservation = _load_reservation(db, reservation_id)
    is_owner = reservation.requester_id == current_user_id
    is_pending = reservation.status == models.ReservationStatus.PENDING
    if not (is_owner and is_pending):
        # Owners may withdraw their own pending request; otherwise admin only.
        access_verifiers.raise_institution_forbidden(
            db, current_user_id, reservation.institution_id, admin_only=True)
    reservations_repo.delete_reservation_by_id(db, reservation_id)
