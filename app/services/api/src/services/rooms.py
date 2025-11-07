from typing import List

from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.libs.logging.logger import get_logger
from app.services.api.src.dtos.input import room as dto_in
from app.services.api.src.repositories import (
    rooms as rooms_repo,
    institutions as institutions_repo
)


logger = get_logger()


def get_rooms(db: Database) -> List[models.Room]:
    """Get all rooms"""
    logger.info("Fetching all rooms")
    try:
        rooms_data = rooms_repo.find_all_rooms(db)
    except Exception as e:
        logger.error(f"Failed to retrieve rooms: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving rooms: {str(e)}"
        )

    rooms = [models.Room(**room) for room in rooms_data]
    logger.info(f"Fetched {len(rooms)} rooms")

    return rooms


def get_room_by_id(db: Database, room_id: str) -> models.Room:
    """Get room by ID"""
    logger.info(f"Fetching room by id: {room_id}")
    try:
        room_data = rooms_repo.find_room_by_id(db, room_id)
    except Exception as e:
        logger.error(f"Failed to retrieve room {room_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving room with id {room_id}: {str(e)}"
        )

    if not room_data:
        logger.error(f"Room not found: {room_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with id {room_id} not found"
        )

    room = models.Room(**room_data)
    logger.info(f"Fetched room: {room.id}")
    return room


def create_room(db: Database, request: dto_in.CreateRoom) -> models.Room:
    """Create a new room"""
    logger.info(f"Creating room for institution={request.institution_id}")
    institution = institutions_repo.find_institution_by_id(db, request.institution_id)
    if not institution:
        logger.error(f"Institution not found: {request.institution_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {request.institution_id} not found."
        )

    room = models.Room(**request.model_dump())

    try:
        rooms_repo.insert_room(db, room)
    except Exception as e:
        logger.error(f"Failed to create room: {room}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error creating room: {str(e)}"
        )

    logger.info(f"Created room {room.id}")
    return room


def delete_room(db: Database, room_id: str) -> None:
    """Delete a room by ID"""
    logger.info(f"Deleting room id={room_id}")
    try:
        result = rooms_repo.delete_room_by_id(db, room_id)
    except Exception as e:
        logger.error(f"Failed to delete room {room_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting room with id {room_id}: {str(e)}"
        )

    if result.deleted_count == 0:
        logger.error(f"Room not found for deletion: {room_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with id {room_id} not found"
        )
    logger.info(f"Deleted room id={room_id}")


def update_room(db: Database, room_id: str, room_request: dto_in.UpdateRoom) -> models.Room:
    """Update an existing room"""
    room_dict = room_request.model_dump(exclude_unset=True)
    logger.info(f"Updating room id={room_id} with data={room_dict}")

    try:
        result = rooms_repo.update_room_by_id(db, room_id, room_dict)
    except Exception as e:
        logger.error(f"Failed to update room {room_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating room with id {room_id}: {str(e)}"
        )

    if result.modified_count == 0:
        logger.error(f"Room not found for update: {room_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with id {room_id} not found"
        )

    updated_room = get_room_by_id(db, room_id)
    logger.info(f"Updated room {updated_room.id}")
    return updated_room
