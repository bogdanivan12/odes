from starlette import status
from fastapi import APIRouter

from app.libs.db.db import DB
from app.services.api.src.auth import token_utils
from app.services.api.src.auth.token_utils import AUTH
from app.services.api.src.services import reservations as service
from app.services.api.src.dtos.input import reservation as dto_in
from app.services.api.src.dtos.output import reservation as dto_out


router = APIRouter(prefix="/api/v1", tags=["reservations"])


@router.get("/institutions/{institution_id}/reservations",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetReservations)
async def get_reservations(db: DB, institution_id: str, token: AUTH):
    """List all reservations for an institution (any member)."""
    current_user_id = token_utils.get_user_id_from_token(token)
    reservations = service.get_reservations(db, institution_id, current_user_id)
    return dto_out.GetReservations(reservations=reservations)


@router.post("/institutions/{institution_id}/reservations",
             status_code=status.HTTP_201_CREATED,
             response_model=dto_out.GetReservation)
async def create_reservation(
    db: DB, institution_id: str, request: dto_in.CreateReservation, token: AUTH
):
    """Request a room reservation (any member).  Rejected with 409 on conflict."""
    current_user_id = token_utils.get_user_id_from_token(token)
    reservation = service.create_reservation(db, institution_id, request, current_user_id)
    return dto_out.GetReservation(reservation=reservation)


@router.post("/institutions/{institution_id}/reservations/check-conflict",
             status_code=status.HTTP_200_OK,
             response_model=dto_out.CheckReservationConflictResponse)
async def check_reservation_conflict(
    db: DB, institution_id: str, request: dto_in.CheckReservationConflict, token: AUTH
):
    """Pre-submit conflict check for a proposed reservation."""
    current_user_id = token_utils.get_user_id_from_token(token)
    return service.check_conflict(db, institution_id, request, current_user_id)


@router.post("/reservations/{reservation_id}/approve",
             status_code=status.HTTP_200_OK,
             response_model=dto_out.GetReservation)
async def approve_reservation(db: DB, reservation_id: str, token: AUTH):
    """Approve a pending reservation (admin only)."""
    current_user_id = token_utils.get_user_id_from_token(token)
    reservation = service.approve_reservation(db, reservation_id, current_user_id)
    return dto_out.GetReservation(reservation=reservation)


@router.post("/reservations/{reservation_id}/refuse",
             status_code=status.HTTP_200_OK,
             response_model=dto_out.GetReservation)
async def refuse_reservation(
    db: DB, reservation_id: str, request: dto_in.RefuseReservation, token: AUTH
):
    """Refuse a reservation with an optional reason (admin only)."""
    current_user_id = token_utils.get_user_id_from_token(token)
    reservation = service.refuse_reservation(db, reservation_id, request, current_user_id)
    return dto_out.GetReservation(reservation=reservation)


@router.delete("/reservations/{reservation_id}",
               status_code=status.HTTP_204_NO_CONTENT)
async def delete_reservation(db: DB, reservation_id: str, token: AUTH):
    """Delete a reservation (owner if pending, otherwise admin)."""
    current_user_id = token_utils.get_user_id_from_token(token)
    service.delete_reservation(db, reservation_id, current_user_id)
