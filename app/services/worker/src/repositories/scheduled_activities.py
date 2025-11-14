from typing import List

from pymongo.synchronous.database import Database

from app.libs.db import models


def insert_scheduled_activities(
        db: Database,
        scheduled_activities: List[models.ScheduledActivity]
):
    collection = db.get_collection(models.ScheduledActivity.COLLECTION_NAME)
    documents = [activity.model_dump(by_alias=True) for activity in scheduled_activities]
    return collection.insert_many(documents)
