from pymongo.synchronous.database import Database

from app.libs.db import models


def insert_reservation(db: Database, reservation: models.Reservation):
    collection = db.get_collection(models.Reservation.COLLECTION_NAME)
    return collection.insert_one(reservation.model_dump(by_alias=True))


def find_reservation_by_id(db: Database, reservation_id: str):
    collection = db.get_collection(models.Reservation.COLLECTION_NAME)
    return collection.find_one({"_id": reservation_id})


def find_reservations_by_institution_id(db: Database, institution_id: str):
    collection = db.get_collection(models.Reservation.COLLECTION_NAME)
    return collection.find({"institution_id": institution_id}).to_list()


def find_approved_reservations_for_room_on_date(
    db: Database, room_id: str, date: str, exclude_id: str | None = None
):
    collection = db.get_collection(models.Reservation.COLLECTION_NAME)
    query: dict = {
        "room_id": room_id,
        "date": date,
        "status": models.ReservationStatus.APPROVED.value,
    }
    if exclude_id:
        query["_id"] = {"$ne": exclude_id}
    return collection.find(query).to_list()


def update_reservation_by_id(db: Database, reservation_id: str, update_data: dict):
    collection = db.get_collection(models.Reservation.COLLECTION_NAME)
    return collection.update_one({"_id": reservation_id}, {"$set": update_data})


def delete_reservation_by_id(db: Database, reservation_id: str):
    collection = db.get_collection(models.Reservation.COLLECTION_NAME)
    return collection.delete_one({"_id": reservation_id})


def delete_reservations_by_institution_id(db: Database, institution_id: str):
    collection = db.get_collection(models.Reservation.COLLECTION_NAME)
    return collection.delete_many({"institution_id": institution_id})
