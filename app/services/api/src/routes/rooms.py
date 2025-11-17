from starlette import status
from fastapi import APIRouter

from app.libs.db.db import DB
from app.services.api.src.auth import token_utils
from app.services.api.src.auth.token_utils import AUTH
from app.services.api.src.services import rooms as service
from app.services.api.src.dtos.input import room as dto_in
from app.services.api.src.dtos.output import room as dto_out


router = APIRouter(prefix="/api/v1/rooms", tags=["rooms"])


@router.get("/",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetAllRooms)
async def get_rooms(db: DB, token: AUTH):
    """Get all rooms"""
    current_user_id = token_utils.get_user_id_from_token(token)
    rooms = service.get_rooms(db, current_user_id)
    return dto_out.GetAllRooms(rooms=rooms)


@router.get("/{room_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetRoom)
async def get_room_by_id(db: DB, room_id: str, token: AUTH):
    """Get room by ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    room = service.get_room_by_id(db, room_id, current_user_id)
    return dto_out.GetRoom(room=room)


@router.post("/",
             status_code=status.HTTP_201_CREATED,
             response_model=dto_out.GetRoom)
async def create_room(db: DB, request: dto_in.CreateRoom, token: AUTH):
    """Create a new room"""
    current_user_id = token_utils.get_user_id_from_token(token)
    room = service.create_room(db, request, current_user_id)
    return dto_out.GetRoom(room=room)


@router.delete("/{room_id}",
               status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(db: DB, room_id: str, token: AUTH):
    """Delete a room by ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    service.delete_room(db, room_id, current_user_id)


@router.put("/{room_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetRoom)
async def update_room(db: DB, room_id: str, request: dto_in.UpdateRoom, token: AUTH):
    """Update a room by ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    room = service.update_room(db, room_id, request, current_user_id)
    return dto_out.GetRoom(room=room)
