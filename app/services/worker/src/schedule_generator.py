import time

import requests
from ortools.sat.python import cp_model

import os
from typing import List

from app.libs.db import models
from app.libs.db import db as db_help
from app.libs.logging.logger import get_logger
from app.services.worker.src import enhanced_models, time_helpers
from app.services.worker.src.repositories import (
    schedules as schedules_repo,
    scheduled_activities as scheduled_activities_repo
)


API_URL = os.getenv("API_URL", "http://localhost:8000")
logger = get_logger()


def get_institution_activities(institution_id: str) -> List[enhanced_models.Activity]:
    """Fetch activities for a given institution from the API service"""
    url = f"{API_URL}/api/v1/institutions/{institution_id}/activities"
    logger.info(f"Fetching activities from {url}")
    response = requests.get(url)

    if response.status_code != 200:
        raise Exception(f"Failed to fetch activities: {response.status_code} - {response.text}")

    activities_data = response.json().get("activities", [])
    activities = [enhanced_models.Activity(**activity) for activity in activities_data]

    logger.info(f"Fetched {len(activities)} activities for institution {institution_id}")

    return activities


def get_professors_by_ids(professor_ids: List[str]) -> List[models.User]:
    """Fetch professors by their IDs from the API service"""
    url = f"{API_URL}/api/v1/users"
    logger.info(f"Fetching all users from {url}")
    response = requests.get(url)

    if response.status_code != 200:
        raise Exception(f"Failed to fetch users: {response.status_code} - {response.text}")

    users_data = response.json().get("users", [])
    professors = [models.User(**user) for user in users_data if user["_id"] in professor_ids]

    logger.info(f"Fetched {len(professors)} professors by IDs")

    return professors


def get_institution_groups(institution_id: str) -> List[enhanced_models.Group]:
    """Fetch groups for a given institution from the API service"""
    url = f"{API_URL}/api/v1/institutions/{institution_id}/groups"
    logger.info(f"Fetching groups from {url}")
    response = requests.get(url)

    if response.status_code != 200:
        raise Exception(f"Failed to fetch groups: {response.status_code} - {response.text}")

    groups_data = response.json().get("groups", [])
    groups = [enhanced_models.Group(**group) for group in groups_data]

    ancestors_mapping = {g.id: g for g in groups}
    for group in groups:
        ancestor_ids = []
        current_group = group.parent_group_id
        while current_group is not None:
            ancestor_ids.append(current_group)
            current_group = ancestors_mapping[current_group].parent_group_id
        group.ancestor_ids = ancestor_ids

    logger.info(f"Fetched {len(groups)} groups for institution {institution_id}")

    return groups


def get_institution_by_id(institution_id: str) -> models.Institution:
    """Fetch institution by ID from the API service"""
    url = f"{API_URL}/api/v1/institutions/{institution_id}"
    logger.info(f"Fetching institution from {url}")
    response = requests.get(url)

    if response.status_code != 200:
        raise Exception(f"Failed to fetch institution: {response.status_code} - {response.text}")

    institution_data = response.json().get("institution")
    institution = models.Institution(**institution_data)

    logger.info(f"Fetched institution {institution_id}")

    return institution


def get_institution_rooms(institution_id: str) -> List[models.Room]:
    """Fetch rooms for a given institution from the API service"""
    url = f"{API_URL}/api/v1/institutions/{institution_id}/rooms"
    logger.info(f"Fetching rooms from {url}")
    response = requests.get(url)

    if response.status_code != 200:
        raise Exception(f"Failed to fetch rooms: {response.status_code} - {response.text}")

    rooms_data = response.json().get("rooms", [])
    rooms = [models.Room(**room) for room in rooms_data]

    logger.info(f"Fetched {len(rooms)} rooms for institution {institution_id}")

    return rooms


def get_schedule_input_data(institution_id: str):
    """Fetch all necessary data for schedule generation"""
    activities = get_institution_activities(institution_id)
    rooms = get_institution_rooms(institution_id)
    groups = get_institution_groups(institution_id)

    professor_ids = list(set([activity.professor_id for activity in activities]))
    professors = get_professors_by_ids(professor_ids)

    institution = get_institution_by_id(institution_id)

    return institution, rooms, groups, professors, activities


def filter_rooms_by_features(rooms: List[models.Room], required_features: List[str]) -> List[models.Room]:
    if not required_features:
        return rooms
    return [
        room for room in rooms
        if all(feature in room.features for feature in required_features)
    ]


