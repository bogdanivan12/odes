"""
CP-SAT timetable generator using interval variables.

Model overview
==============

Decision variables (per activity ``a``):
  - ``start[a]``       : IntVar, domain = allowed starts after unavailability
                         pre-filtering.
  - ``end[a]``         : IntVar = start + duration.
  - ``interval[a]``    : Required IntervalVar(start, dur, end).  Used as the
                         "always-there" interval for an activity's time
                         placement.  The interval *itself* doesn't represent
                         a resource use directly — we derive optional
                         per-(week, room) and per-week intervals from it for
                         each resource constraint.
  - ``day[a]``         : IntVar = start // tpd, channelled via
                         AddAllowedAssignments over (start, day) pairs.
  - ``room_indicator[a][r]`` : BoolVars, exactly one is 1 (chosen room).
  - ``presence[a][w]`` : Constant 0/1 for fixed-week frequencies; BoolVars
                         for plain BIWEEKLY (solver picks which week).

Hard constraints
================
  - Exactly one room per activity (AddExactlyOne over room_indicators).
  - BIWEEKLY: ``presence[a][0] + presence[a][1] == 1``.
  - Room no-overlap per (week, room):
        AddNoOverlap(OptionalIntervalVar(start, dur, end,
                       is_present = room_indicator[a][r] AND presence[a][w])
                     for each activity a compatible with room r)
  - Professor no-overlap per (week, prof):
        AddNoOverlap(OptionalIntervalVar(..., is_present = presence[a][w])
                     for each activity a taught by prof)
  - Group no-overlap per (week, leaf_group): iterate leaves only (by
        transitivity covers internal groups).  An activity on an ancestor
        group counts toward every descendant leaf — per the user's
        clarification, "descendant is busy when ancestor is busy".
  - Professor unavailable slots and group unavailable slots (own + ancestor)
        are pre-filtered out of allowed_starts.  No solver-time constraint
        needed.
  - Per-day caps: per-institution group cap (every group, not just leaves,
        because an internal group's cap applies to its own + ancestor
        activities) and optional per-professor cap.  Implemented as
        ``sum(duration * is_present_in_day) <= cap``.

Soft objective
==============
Two parts, lexicographically weighted so preferred hours dominate gaps:
  1. Preferred-hours violations: sum over each activity of
        ``overlap_count * BoolVar(start[a] == s)`` for not-ideal slot overlap.
  2. Gap minimisation per (entity, week, day):
        ``span = last_used - first_used`` and ``any_used`` BoolVar.
        ``gaps_per_day = span + any_used - num_used``.
        ``sum(num_used)`` is constant across solutions (= total activity
        duration weighted by active-week count), so minimising
        ``sum(span) + sum(any_used)`` is exactly equivalent to minimising
        total gap length.

This file replaces the previous schedule generator wholesale; piecemeal
fixes had become a tangle.
"""

import datetime
import os
import sys
import threading
import time
from typing import Dict, List, Optional, Set, Tuple

import jwt as pyjwt
import requests
from ortools.sat.python import cp_model

from app.libs.db import models
from app.libs.logging.logger import get_logger
from app.libs.scheduling import eta as eta_helper
from app.services.worker.src import enhanced_models, time_helpers


API_URL = os.getenv("API_URL", "http://localhost:8000")
_SECRET_KEY = os.getenv("SECRET_KEY")
_JWT_ALGORITHM = os.getenv("DEFAULT_ALGORITHM", "HS256")
# Workers can run for tens of minutes; user tokens normally expire in 30 min,
# so we mint a long-lived service token at job start.
_WORKER_TOKEN_TTL_MINUTES = 240   # 4 hours

logger = get_logger()


# ─────────────────────────────────────────────────────────────────────────────
# Token / HTTP plumbing
# ─────────────────────────────────────────────────────────────────────────────

def refresh_worker_token(original_token: str) -> str:
    """Issue a long-lived JWT for worker→API calls during a single job.

    The user's original token typically expires in 30 minutes — too short for
    long-running schedule generation.  We decode it (ignoring expiry), pull
    the ``sub`` claim, and mint a fresh token tied to the same user with a
    4-hour TTL.

    Falls back to the original token on any error (with a warning)."""
    if not _SECRET_KEY:
        logger.warning("SECRET_KEY not configured; cannot refresh worker token")
        return original_token
    try:
        payload = pyjwt.decode(
            original_token,
            _SECRET_KEY,
            algorithms=[_JWT_ALGORITHM],
            options={"verify_exp": False},
        )
        user_id = payload.get("sub")
        if not user_id:
            logger.warning("Original token has no 'sub' claim; using as-is")
            return original_token
        expire = datetime.datetime.now(datetime.UTC) + datetime.timedelta(
            minutes=_WORKER_TOKEN_TTL_MINUTES
        )
        new_token = pyjwt.encode(
            {"sub": user_id, "exp": expire},
            _SECRET_KEY,
            algorithm=_JWT_ALGORITHM,
        )
        logger.info(
            f"Minted worker token for user {user_id}, expires {expire.isoformat()}"
        )
        return new_token
    except Exception as e:
        logger.warning(f"Failed to mint worker token, using original: {e}")
        return original_token


