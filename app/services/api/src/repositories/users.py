from pymongo.synchronous.database import Database

from app.libs.db import models


def find_all_users(db: Database):
    collection = db.get_collection(models.User.COLLECTION_NAME)
    return collection.find({}).to_list()


def find_user_by_id(db: Database, user_id: str):
    collection = db.get_collection(models.User.COLLECTION_NAME)
    return collection.find_one({"_id": user_id})


def insert_user(db: Database, user: models.User):
    collection = db.get_collection(models.User.COLLECTION_NAME)
    # ensure hashed_password is included
    data = user.model_dump(by_alias=True)
    if user.hashed_password is not None:
        data["hashed_password"] = user.hashed_password
    return collection.insert_one(data)


def update_user_by_id(db: Database, user_id: str, update_data: dict):
    collection = db.get_collection(models.User.COLLECTION_NAME)
    return collection.update_one({"_id": user_id}, {"$set": update_data})


def unset_user_field_by_id(db: Database, user_id: str, field: str):
    collection = db.get_collection(models.User.COLLECTION_NAME)
    return collection.update_one({"_id": user_id}, {"$unset": {field: ""}})


def delete_user_by_id(db: Database, user_id: str):
    collection = db.get_collection(models.User.COLLECTION_NAME)
    return collection.delete_one({"_id": user_id})


def find_user_by_email(db: Database, email: str):
    collection = db.get_collection(models.User.COLLECTION_NAME)
    return collection.find_one({"email": email})


def find_users_by_institution_id(db: Database, institution_id: str):
    collection = db.get_collection(models.User.COLLECTION_NAME)
    return collection.find({f"user_roles.{institution_id}": {"$exists": True}}).to_list()


def find_professors_by_institution_id(db: Database, institution_id: str):
    collection = db.get_collection(models.User.COLLECTION_NAME)
    return collection.find({f"user_roles.{institution_id}": models.UserRole.PROFESSOR}).to_list()


def find_students_by_group_id(db: Database, group_id: str, institution_id: str):
    """Users who are members of ``group_id`` AND are flagged STUDENT in
    ``institution_id``.  Used by the group page to render its student
    roster (we deliberately exclude professors/admins of the institution
    who might also have the group in their group_ids — only students are
    "members" of a group in the academic sense)."""
    collection = db.get_collection(models.User.COLLECTION_NAME)
    return collection.find({
        "group_ids": group_id,
        f"user_roles.{institution_id}": models.UserRole.STUDENT,
    }).to_list()


def add_group_to_user_by_id(db: Database, user_id: str, group_id: str):
    """Atomically add ``group_id`` to a user's ``group_ids``.  Uses
    ``$addToSet`` so duplicates are a no-op."""
    collection = db.get_collection(models.User.COLLECTION_NAME)
    return collection.update_one(
        {"_id": user_id},
        {"$addToSet": {"group_ids": group_id}},
    )


def remove_group_from_user_by_id(db: Database, user_id: str, group_id: str):
    """Atomically remove ``group_id`` from a user's ``group_ids``."""
    collection = db.get_collection(models.User.COLLECTION_NAME)
    return collection.update_one(
        {"_id": user_id},
        {"$pull": {"group_ids": group_id}},
    )