def build_selected(solver, institution, activities, week_allocation_map):
    selected = []
    for week in range(institution.time_grid_config.weeks):
        for activity in activities:
            for room in activity.possible_rooms:
                room_map = week_allocation_map[activity.id][week].get(room.id, {})
                for start in room_map:
                    if solver.Value(room_map[start]) == 1:
                        selected.append((week, activity.id, room.id, start))
    return selected


def db_update_failed_schedule(schedule_id: str, reason: str):
    """Update schedule status to failed in the database"""
    db_gen = db_help.get_db()
    db = next(db_gen)
    schedules_repo.update_schedule_by_id(
        db,
        schedule_id,
        {
            "status": models.ScheduleStatus.FAILED,
            "error_message": reason
        }
    )
    db_gen.close()


def db_update_schedule_status(schedule_id: str, status: models.ScheduleStatus):
    """Update schedule status in the database"""
    db_gen = db_help.get_db()
    db = next(db_gen)
    schedules_repo.update_schedule_by_id(
        db,
        schedule_id,
        {
            "status": status
        }
    )
    db_gen.close()


def generate_schedule(institution_id: str, schedule_id: str):
    """Generate schedule"""
    db_update_schedule_status(schedule_id, models.ScheduleStatus.RUNNING)
    institution, rooms, groups, professors, activities = get_schedule_input_data(institution_id)

    logger.info(f"Generating schedule for institution {institution_id}")
    model = cp_model.CpModel()

    timeslots = institution.time_grid_config.days * institution.time_grid_config.timeslots_per_day

    allowed_starts_map = {
        activity.id: time_helpers.allowed_starts(
            grid=institution.time_grid_config,
            duration=activity.duration_slots
        ) for activity in activities
    }

    for activity in activities:
        activity.possible_rooms = filter_rooms_by_features(
            rooms=rooms,
            required_features=activity.required_room_features
        )

    allocation_map = {}
    for activity in activities:
        allocation_map[activity.id] = {}
        for room in activity.possible_rooms:
            allocation_map[activity.id][room.id] = {}
            for start in allowed_starts_map[activity.id]:
                allocation_map[activity.id][room.id][start] = model.NewBoolVar(
                    f"activity_{activity.id}"
                    f"_room_{room.id}"
                    f"_start_{start}"
                )

        all_possible_choices = [
            allocation_map[activity.id][room.id][start]
            for room in activity.possible_rooms
            for start in allowed_starts_map[activity.id]
        ]

        if not all_possible_choices:
            error_message = f"No possible room/start time for activity {activity.id}"
            logger.error(error_message)
            db_update_failed_schedule(schedule_id, error_message)
            raise Exception(error_message)

        model.AddExactlyOne(all_possible_choices)

    activity_weeks_map = {}
    for activity in activities:
        activity_weeks_map[activity.id] = [
            model.NewBoolVar(f"active_activity_{activity.id}_week_{week}")
            for week in range(institution.time_grid_config.weeks)
        ]
        if activity.frequency == models.Frequency.WEEKLY:
            for week_var in activity_weeks_map[activity.id]:
                model.Add(week_var == 1)
        else:
            model.Add(sum(activity_weeks_map[activity.id]) == 1)
            if activity.frequency == models.Frequency.BIWEEKLY_ODD:
                model.Add(activity_weeks_map[activity.id][0] == 1)
            elif activity.frequency == models.Frequency.BIWEEKLY_EVEN:
                model.Add(activity_weeks_map[activity.id][1] == 1)

    week_allocation_map = {}
    for activity in activities:
        week_allocation_map[activity.id] = {}
        for week in range(institution.time_grid_config.weeks):
            week_allocation_map[activity.id][week] = {}
            for room in activity.possible_rooms:
                week_allocation_map[activity.id][week][room.id] = {}
                for start in allowed_starts_map[activity.id]:
                    active = model.NewBoolVar(
                        f"active"
                        f"_activity_{activity.id}"
                        f"_week_{week}"
                        f"_room_{room.id}"
                        f"_start_{start}"
                    )
                    model.Add(active <= allocation_map[activity.id][room.id][start])
                    model.Add(active <= activity_weeks_map[activity.id][week])
                    model.Add(
                        active >= allocation_map[activity.id][room.id][start] +
                        activity_weeks_map[activity.id][week] - 1
                    )
                    week_allocation_map[activity.id][week][room.id][start] = active

    covered_slots_map = {
        activity.id: {
            start: time_helpers.slots_covered_by_start(
                start_index=start,
                duration=activity.duration_slots
            ) for start in allowed_starts_map[activity.id]
        } for activity in activities
    }

    room_ids = [room.id for room in rooms]
    for week in range(institution.time_grid_config.weeks):
        for room_id in room_ids:
            for slot in range(timeslots):
                room_slot_vars = []
                for activity in activities:
                    if room_id not in week_allocation_map[activity.id][week]:
                        continue
                    for start in week_allocation_map[activity.id][week][room_id]:
                        if slot in covered_slots_map[activity.id][start]:
                            room_slot_vars.append(
                                week_allocation_map[activity.id][week][room_id][start]
                            )
                if room_slot_vars:
                    model.Add(sum(room_slot_vars) <= 1)

    prof_ids = [prof.id for prof in professors]
    for week in range(institution.time_grid_config.weeks):
        for prof_id in prof_ids:
            for slot in range(timeslots):
                prof_slot_vars = []
                for activity in activities:
                    if activity.professor_id != prof_id:
                        continue
                    for room_id in week_allocation_map[activity.id][week]:
                        for start in week_allocation_map[activity.id][week][room_id]:
                            if slot in covered_slots_map[activity.id][start]:
                                prof_slot_vars.append(
                                    week_allocation_map[activity.id][week][room_id][start]
                                )
                if prof_slot_vars:
                    model.Add(sum(prof_slot_vars) <= 1)

    for week in range(institution.time_grid_config.weeks):
        for group in groups:
            applicable_ids = [
                activity.id for activity in activities
                if activity.group_id == group.id or activity.group_id in group.ancestor_ids
            ]
            for slot in range(timeslots):
                group_slot_vars = []
                for activity_id in applicable_ids:
                    for room_id in week_allocation_map[activity_id][week]:
                        for start in week_allocation_map[activity_id][week][room_id]:
                            if slot in covered_slots_map[activity_id][start]:
                                group_slot_vars.append(
                                    week_allocation_map[activity_id][week][room_id][start]
                                )
                if group_slot_vars:
                    model.Add(sum(group_slot_vars) <= 1)

    # limit the number of hours per day for each group
    for week in range(institution.time_grid_config.weeks):
        for group in groups:
            applicable_ids = [
                activity.id for activity in activities
                if activity.group_id == group.id or activity.group_id in group.ancestor_ids
            ]
            for day in range(institution.time_grid_config.days):
                day_slot_start = day * institution.time_grid_config.timeslots_per_day
                day_slot_end = day_slot_start + institution.time_grid_config.timeslots_per_day
                day_slot_vars = []
                for slot in range(day_slot_start, day_slot_end):
                    for activity_id in applicable_ids:
                        for room_id in week_allocation_map[activity_id][week]:
                            for start in week_allocation_map[activity_id][week][room_id]:
                                if slot in covered_slots_map[activity_id][start]:
                                    day_slot_vars.append(
                                        week_allocation_map[activity_id][week][room_id][start]
                                    )
                if day_slot_vars:
                    model.Add(
                        sum(day_slot_vars)
                        <= institution.time_grid_config.max_timeslots_per_day_per_group
                    )

    # ---- Solve ----
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 60.0
    solver.parameters.stop_after_first_solution = True
    solver.parameters.num_search_workers = 8
    start_time = time.time()
    result = solver.Solve(model)
    end_time = time.time()
    logger.info(f"Solved in {end_time - start_time:.2f} seconds.")

    if result not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        error_message = "Unable to find a feasible schedule."
        logger.error(error_message)
        db_update_failed_schedule(schedule_id, error_message)
        raise Exception(error_message)

    selected_schedule = build_selected(solver, institution, activities, week_allocation_map)
    # convert selected_schedule to models.ScheduledActivity instances
    scheduled_activities = {}
    for week, activity_id, room_id, start in selected_schedule:
        scheduled_activity = models.ScheduledActivity(
            schedule_id=schedule_id,
            activity_id=activity_id,
            room_id=room_id,
            start_timeslot=start,
            active_weeks=[week]
        )
        if (activity_id, room_id, start) not in scheduled_activities:
            scheduled_activities[(activity_id, room_id, start)] = scheduled_activity
        else:
            scheduled_activities[(activity_id, room_id, start)].active_weeks.append(week)

    # add scheduled activities in database using db library
    db_gen = db_help.get_db()
    db = next(db_gen)
    scheduled_activities_repo.insert_scheduled_activities(db, list(scheduled_activities.values()))
    db_gen.close()

    db_update_schedule_status(schedule_id, models.ScheduleStatus.COMPLETED)

    logger.info(f"Generated {len(scheduled_activities)} scheduled activities.")
