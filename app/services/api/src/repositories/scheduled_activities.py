from typing import List

from pymongo.synchronous.database import Database

from app.libs.db import models


def find_all_scheduled_activities(db: Database):
    collection = db.get_collection(models.ScheduledActivity.COLLECTION_NAME)
    return collection.find({}).to_list()


def find_scheduled_activity_by_id(db: Database, scheduled_activity_id: str):
    collection = db.get_collection(models.ScheduledActivity.COLLECTION_NAME)
    return collection.find_one({"_id": scheduled_activity_id})


def insert_scheduled_activity(db: Database, scheduled_activity: models.ScheduledActivity):
    collection = db.get_collection(models.ScheduledActivity.COLLECTION_NAME)
    return collection.insert_one(scheduled_activity.model_dump(by_alias=True))


def update_scheduled_activity_by_id(db: Database, scheduled_activity_id: str, update_data: dict):
    collection = db.get_collection(models.ScheduledActivity.COLLECTION_NAME)
    return collection.update_one({"_id": scheduled_activity_id}, {"$set": update_data})


def delete_scheduled_activity_by_id(db: Database, scheduled_activity_id: str):
    collection = db.get_collection(models.ScheduledActivity.COLLECTION_NAME)
    return collection.delete_one({"_id": scheduled_activity_id})


def find_scheduled_activities_by_institution_id(db: Database, institution_id: str):
    collection = db.get_collection(models.ScheduledActivity.COLLECTION_NAME)
    return collection.find({"institution_id": institution_id}).to_list()


def delete_scheduled_activities_by_institution_id(db: Database, institution_id: str):
    collection = db.get_collection(models.ScheduledActivity.COLLECTION_NAME)
    return collection.delete_many({"institution_id": institution_id})


def insert_many_scheduled_activities(
        db: Database,
        scheduled_activities: List[models.ScheduledActivity]
):
    collection = db.get_collection(models.ScheduledActivity.COLLECTION_NAME)
    documents = [activity.model_dump(by_alias=True) for activity in scheduled_activities]
    return collection.insert_many(documents)


def find_scheduled_activities_by_schedule_id(db: Database, schedule_id: str):
    collection = db.get_collection(models.ScheduledActivity.COLLECTION_NAME)
    return collection.find({"schedule_id": schedule_id}).to_list()
