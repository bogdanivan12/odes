from pymongo import ReturnDocument
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


def update_institution_by_id(db: Database, institution_id: str, update_data: dict):
    collection = db.get_collection(models.Institution.COLLECTION_NAME)
    return collection.update_one({"_id": institution_id}, {"$set": update_data})


def delete_institution_by_id(db: Database, institution_id: str):
    collection = db.get_collection(models.Institution.COLLECTION_NAME)
    return collection.delete_one({"_id": institution_id})


def get_next_schedule_number(db: Database, institution_id: str) -> int:
    """Atomically allocate the next monotonically-increasing schedule
    number for an institution.

    Strategy:
      1. If ``last_schedule_number`` is missing/0, *and* the institution
         already has schedules (legacy data), initialise it to the existing
         count so the new counter doesn't reuse old indices.  Done with a
         conditional update so it's idempotent under races.
      2. Atomically ``$inc`` the field and return the new value via
         ``find_one_and_update`` with ``ReturnDocument.AFTER``.  ``$inc``
         on a missing field creates it set to the increment value, so this
         works on institutions that pre-date the field.
    """
    inst_coll = db.get_collection(models.Institution.COLLECTION_NAME)
    sched_coll = db.get_collection(models.Schedule.COLLECTION_NAME)

    # Step 1: backfill (one-time, only if counter is missing/0 AND legacy
    # schedules exist).  The match clause makes this safe under concurrent
    # callers — only one will succeed in setting the initial value.
    existing_count = sched_coll.count_documents({"institution_id": institution_id})
    if existing_count > 0:
        inst_coll.update_one(
            {
                "_id": institution_id,
                "$or": [
                    {"last_schedule_number": {"$exists": False}},
                    {"last_schedule_number": 0},
                ],
            },
            {"$set": {"last_schedule_number": existing_count}},
        )

    # Step 2: atomic increment + read.
    result = inst_coll.find_one_and_update(
        {"_id": institution_id},
        {"$inc": {"last_schedule_number": 1}},
        return_document=ReturnDocument.AFTER,
    )
    if result is None:
        raise ValueError(f"Institution {institution_id} not found")
    return int(result["last_schedule_number"])