def get_institution_activities(institution_id: str, token: str) -> List[enhanced_models.Activity]:
    url = f"{API_URL}/api/v1/institutions/{institution_id}/activities"
    response = requests.get(url, headers={"Authorization": f"Bearer {token}"})
    response.raise_for_status()
    activities_data = response.json().get("activities", [])
    activities = [enhanced_models.Activity(**a) for a in activities_data]
    logger.info(f"Fetched {len(activities)} activities for institution {institution_id}")
    return activities


def get_professors_by_ids(professor_ids: List[str], token: str) -> List[models.User]:
    url = f"{API_URL}/api/v1/users"
    response = requests.get(url, headers={"Authorization": f"Bearer {token}"})
    response.raise_for_status()
    users_data = response.json().get("users", [])
    professors = [models.User(**u) for u in users_data if u["_id"] in professor_ids]
    logger.info(f"Fetched {len(professors)} professors by IDs")
    return professors


def get_institution_groups(institution_id: str, token: str) -> List[enhanced_models.Group]:
    url = f"{API_URL}/api/v1/institutions/{institution_id}/groups"
    response = requests.get(url, headers={"Authorization": f"Bearer {token}"})
    response.raise_for_status()
    groups_data = response.json().get("groups", [])
    groups = [enhanced_models.Group(**g) for g in groups_data]
    by_id = {g.id: g for g in groups}
    for g in groups:
        ancestors = []
        cur = g.parent_group_id
        while cur is not None:
            ancestors.append(cur)
            cur = by_id[cur].parent_group_id
        g.ancestor_ids = ancestors
    logger.info(f"Fetched {len(groups)} groups for institution {institution_id}")
    return groups


def get_institution_by_id(institution_id: str, token: str) -> models.Institution:
    url = f"{API_URL}/api/v1/institutions/{institution_id}"
    response = requests.get(url, headers={"Authorization": f"Bearer {token}"})
    response.raise_for_status()
    return models.Institution(**response.json().get("institution"))


def get_institution_rooms(institution_id: str, token: str) -> List[models.Room]:
    url = f"{API_URL}/api/v1/institutions/{institution_id}/rooms"
    response = requests.get(url, headers={"Authorization": f"Bearer {token}"})
    response.raise_for_status()
    rooms_data = response.json().get("rooms", [])
    rooms = [models.Room(**r) for r in rooms_data]
    logger.info(f"Fetched {len(rooms)} rooms for institution {institution_id}")
    return rooms


def get_schedule_input_data(institution_id: str, token: str):
    activities = get_institution_activities(institution_id, token)
    rooms = get_institution_rooms(institution_id, token)
    groups = get_institution_groups(institution_id, token)
    professor_ids = list({a.professor_id for a in activities if a.professor_id})
    professors = get_professors_by_ids(professor_ids, token)
    institution = get_institution_by_id(institution_id, token)
    return institution, rooms, groups, professors, activities


def filter_rooms_by_features(rooms: List[models.Room], required_features: List[str]):
    if not required_features:
        return rooms
    return [r for r in rooms if all(f in r.features for f in required_features)]


def db_update_failed_schedule(schedule_id: str, reason: str, token: str):
    url = f"{API_URL}/api/v1/schedules/{schedule_id}"
    try:
        response = requests.put(
            url,
            json={"status": models.ScheduleStatus.FAILED, "error_message": reason},
            headers={"Authorization": f"Bearer {token}"},
        )
        response.raise_for_status()
    except Exception as err:
        raise Exception(f"Failed to update schedule status: {err}")


def db_update_schedule_status(schedule_id: str, status: models.ScheduleStatus, token: str):
    url = f"{API_URL}/api/v1/schedules/{schedule_id}"
    try:
        response = requests.put(
            url,
            json={"status": status},
            headers={"Authorization": f"Bearer {token}"},
        )
        response.raise_for_status()
    except Exception as err:
        raise Exception(f"Failed to update schedule status: {err}")


