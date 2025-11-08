from pymongo.synchronous.database import Database

from app.libs.db import models


def find_all_schedules(db: Database):
    collection = db.get_collection(models.Schedule.COLLECTION_NAME)
    return collection.find({}).to_list()


def find_schedule_by_id(db: Database, schedule_id: str):
    collection = db.get_collection(models.Schedule.COLLECTION_NAME)
    return collection.find_one({"_id": schedule_id})


def insert_schedule(db: Database, schedule: models.Schedule):
    collection = db.get_collection(models.Schedule.COLLECTION_NAME)
    return collection.insert_one(schedule.model_dump(by_alias=True))


def update_schedule_by_id(db: Database, schedule_id: str, update_data: dict):
    collection = db.get_collection(models.Schedule.COLLECTION_NAME)
    return collection.update_one({"_id": schedule_id}, {"$set": update_data})


def delete_schedule_by_id(db: Database, schedule_id: str):
    collection = db.get_collection(models.Schedule.COLLECTION_NAME)
    return collection.delete_one({"_id": schedule_id})


def find_schedules_by_institution_id(db: Database, institution_id: str):
    collection = db.get_collection(models.Schedule.COLLECTION_NAME)
    return collection.find({"institution_id": institution_id}).to_list()


def delete_schedules_by_institution_id(db: Database, institution_id: str):
    collection = db.get_collection(models.Schedule.COLLECTION_NAME)
    return collection.delete_many({"institution_id": institution_id})
