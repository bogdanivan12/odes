from pymongo.synchronous.database import Database

from app.libs.db import models


def find_all_activities(db: Database):
    collection = db.get_collection(models.Activity.COLLECTION_NAME)
    return collection.find({}).to_list()


def find_activity_by_id(db: Database, activity_id: str):
    collection = db.get_collection(models.Activity.COLLECTION_NAME)
    return collection.find_one({"_id": activity_id})


def insert_activity(db: Database, activity: models.Activity):
    collection = db.get_collection(models.Activity.COLLECTION_NAME)
    return collection.insert_one(activity.model_dump(by_alias=True))


def update_activity_by_id(db: Database, activity_id: str, update_data: dict):
    collection = db.get_collection(models.Activity.COLLECTION_NAME)
    return collection.update_one({"_id": activity_id}, {"$set": update_data})


def delete_activity_by_id(db: Database, activity_id: str):
    collection = db.get_collection(models.Activity.COLLECTION_NAME)
    return collection.delete_one({"_id": activity_id})


def find_activities_by_course_id(db: Database, course_id: str):
    collection = db.get_collection(models.Activity.COLLECTION_NAME)
    return collection.find({"course_id": course_id}).to_list()


def delete_activities_by_course_id(db: Database, course_id: str):
    collection = db.get_collection(models.Activity.COLLECTION_NAME)
    return collection.delete_many({"course_id": course_id})


def find_activities_by_institution_id(db: Database, institution_id: str):
    collection = db.get_collection(models.Activity.COLLECTION_NAME)
    return collection.find({"institution_id": institution_id}).to_list()


def find_activities_by_group_id(db: Database, group_id: str):
    collection = db.get_collection(models.Activity.COLLECTION_NAME)
    return collection.find({"group_id": group_id}).to_list()


def find_activities_by_professor_id(db: Database, professor_id: str):
    collection = db.get_collection(models.Activity.COLLECTION_NAME)
    return collection.find({"professor_id": professor_id}).to_list()


def delete_activities_by_institution_id(db: Database, institution_id: str):
    collection = db.get_collection(models.Activity.COLLECTION_NAME)
    return collection.delete_many({"institution_id": institution_id})


def delete_activities_by_group_id(db: Database, group_id: str):
    collection = db.get_collection(models.Activity.COLLECTION_NAME)
    return collection.delete_many({"group_id": group_id})
