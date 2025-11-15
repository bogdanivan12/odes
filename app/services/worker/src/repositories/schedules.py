from pymongo.synchronous.database import Database

from app.libs.db import models


def update_schedule_by_id(db: Database, schedule_id: str, update_data: dict):
    collection = db.get_collection(models.Schedule.COLLECTION_NAME)
    return collection.update_one({"_id": schedule_id}, {"$set": update_data})
