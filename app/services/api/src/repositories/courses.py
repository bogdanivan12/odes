from pymongo.synchronous.database import Database

from app.libs.db import models


def find_all_courses(db: Database):
    collection = db.get_collection(models.Course.COLLECTION_NAME)
    return collection.find({}).to_list()


def find_course_by_id(db: Database, course_id: str):
    collection = db.get_collection(models.Course.COLLECTION_NAME)
    return collection.find_one({"_id": course_id})


def insert_course(db: Database, course: models.Course):
    collection = db.get_collection(models.Course.COLLECTION_NAME)
    return collection.insert_one(course.model_dump(by_alias=True))


def update_course_by_id(db: Database, course_id: str, update_data: dict):
    collection = db.get_collection(models.Course.COLLECTION_NAME)
    return collection.update_one({"_id": course_id}, {"$set": update_data})


def delete_course_by_id(db: Database, course_id: str):
    collection = db.get_collection(models.Course.COLLECTION_NAME)
    return collection.delete_one({"_id": course_id})


def find_courses_by_institution_id(db: Database, institution_id: str):
    collection = db.get_collection(models.Course.COLLECTION_NAME)
    return collection.find({"institution_id": institution_id}).to_list()


def delete_courses_by_institution_id(db: Database, institution_id: str):
    collection = db.get_collection(models.Course.COLLECTION_NAME)
    return collection.delete_many({"institution_id": institution_id})