def replace_scheduled_activities(
    schedule_id: str,
    scheduled_activities: List[models.ScheduledActivity],
    token: str,
):
    """Atomically replace scheduled activities for a schedule.

    The API endpoint deletes existing entries for this schedule_id and
    inserts the new ones — used for the final save (no intermediate saves
    in this rewrite)."""
    response = requests.put(
        f"{API_URL}/api/v1/schedules/{schedule_id}/scheduled-activities",
        json={
            "scheduled_activities": [
                sa.model_dump(by_alias=True) for sa in scheduled_activities
            ]
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    response.raise_for_status()


# ─────────────────────────────────────────────────────────────────────────────
# CP-SAT model
# ─────────────────────────────────────────────────────────────────────────────

def _and_bool(model: cp_model.CpModel, name: str, conditions):
    """Combine a list of (BoolVar or constant 0/1) into a representation of
    their AND.  Returns:
      - 0 (int)        if any condition is constant 0  (AND is always 0)
      - 1 (int)        if all conditions are constant 1
      - the lone BoolVar if exactly one real BoolVar remains after dropping 1s
      - a fresh BoolVar constrained to be the AND otherwise

    Used heavily for "activity a is assigned to room r AND active in week w"
    kinds of expressions, where many activities have fixed-week presence
    (constants) and we want to avoid materialising unnecessary BoolVars."""
    real = []
    for c in conditions:
        if isinstance(c, int):
            if c == 0:
                return 0
            # c == 1 → drop
        else:
            real.append(c)
    if not real:
        return 1
    if len(real) == 1:
        return real[0]
    bv = model.NewBoolVar(name)
    # bv ≤ each c (so bv = 1 ⇒ all c = 1)
    for c in real:
        model.Add(bv <= c)
    # bv ≥ sum(c) - (n-1)  (so all c = 1 ⇒ bv = 1)
    model.Add(bv >= sum(real) - (len(real) - 1))
    return bv


def _make_optional_interval(
    model: cp_model.CpModel,
    name: str,
    start, duration: int, end,
    presence,
):
    """Wrap (start, dur, end) into a CP-SAT interval whose presence is
    governed by ``presence`` (a BoolVar, or the Python int 0/1 used as
    a constant-presence sentinel).

    Returns the interval var, or None when presence is constant 0.

    Note: we cannot use ``presence == 0`` directly because CP-SAT BoolVars
    overload ``==`` to return a BoundedLinearExpression, not a Python bool.
    All constant-vs-variable checks must go through ``isinstance(x, int)``.
    """
    if isinstance(presence, int):
        if presence == 0:
            return None
        if presence == 1:
            return model.NewIntervalVar(start, duration, end, name + "_req")
    return model.NewOptionalIntervalVar(start, duration, end, presence, name)


class _StagnationStopper(cp_model.CpSolverSolutionCallback):
    """CP-SAT solution callback that records the wall-clock time of the
    last improving incumbent.  Pairs with ``_StagnationMonitor``: this
    side only writes timestamps; the monitor thread reads them and
    decides when to abort the search."""

    def __init__(self, monitor: "_StagnationMonitor"):
        super().__init__()
        self._monitor = monitor

    def on_solution_callback(self):
        self._monitor.report_improvement(self.ObjectiveValue())


class _StagnationMonitor:
    """Background watchdog: aborts the CP-SAT search if no improving
    incumbent has been found for ``max_idle_seconds`` consecutive seconds.

    Runs in a daemon thread, polling every 2 s.  ``solver.StopSearch()``
    is documented as thread-safe, so calling it from here cleanly
    triggers ``Solve()`` to return in the main thread."""

    def __init__(self, solver: cp_model.CpSolver, max_idle_seconds: float):
        self._solver = solver
        self._max_idle = max_idle_seconds
        self._lock = threading.Lock()
        self._last_improvement_at = time.time()
        self._best_objective: Optional[float] = None
        self._stop_event = threading.Event()
        self._fired = False
        self._thread: Optional[threading.Thread] = None

    def start(self):
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=2.0)

    def fired(self) -> bool:
        """Whether the monitor actually triggered a stop (vs. natural exit)."""
        return self._fired

    def report_improvement(self, objective: float):
        with self._lock:
            if self._best_objective is None or objective < self._best_objective:
                self._best_objective = objective
                self._last_improvement_at = time.time()

    def _loop(self):
        while not self._stop_event.is_set():
            # Check every 2 s; cheap.
            if self._stop_event.wait(2.0):
                return
            with self._lock:
                idle = time.time() - self._last_improvement_at
                have_incumbent = self._best_objective is not None
            if have_incumbent and idle >= self._max_idle:
                logger.info(
                    f"Early exit: no improvement for {idle:.1f}s "
                    f"(stagnation limit = {self._max_idle:.0f}s); "
                    f"current best = {self._best_objective}."
                )
                sys.stdout.flush()
                self._fired = True
                self._solver.StopSearch()
                return


def generate_schedule(institution_id: str, schedule_id: str, token: str):
    """Build the CP-SAT model, solve it, and persist the result."""
    db_update_schedule_status(schedule_id, models.ScheduleStatus.RUNNING, token)
    institution, rooms, groups, professors, activities = get_schedule_input_data(
        institution_id, token,
    )

    logger.info(
        f"Generating schedule for institution {institution_id}: "
        f"{len(activities)} activities, {len(rooms)} rooms, "
        f"{len(groups)} groups, {len(professors)} professors."
    )

    if not activities:
        replace_scheduled_activities(schedule_id, [], token)
        db_update_schedule_status(schedule_id, models.ScheduleStatus.COMPLETED, token)
        logger.info("No activities to schedule. Marked as completed.")
        return

    tpd = institution.time_grid_config.timeslots_per_day
    days = institution.time_grid_config.days
    weeks = institution.time_grid_config.weeks
    total_slots = days * tpd

    # ── Per-activity feasibility: rooms + allowed starts ─────────────────────
    for a in activities:
        a.possible_rooms = filter_rooms_by_features(rooms, a.required_room_features)
        if not a.possible_rooms:
            msg = f"No room with required features for activity {a.id}."
            logger.error(msg)
            db_update_failed_schedule(schedule_id, msg, token)
            raise Exception(msg)

    # Preferences (unavailable = hard, not_ideal = soft penalty)
    prof_unavail: Dict[str, Set[int]] = {}
    prof_not_ideal: Dict[str, Set[int]] = {}
    for p in professors:
        prefs = p.timeslot_preferences.get(institution_id, [])
        u = {pr.slot for pr in prefs if pr.preference == models.TimeslotPreferenceValue.UNAVAILABLE}
        n = {pr.slot for pr in prefs if pr.preference == models.TimeslotPreferenceValue.NOT_IDEAL}
        if u: prof_unavail[p.id] = u
        if n: prof_not_ideal[p.id] = n

    group_unavail: Dict[str, Set[int]] = {}
    group_not_ideal: Dict[str, Set[int]] = {}
    for g in groups:
        u = {pr.slot for pr in g.timeslot_preferences
             if pr.preference == models.TimeslotPreferenceValue.UNAVAILABLE}
        n = {pr.slot for pr in g.timeslot_preferences
             if pr.preference == models.TimeslotPreferenceValue.NOT_IDEAL}
        if u: group_unavail[g.id] = u
        if n: group_not_ideal[g.id] = n

    groups_by_id = {g.id: g for g in groups}
    child_ids = {g.parent_group_id for g in groups if g.parent_group_id}
    leaf_groups = [g for g in groups if g.id not in child_ids]

    # Effective unavailable slot set per activity (own group + ancestors + prof)
    def activity_forbidden_slots(a) -> Set[int]:
        forbidden: Set[int] = set()
        if a.professor_id:
            forbidden |= prof_unavail.get(a.professor_id, set())
        ag = groups_by_id.get(a.group_id)
        if ag:
            for gid in [ag.id] + ag.ancestor_ids:
                forbidden |= group_unavail.get(gid, set())
        return forbidden

    # Per-activity not-ideal set (prof + group + ancestors)
    def activity_not_ideal_slots(a) -> Set[int]:
        slots: Set[int] = set()
        if a.professor_id:
            slots |= prof_not_ideal.get(a.professor_id, set())
        ag = groups_by_id.get(a.group_id)
        if ag:
            for gid in [ag.id] + ag.ancestor_ids:
                slots |= group_not_ideal.get(gid, set())
        return slots

    # Allowed starts after pre-filter
    allowed_starts_map: Dict[str, List[int]] = {}
    for a in activities:
        raw = time_helpers.allowed_starts(institution.time_grid_config, a.duration_slots)
        forbidden = activity_forbidden_slots(a)
        if forbidden:
            usable = [
                s for s in raw
                if not (set(range(s, s + a.duration_slots)) & forbidden)
            ]
        else:
            usable = list(raw)
        if not usable:
            msg = (
                f"Activity {a.id} has no feasible start (blocked entirely by "
                f"unavailable preferences)."
            )
            logger.error(msg)
            db_update_failed_schedule(schedule_id, msg, token)
            raise Exception(msg)
        allowed_starts_map[a.id] = usable

    # ── Build the CP-SAT model ───────────────────────────────────────────────
    model = cp_model.CpModel()

    start_var: Dict[str, cp_model.IntVar] = {}
    end_var: Dict[str, cp_model.IntVar] = {}
    interval_var: Dict[str, cp_model.IntervalVar] = {}
    day_var: Dict[str, cp_model.IntVar] = {}
    is_day_bv: Dict[Tuple[str, int], cp_model.IntVar] = {}
    room_indicator: Dict[Tuple[str, str], cp_model.IntVar] = {}
    presence: Dict[Tuple[str, int], object] = {}   # value is BoolVar | 0 | 1

    for a in activities:
        starts = allowed_starts_map[a.id]
        domain = cp_model.Domain.FromValues(starts)
        s = model.NewIntVarFromDomain(domain, f"start_{a.id}")
        e = model.NewIntVar(a.duration_slots, total_slots, f"end_{a.id}")
        iv = model.NewIntervalVar(s, a.duration_slots, e, f"iv_{a.id}")
        start_var[a.id] = s
        end_var[a.id] = e
        interval_var[a.id] = iv

        # day = start // tpd — channel via AllowedAssignments
        d = model.NewIntVar(0, days - 1, f"day_{a.id}")
        day_var[a.id] = d
        model.AddAllowedAssignments([s, d], [(st, st // tpd) for st in starts])

        # Per-day equality BoolVars: needed for per-day caps and compactness
        for di in range(days):
            b = model.NewBoolVar(f"is_day_{a.id}_{di}")
            model.Add(d == di).OnlyEnforceIf(b)
            model.Add(d != di).OnlyEnforceIf(b.Not())
            is_day_bv[(a.id, di)] = b

        # Exactly-one-room
        for r in a.possible_rooms:
            room_indicator[(a.id, r.id)] = model.NewBoolVar(f"ri_{a.id}_{r.id}")
        model.AddExactlyOne(
            room_indicator[(a.id, r.id)] for r in a.possible_rooms
        )

        # Presence per week — populated for every w in range(weeks) so we
        # never KeyError downstream.  Semantics generalise via w % 2:
        #   WEEKLY         → active in every week.
        #   BIWEEKLY_ODD   → active on even-indexed weeks  (0, 2, 4, …).
        #   BIWEEKLY_EVEN  → active on odd-indexed weeks   (1, 3, 5, …).
        #   BIWEEKLY       → solver picks the phase (odd-week or even-week
        #                    parity); a single ``phase`` BoolVar selects
        #                    which side is active and the other becomes
        #                    ``phase.Not()``.  This naturally handles
        #                    weeks > 2 — e.g. with weeks=4 and phase=1,
        #                    the activity is active in weeks 0 and 2.
        if a.frequency == models.Frequency.WEEKLY:
            for w in range(weeks):
                presence[(a.id, w)] = 1
        elif a.frequency == models.Frequency.BIWEEKLY_ODD:
            for w in range(weeks):
                presence[(a.id, w)] = 1 if w % 2 == 0 else 0
        elif a.frequency == models.Frequency.BIWEEKLY_EVEN:
            for w in range(weeks):
                presence[(a.id, w)] = 1 if w % 2 == 1 else 0
        else:   # plain BIWEEKLY — solver picks the phase
            if weeks <= 1:
                # Only one week available; the activity must be in it.
                presence[(a.id, 0)] = 1
            else:
                phase = model.NewBoolVar(f"pres_{a.id}_phase")
                for w in range(weeks):
                    presence[(a.id, w)] = phase if w % 2 == 0 else phase.Not()

    # Sanity check: every activity must be active in at least one week,
    # otherwise it's silently dropped from the schedule.  This catches
    # configuration mistakes like ``BIWEEKLY_EVEN`` with ``weeks=1``.
    for a in activities:
        can_be_active = False
        for w in range(weeks):
            pv = presence[(a.id, w)]
            if isinstance(pv, int):
                if pv == 1:
                    can_be_active = True
                    break
            else:
                # Variable presence — could be 1
                can_be_active = True
                break
        if not can_be_active:
            msg = (
                f"Activity {a.id} (frequency={a.frequency}) has no possible "
                f"active week given institution weeks={weeks}."
            )
            logger.error(msg)
            db_update_failed_schedule(schedule_id, msg, token)
            raise Exception(msg)

    # ── Room no-overlap per (week, room) ─────────────────────────────────────
    activities_by_room: Dict[str, List] = {}
    for a in activities:
        for r in a.possible_rooms:
            activities_by_room.setdefault(r.id, []).append(a)

    for r_id, acts in activities_by_room.items():
        for w in range(weeks):
            intervals = []
            for a in acts:
                pa = presence[(a.id, w)]
                ri = room_indicator[(a.id, r_id)]
                pres = _and_bool(
                    model, f"pres_{a.id}_r{r_id}_w{w}", [pa, ri],
                )
                iv = _make_optional_interval(
                    model, f"oiv_{a.id}_r{r_id}_w{w}",
                    start_var[a.id], a.duration_slots, end_var[a.id], pres,
                )
                if iv is not None:
                    intervals.append(iv)
            if len(intervals) > 1:
                model.AddNoOverlap(intervals)

    # ── Professor no-overlap per (week, prof) ────────────────────────────────
    activities_by_prof: Dict[str, List] = {}
    for a in activities:
        if a.professor_id:
            activities_by_prof.setdefault(a.professor_id, []).append(a)

    for p_id, acts in activities_by_prof.items():
        for w in range(weeks):
            intervals = []
            for a in acts:
                pa = presence[(a.id, w)]
                iv = _make_optional_interval(
                    model, f"oiv_p{p_id}_a{a.id}_w{w}",
                    start_var[a.id], a.duration_slots, end_var[a.id], pa,
                )
                if iv is not None:
                    intervals.append(iv)
            if len(intervals) > 1:
                model.AddNoOverlap(intervals)

    # ── Group no-overlap per (week, leaf_group) ──────────────────────────────
    # Iterate leaves only: a conflict in any internal group surfaces in at
    # least one leaf descendant of that group.
    for L in leaf_groups:
        relevant = [
            a for a in activities
            if a.group_id == L.id or a.group_id in L.ancestor_ids
        ]
        if not relevant:
            continue
        for w in range(weeks):
            intervals = []
            for a in relevant:
                pa = presence[(a.id, w)]
                iv = _make_optional_interval(
                    model, f"oiv_g{L.id}_a{a.id}_w{w}",
                    start_var[a.id], a.duration_slots, end_var[a.id], pa,
                )
                if iv is not None:
                    intervals.append(iv)
            if len(intervals) > 1:
                model.AddNoOverlap(intervals)

    # ── Per-day caps (helper for "activity in day d, week w") ────────────────
    def present_in_day(a, w, d):
        pa = presence[(a.id, w)]
        is_d = is_day_bv[(a.id, d)]
        return _and_bool(model, f"pid_{a.id}_w{w}_d{d}", [pa, is_d])

    # Professor per-day cap (when configured below tpd)
    for p in professors:
        cap = p.max_timeslots_per_day.get(institution_id)
        if not cap or cap >= tpd:
            continue
        acts = activities_by_prof.get(p.id, [])
        if not acts:
            continue
        for w in range(weeks):
            for d in range(days):
                terms = []
                for a in acts:
                    bv = present_in_day(a, w, d)
                    if isinstance(bv, int) and bv == 0: continue
                    if isinstance(bv, int) and bv == 1:
                        # Always in this (week, day) — counts unconditionally
                        terms.append((a.duration_slots, None))
                    else:
                        terms.append((a.duration_slots, bv))
                if not terms:
                    continue
                # Sum: constant + sum(dur * BoolVar)
                const = sum(dur for dur, bv in terms if bv is None)
                expr = sum(dur * bv for dur, bv in terms if bv is not None) + const
                model.Add(expr <= cap)

    # Per-group per-day cap (institution config). Iterate ALL groups (not just
    # leaves) because each group's cap counts its own + ancestor activities,
    # which is a distinct set per internal group.
    # Compare against tpd (not total_slots): the cap is per-day, so any value
    # >= tpd is structurally unreachable and we'd just be emitting redundant
    # constraints.
    group_cap = institution.time_grid_config.max_timeslots_per_day_per_group
    if group_cap and group_cap < tpd:
        for grp in groups:
            relevant = [
                a for a in activities
                if a.group_id == grp.id or a.group_id in grp.ancestor_ids
            ]
            if not relevant:
                continue
            for w in range(weeks):
                for d in range(days):
                    terms = []
                    for a in relevant:
                        bv = present_in_day(a, w, d)
                        if isinstance(bv, int) and bv == 0: continue
                        if isinstance(bv, int) and bv == 1:
                            terms.append((a.duration_slots, None))
                        else:
                            terms.append((a.duration_slots, bv))
                    if not terms:
                        continue
                    const = sum(dur for dur, bv in terms if bv is None)
                    expr = sum(dur * bv for dur, bv in terms if bv is not None) + const
                    model.Add(expr <= group_cap)

    # ── Soft: preferred-hours violations ─────────────────────────────────────
    # For each activity, for each allowed start, count overlap with
    # not-ideal slots and add overlap * (start[a] == s) to penalty.
    pref_terms: List[Tuple[int, cp_model.IntVar]] = []
    start_eq_bv_cache: Dict[Tuple[str, int], cp_model.IntVar] = {}

    def start_eq(a_id, s):
        key = (a_id, s)
        if key not in start_eq_bv_cache:
            b = model.NewBoolVar(f"start_{a_id}_eq_{s}")
            model.Add(start_var[a_id] == s).OnlyEnforceIf(b)
            model.Add(start_var[a_id] != s).OnlyEnforceIf(b.Not())
            start_eq_bv_cache[key] = b
        return start_eq_bv_cache[key]

    for a in activities:
        ni = activity_not_ideal_slots(a)
        if not ni:
            continue
        for s in allowed_starts_map[a.id]:
            covered = set(range(s, s + a.duration_slots))
            overlap = len(covered & ni)
            if overlap > 0:
                pref_terms.append((overlap, start_eq(a.id, s)))

    # ── Soft: gap minimisation per (entity, week, day) ───────────────────────
    span_vars: List[cp_model.IntVar] = []
    any_used_vars: List[cp_model.IntVar] = []

    def add_entity_compactness(tag: str, relevant):
        """Add span + any_used vars for each (week, day) of this entity.

        Per (week, day):
          first / last : IntVar in [0, tpd-1]
          any_used     : BoolVar = OR of "activity present in this day-week"
          For each relevant activity a:
            present_a_wd = presence[a][w] AND day[a] == d
            present_a_wd ⇒ first ≤ start[a] - d*tpd
            present_a_wd ⇒ last  ≥ end[a] - 1 - d*tpd
          When ¬any_used: pin first = last = 0 → span = 0.
          span = last - first.
        Sum of (span + any_used) across entity-days equals the total gap
        slot count modulo a constant (= total activity duration across
        active weeks for this entity)."""
        for w in range(weeks):
            for d in range(days):
                presents = []
                for a in relevant:
                    bv = present_in_day(a, w, d)
                    if isinstance(bv, int) and bv == 0:
                        continue
                    presents.append((a, bv))
                if not presents:
                    continue
                # any_used = OR of bv values (treat constant 1 as "always used")
                any_used = model.NewBoolVar(f"any_{tag}_w{w}_d{d}")
                real_bvs = [bv for _, bv in presents if not (isinstance(bv, int) and bv == 1)]
                if any(isinstance(bv, int) and bv == 1 for _, bv in presents):
                    model.Add(any_used == 1)
                elif real_bvs:
                    for bv in real_bvs:
                        model.AddImplication(bv, any_used)
                    model.AddBoolOr([any_used.Not()] + real_bvs)
                else:
                    # presents is empty after filter — already handled above
                    continue

                first = model.NewIntVar(0, tpd - 1, f"first_{tag}_w{w}_d{d}")
                last = model.NewIntVar(0, tpd - 1, f"last_{tag}_w{w}_d{d}")
                day_start = d * tpd

                for a, bv in presents:
                    if isinstance(bv, int) and bv == 1:
                        model.Add(first <= start_var[a.id] - day_start)
                        model.Add(last >= end_var[a.id] - 1 - day_start)
                    else:
                        model.Add(first <= start_var[a.id] - day_start).OnlyEnforceIf(bv)
                        model.Add(last >= end_var[a.id] - 1 - day_start).OnlyEnforceIf(bv)

                # Pin to 0 when nothing is used so span contributes 0
                model.Add(first == 0).OnlyEnforceIf(any_used.Not())
                model.Add(last == 0).OnlyEnforceIf(any_used.Not())

                span = model.NewIntVar(0, tpd - 1, f"span_{tag}_w{w}_d{d}")
                model.Add(span == last - first)
                span_vars.append(span)
                any_used_vars.append(any_used)

    for p in professors:
        acts = activities_by_prof.get(p.id, [])
        if acts:
            add_entity_compactness(f"p{p.id}", acts)
    for L in leaf_groups:
        relevant = [
            a for a in activities
            if a.group_id == L.id or a.group_id in L.ancestor_ids
        ]
        if relevant:
            add_entity_compactness(f"g{L.id}", relevant)

    logger.info(
        f"Compactness: {len(span_vars)} spans, {len(any_used_vars)} active flags."
    )
    if pref_terms:
        logger.info(f"Preferred-hours penalties: {len(pref_terms)} terms.")

    # ── Combined objective ───────────────────────────────────────────────────
    # Worst-case compactness cost is bounded by len(spans)*(tpd-1) + len(any_used).
    # Weight preferred-hours penalties above that so they always dominate.
    max_compact_cost = len(span_vars) * (tpd - 1) + len(any_used_vars)
    pref_weight = max(1, max_compact_cost) + 1

    objective_terms = []
    if pref_terms:
        objective_terms.extend(pref_weight * w * v for w, v in pref_terms)
    objective_terms.extend(span_vars)
    objective_terms.extend(any_used_vars)
    if objective_terms:
        model.Minimize(sum(objective_terms))
        logger.info(
            f"Objective: {len(pref_terms)} pref penalties (weight ×{pref_weight}) + "
            f"{len(span_vars) + len(any_used_vars)} compactness terms (weight ×1)"
        )

    # ── Solve ───────────────────────────────────────────────────────────────
    solver = cp_model.CpSolver()
    # Match Docker's cpus allocation (compose.yaml: cpus: 8.0).  CP-SAT
    # runs multiple search strategies in parallel — one worker explores
    # LP-based branching, another no-LP, others local search etc. — and
    # the new interval-based model is small enough that 8 workers fit
    # under the 12 GB memory limit.
    solver.parameters.num_search_workers = 8
    solver.parameters.max_time_in_seconds = float(
        eta_helper.estimate_solver_seconds(len(activities))
    )
    solver.parameters.log_search_progress = True

    # Watchdog: stop early if the incumbent hasn't improved for a while.
    # The stagnation budget scales with activity count — small problems get
    # 60 s of patience, bigger ones up to 180 s, with a power-law in between.
    # We still keep ``max_time_in_seconds`` as a hard upper bound.
    stagnation_seconds = eta_helper.estimate_stagnation_seconds(len(activities))
    stagnation_monitor = _StagnationMonitor(solver, max_idle_seconds=stagnation_seconds)
    stagnation_callback = _StagnationStopper(stagnation_monitor)

    logger.info(
        f"Starting CP-SAT solver "
        f"(time budget {solver.parameters.max_time_in_seconds:.0f}s, "
        f"stagnation limit {stagnation_seconds}s)..."
    )
    sys.stdout.flush()
    start_time = time.time()
    stagnation_monitor.start()
    try:
        result = solver.Solve(model, stagnation_callback)
    finally:
        stagnation_monitor.stop()
    elapsed = time.time() - start_time

    if result not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        msg = "Unable to find a feasible schedule."
        logger.error(msg)
        db_update_failed_schedule(schedule_id, msg, token)
        raise Exception(msg)

    pref_cost = sum(w * solver.Value(v) for w, v in pref_terms) if pref_terms else 0
    span_total = sum(solver.Value(v) for v in span_vars) if span_vars else 0
    active_days = sum(solver.Value(v) for v in any_used_vars) if any_used_vars else 0
    if result == cp_model.OPTIMAL:
        status = "OPTIMAL"
    elif stagnation_monitor.fired():
        status = "feasible (stagnation)"
    else:
        status = "feasible (time limit)"
    logger.info(
        f"Solve ({elapsed:.1f}s): preferred-hours penalty = {pref_cost}, "
        f"span = {span_total}, active entity-days = {active_days}, "
        f"compactness cost = {span_total + active_days} ({status})"
    )

    # ── Extract solution ────────────────────────────────────────────────────
    scheduled_by_key: Dict[Tuple[str, str, int], models.ScheduledActivity] = {}
    for a in activities:
        chosen_room = None
        for r in a.possible_rooms:
            if solver.Value(room_indicator[(a.id, r.id)]) == 1:
                chosen_room = r.id
                break
        if chosen_room is None:
            logger.error(f"No room chosen by solver for activity {a.id}")
            continue
        chosen_start = solver.Value(start_var[a.id])
        active_weeks: List[int] = []
        for w in range(weeks):
            pv = presence[(a.id, w)]
            if isinstance(pv, int):
                if pv == 1:
                    active_weeks.append(w)
            else:
                if solver.Value(pv) == 1:
                    active_weeks.append(w)
        key = (a.id, chosen_room, chosen_start)
        scheduled_by_key[key] = models.ScheduledActivity(
            schedule_id=schedule_id,
            activity_id=a.id,
            room_id=chosen_room,
            start_timeslot=chosen_start,
            active_weeks=active_weeks,
        )

    final_list = list(scheduled_by_key.values())
    replace_scheduled_activities(schedule_id, final_list, token)
    db_update_schedule_status(schedule_id, models.ScheduleStatus.COMPLETED, token)
    logger.info(f"Generated {len(final_list)} scheduled activities.")
