from starlette import status
from fastapi import APIRouter

from app.libs.db.db import DB
from app.services.api.src.services import rooms as service
from app.services.api.src.dtos.input import room as dto_in
from app.services.api.src.dtos.output import room as dto_out


router = APIRouter(prefix="/api/v1/rooms", tags=["rooms"])


@router.get("/",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetAllRooms)
async def get_rooms(db: DB):
    """Get all rooms"""
    rooms = service.get_rooms(db)
    return dto_out.GetAllRooms(rooms=rooms)


@router.get("/{room_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetRoom)
async def get_room_by_id(db: DB, room_id: str):
    """Get room by ID"""
    room = service.get_room_by_id(db, room_id)
    return dto_out.GetRoom(room=room)


@router.post("/",
             status_code=status.HTTP_201_CREATED,
             response_model=dto_out.GetRoom)
async def create_room(db: DB, request: dto_in.CreateRoom):
    """Create a new room"""
    room = service.create_room(db, request)
    return dto_out.GetRoom(room=room)


@router.delete("/{room_id}",
               status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(db: DB, room_id: str):
    """Delete a room by ID"""
    service.delete_room(db, room_id)


@router.put("/{room_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetRoom)
async def update_room(db: DB, room_id: str, request: dto_in.UpdateRoom):
    """Update a room by ID"""
    room = service.update_room(db, room_id, request)
    return dto_out.GetRoom(room=room)
