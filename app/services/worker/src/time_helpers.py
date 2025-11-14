from typing import Set, List

from app.libs.db import models


def day_slot_index(day: int, slot_in_day: int, slots_per_day: int) -> int:
    return day * slots_per_day + slot_in_day


def slots_covered_by_start(start_index: int, duration: int) -> Set[int]:
    return set(range(start_index, start_index + duration))


def allowed_starts(grid: models.TimeGridConfig, duration: int) -> List[int]:
    starts = []
    for d in range(grid.days):
        for s in range(grid.timeslots_per_day - duration + 1):
            starts.append(day_slot_index(d, s, grid.timeslots_per_day))
    return starts
