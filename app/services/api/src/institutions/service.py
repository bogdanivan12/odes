from starlette import status
from fastapi.exceptions import HTTPException
from pymongo.synchronous.database import Database

from app.libs.db import models
from app.services.api.src.institutions import dto_in, dto_out

COLLECTION_NAME = "institutions"


def get_institutions(db: Database) -> dto_out.GetAllInstitutions:
    collection = db.get_collection(COLLECTION_NAME)

    try:
        institutions_data = collection.find({}).to_list()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving institutions: {str(e)}"
        )

    institutions = [
        models.Institution(**institiution)
        for institiution in institutions_data
    ]

    return dto_out.GetAllInstitutions(institutions=institutions)


def get_institution_by_id(db: Database, institution_id: str) -> dto_out.GetInstitutionById:
    collection = db.get_collection(COLLECTION_NAME)

    try:
        institution_data = collection.find_one({"_id": institution_id})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error retrieving institution with id {institution_id}: {str(e)}"
        )

    if not institution_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {institution_id} not found."
        )

    institution = models.Institution(**institution_data)

    return dto_out.GetInstitutionById(institution=institution)


def create_institution(
        db: Database,
        request: dto_in.CreateInstitution
) -> dto_out.GetInstitutionById:
    collection = db.get_collection(COLLECTION_NAME)

    institution = models.Institution(**request.model_dump())

    try:
        collection.insert_one(institution.model_dump(by_alias=True))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error creating institution: {str(e)}"
        )

    return dto_out.GetInstitutionById(institution=institution)


def delete_institution(db: Database, institution_id: str) -> None:
    collection = db.get_collection(COLLECTION_NAME)

    try:
        result = collection.delete_one({"_id": institution_id})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error deleting institution with id {institution_id}: {str(e)}"
        )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {institution_id} not found."
        )


def update_institution(
        db: Database,
        institution_id: str,
        request: dto_in.UpdateInstitution
) -> dto_out.GetInstitutionById:
    collection = db.get_collection(COLLECTION_NAME)

    updated_data = request.model_dump(exclude_unset=True)

    try:
        result = collection.update_one(
            {"_id": institution_id},
            {"$set": updated_data}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Error updating institution with id {institution_id}: {str(e)}"
        )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {institution_id} not found."
        )

    updated_institution_data = collection.find_one({"_id": institution_id})
    updated_institution = models.Institution(**updated_institution_data)

    return dto_out.GetInstitutionById(institution=updated_institution)
