from typing import List

from pydantic import BaseModel

from app.libs.db import models


class GetAllRooms(BaseModel):
    """
    DTO for retrieving all rooms
    """
    rooms: List[models.Room]


class GetRoom(BaseModel):
    """
    DTO for retrieving a room
    """
    room: models.Room
