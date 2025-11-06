from enum import Enum
from datetime import datetime, timezone
from typing import Optional, List, Dict, ClassVar

from pydantic import BaseModel, Field, EmailStr

from app.libs.stringproc.stringproc import generate_id


class TimeGridConfig(BaseModel):
    weeks: int
    days: int
    timeslots_per_day: int
    max_timeslots_per_day_per_group: int


class Institution(BaseModel):
    id: str = Field(default_factory=generate_id, alias="_id")
    name: str
    time_grid_config: TimeGridConfig

    COLLECTION_NAME: ClassVar[str] = "institutions"

    class Config:
        populate_by_name = True


class UserRole(str, Enum):
    STUDENT = "student"
    PROFESSOR = "professor"
    ADMIN = "admin"


class User(BaseModel):
    id: str = Field(default_factory=generate_id, alias="_id")
    name: str
    email: EmailStr
    # make hashed_password invisible in responses
    hashed_password: Optional[str] = Field(default=None, exclude=True)
    # mapping institution_ids to lists of roles
    user_roles: Dict[str, List[UserRole]] = Field(default_factory=dict)
    group_ids: List[str] = Field(default_factory=list)

    COLLECTION_NAME: ClassVar[str] = "users"

    class Config:
        populate_by_name = True


class Group(BaseModel):
    id: str = Field(default_factory=generate_id, alias="_id")
    institution_id: str
    name: str
    parent_group_id: Optional[str] = None

    COLLECTION_NAME: ClassVar[str] = "groups"

    class Config:
        populate_by_name = True


class Room(BaseModel):
    id: str = Field(default_factory=generate_id, alias="_id")
    institution_id: str
    name: str
    capacity: int
    features: List[str] = Field(default_factory=list)

    COLLECTION_NAME: ClassVar[str] = "rooms"

    class Config:
        populate_by_name = True


class ActivityType(str, Enum):
    COURSE = "course"
    SEMINAR = "seminar"
    LABORATORY = "laboratory"
    OTHER = "other"


class Course(BaseModel):
    id: str = Field(default_factory=generate_id, alias="_id")
    institution_id: str
    name: str

    COLLECTION_NAME: ClassVar[str] = "courses"

    class Config:
        populate_by_name = True


class SelectedTimeslot(BaseModel):
    start_timeslot: int
    active_weeks: List[int] = Field(default_factory=list)


class Frequency(str, Enum):
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    BIWEEKLY_ODD = "biweekly_odd"
    BIWEEKLY_EVEN = "biweekly_even"


class Activity(BaseModel):
    id: str = Field(default_factory=generate_id, alias="_id")
    institution_id: str
    activity_type: ActivityType
    course_id: str
    duration_slots: int
    group_id: str
    professor_id: Optional[str] = None
    required_room_features: List[str] = Field(default_factory=list)
    frequency: Frequency = Frequency.WEEKLY
    selected_timeslot: Optional[SelectedTimeslot] = None

    COLLECTION_NAME: ClassVar[str] = "activities"

    class Config:
        populate_by_name = True


class ScheduleStatus(str, Enum):
    DRAFT = "draft"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Schedule(BaseModel):
    id: str = Field(default_factory=generate_id, alias="_id")
    institution_id: str
    time_grid_config: TimeGridConfig
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: ScheduleStatus = ScheduleStatus.DRAFT
    error_message: Optional[str] = None

    COLLECTION_NAME: ClassVar[str] = "schedules"

    class Config:
        populate_by_name = True


class ScheduledActivity(BaseModel):
    id: str = Field(default_factory=generate_id, alias="_id")
    schedule_id: str
    activity_id: str
    room_id: str
    start_timeslot: int
    active_weeks: List[int] = Field(default_factory=list)

    COLLECTION_NAME: ClassVar[str] = "scheduled_activities"

    class Config:
        populate_by_name = True
