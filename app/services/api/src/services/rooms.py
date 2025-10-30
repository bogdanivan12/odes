from typing import List

from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.services.api.src.dtos.input import room as dto_in
from app.services.api.src.repositories import (
    rooms as rooms_repo,
    institutions as institutions_repo
)


def get_rooms(db: Database) -> List[models.Room]:
    """
    Get all rooms

    Args:
        db: Database dependency

    Returns:
        GetAllRooms: List of rooms

    Raises:
        HTTPException: If there is an error retrieving rooms
    """
    try:
        rooms_data = rooms_repo.find_all_rooms(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving rooms: {str(e)}"
        )

    rooms = [models.Room(**room) for room in rooms_data]

    return rooms


def get_room_by_id(db: Database, room_id: str) -> models.Room:
    """
    Get room by ID

    Args:
        db: Database dependency
        room_id: ID of the room

    Returns:
        GetRoomById: Room data

    Raises:
        HTTPException: If there is an error retrieving the room or if not found
    """
    try:
        room_data = rooms_repo.find_room_by_id(db, room_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving room with id {room_id}: {str(e)}"
        )

    if not room_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with id {room_id} not found"
        )

    room = models.Room(**room_data)
    return room


def create_room(db: Database, request: dto_in.CreateRoom) -> models.Room:
    """
    Create a new room

    Args:
        db: Database dependency
        request: CreateRoom request data

    Returns:
        GetRoom: Created room data

    Raises:
        HTTPException: If there is an error creating the room
    """
    institution = institutions_repo.find_institution_by_id(db, request.institution_id)
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {request.institution_id} not found."
        )

    room = models.Room(**request.model_dump())

    try:
        rooms_repo.insert_room(db, room)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error creating room: {str(e)}"
        )

    return room


def delete_room(db: Database, room_id: str) -> None:
    """
    Delete a room by ID

    Args:
        db: Database dependency
        room_id: ID of the room to delete

    Raises:
        HTTPException: If there is an error deleting the room or if not found
    """
    try:
        result = rooms_repo.delete_room_by_id(db, room_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting room with id {room_id}: {str(e)}"
        )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with id {room_id} not found"
        )


def update_room(db: Database, room_id: str, room_request: dto_in.UpdateRoom) -> models.Room:
    """
    Update an existing room

    Args:
        db: Database dependency
        room_id: ID of the room to update
        room_request: UpdateRoom DTO

    Returns:
        GetRoom: Updated room data

    Raises:
        HTTPException: If there is an error updating the room or if not found
    """
    room_dict = room_request.model_dump(exclude_unset=True)

    try:
        result = rooms_repo.update_room_by_id(db, room_id, room_dict)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating room with id {room_id}: {str(e)}"
        )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with id {room_id} not found"
        )

    updated_room = get_room_by_id(db, room_id)
    return updated_room
