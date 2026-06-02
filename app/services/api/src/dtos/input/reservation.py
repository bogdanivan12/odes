from typing import Optional

from pydantic import BaseModel, Field


class CreateReservation(BaseModel):
    """DTO for requesting a room reservation."""
    room_id: str
    date: str                       # ISO "YYYY-MM-DD"
    start_minute: int = Field(ge=0, le=1440)
    end_minute: int = Field(ge=0, le=1440)
    reason: str


class CheckReservationConflict(BaseModel):
    """DTO for the pre-submit conflict check (no reason needed)."""
    room_id: str
    date: str
    start_minute: int = Field(ge=0, le=1440)
    end_minute: int = Field(ge=0, le=1440)
    exclude_reservation_id: Optional[str] = None


class RefuseReservation(BaseModel):
    """DTO for refusing a reservation (optional reason)."""
    reason: Optional[str] = None
