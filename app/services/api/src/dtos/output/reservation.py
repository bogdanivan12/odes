from typing import List, Literal

from pydantic import BaseModel

from app.libs.db import models


class GetReservations(BaseModel):
    """DTO for listing reservations."""
    reservations: List[models.Reservation]


class GetReservation(BaseModel):
    """DTO for a single reservation."""
    reservation: models.Reservation


class ReservationConflict(BaseModel):
    type: Literal["schedule", "reservation"]
    description: str


class CheckReservationConflictResponse(BaseModel):
    """Result of the pre-submit conflict check."""
    ok: bool
    conflicts: List[ReservationConflict]
