from pymongo.synchronous.database import Database

from app.libs.db import models


def find_all_institutions(db: Database):
    collection = db.get_collection(models.Institution.COLLECTION_NAME)
    return collection.find({}).to_list()


def find_institution_by_id(db: Database, institution_id: str):
    collection = db.get_collection(models.Institution.COLLECTION_NAME)
    return collection.find_one({"_id": institution_id})


def insert_institution(db: Database, institution: models.Institution):
    collection = db.get_collection(models.Institution.COLLECTION_NAME)
    return collection.insert_one(institution.model_dump(by_alias=True))


def update_institution(db: Database, institution_id: str, update_data: dict):
    collection = db.get_collection(models.Institution.COLLECTION_NAME)
    return collection.update_one({"_id": institution_id}, {"$set": update_data})


def delete_institution(db: Database, institution_id: str):
    collection = db.get_collection(models.Institution.COLLECTION_NAME)
    return collection.delete_one({"_id": institution_id})
