from pymongo.synchronous.database import Database

from app.libs.db import models


def find_all_groups(db: Database):
    collection = db.get_collection(models.Group.COLLECTION_NAME)
    return collection.find({}).to_list()


def find_group_by_id(db: Database, group_id: str):
    collection = db.get_collection(models.Group.COLLECTION_NAME)
    return collection.find_one({"_id": group_id})


def insert_group(db: Database, group: models.Group):
    collection = db.get_collection(models.Group.COLLECTION_NAME)
    return collection.insert_one(group.model_dump(by_alias=True))


def update_group_by_id(db: Database, group_id: str, update_data: dict):
    collection = db.get_collection(models.Group.COLLECTION_NAME)
    return collection.update_one({"_id": group_id}, {"$set": update_data})


def delete_group_by_id(db: Database, group_id: str):
    collection = db.get_collection(models.Group.COLLECTION_NAME)
    return collection.delete_one({"_id": group_id})


def find_groups_by_institution_id(db: Database, institution_id: str):
    collection = db.get_collection(models.Group.COLLECTION_NAME)
    return collection.find({"institution_id": institution_id}).to_list()


def find_groups_by_parent_group_id(db: Database, parent_group_id: str):
    collection = db.get_collection(models.Group.COLLECTION_NAME)
    return collection.find({"parent_group_id": parent_group_id}).to_list()


def update_groups_by_parent_group_id(db: Database, parent_group_id: str, update_data: dict):
    collection = db.get_collection(models.Group.COLLECTION_NAME)
    return collection.update_many({"parent_group_id": parent_group_id}, {"$set": update_data})


def delete_groups_by_institution_id(db: Database, institution_id: str):
    collection = db.get_collection(models.Group.COLLECTION_NAME)
    return collection.delete_many({"institution_id": institution_id})
