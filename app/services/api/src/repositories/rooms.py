from pymongo.synchronous.database import Database

from app.libs.db import models


def find_all_rooms(db: Database):
    collection = db.get_collection(models.Room.COLLECTION_NAME)
    return collection.find({}).to_list()


def find_room_by_id(db: Database, room_id: str):
    collection = db.get_collection(models.Room.COLLECTION_NAME)
    return collection.find_one({"_id": room_id})


def insert_room(db: Database, room: models.Room):
    collection = db.get_collection(models.Room.COLLECTION_NAME)
    return collection.insert_one(room.model_dump(by_alias=True))


def update_room_by_id(db: Database, room_id: str, update_data: dict):
    collection = db.get_collection(models.Room.COLLECTION_NAME)
    return collection.update_one({"_id": room_id}, {"$set": update_data})


def delete_room_by_id(db: Database, room_id: str):
    collection = db.get_collection(models.Room.COLLECTION_NAME)
    return collection.delete_one({"_id": room_id})


def find_rooms_by_institution_id(db: Database, institution_id: str):
    collection = db.get_collection(models.Room.COLLECTION_NAME)
    return collection.find({"institution_id": institution_id}).to_list()
