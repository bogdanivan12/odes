from enum import Enum
from datetime import datetime, timezone
from typing import Optional, List, Dict

from pydantic import BaseModel, Field
from beanie import Document, PydanticObjectId


class TimeGridConfig(BaseModel):
    weeks: int
    days: int
    timeslots_per_day: int
    max_timeslots_per_day_per_group: int


class Institution(Document):
    _id: Optional[PydanticObjectId] = None
    name: str
    time_grid_config: TimeGridConfig

    class Settings:
        name = "institutions"


class UserRole(str, Enum):
    STUDENT = "student"
    PROFESSOR = "professor"
    ADMIN = "admin"


class UserInstitutionRole(BaseModel):
    institution_id: PydanticObjectId
    roles: List[UserRole] = Field(default_factory=list)


class User(Document):
    _id: Optional[PydanticObjectId] = None
    name: str
    email: str
    hashed_password: str
    user_roles: List[UserInstitutionRole] = Field(default_factory=list)
    institution_ids: List[PydanticObjectId] = Field(default_factory=list)
    group_ids: List[PydanticObjectId] = Field(default_factory=list)

    class Settings:
        name = "users"


class Group(Document):
    _id: Optional[PydanticObjectId] = None
    institution_id: PydanticObjectId
    name: str
    parent_group_id: Optional[PydanticObjectId] = None

    class Settings:
        name = "groups"


class Room(Document):
    _id: Optional[PydanticObjectId] = None
    institution_id: PydanticObjectId
    name: str
    capacity: int
    features: List[str] = Field(default_factory=list)

    class Settings:
        name = "rooms"


class ActivityType(str, Enum):
    COURSE = "course"
    SEMINAR = "seminar"
    LABORATORY = "laboratory"
    OTHER = "other"


class Course(Document):
    _id: Optional[PydanticObjectId] = None
    institution_id: PydanticObjectId
    name: str
    # mapping activity type to its duration in slots
    activities_duration_slots: Dict[ActivityType, int] = Field(default_factory=dict)

    class Settings:
        name = "courses"


class SelectedTimeslot(BaseModel):
    start_timeslot: int
    active_weeks: List[int] = Field(default_factory=list)


class Frequency(str, Enum):
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    BIWEEKLY_ODD = "biweekly_odd"
    BIWEEKLY_EVEN = "biweekly_even"


class Activity(Document):
    _id: Optional[PydanticObjectId] = None
    institution_id: PydanticObjectId
    activity_type: ActivityType
    course_id: PydanticObjectId
    duration_slots: int
    group_id: PydanticObjectId
    professor_id: PydanticObjectId
    required_room_features: List[str] = Field(default_factory=list)
    frequency: Frequency
    selected_timeslot: Optional[SelectedTimeslot] = None

    class Settings:
        name = "activities"


class ScheduleStatus(str, Enum):
    DRAFT = "draft"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Schedule(Document):
    _id: Optional[PydanticObjectId] = None
    institution_id: PydanticObjectId
    time_grid_config: TimeGridConfig
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: ScheduleStatus = ScheduleStatus.DRAFT
    error_message: Optional[str] = None

    class Settings:
        name = "schedules"


class ScheduledActivity(Document):
    _id: Optional[PydanticObjectId] = None
    schedule_id: PydanticObjectId
    activity_id: PydanticObjectId
    room_id: PydanticObjectId
    start_timeslot: int
    active_weeks: List[int] = Field(default_factory=list)

    class Settings:
        name = "scheduled_activities"
