from starlette import status
from fastapi import APIRouter

from app.libs.db.db import DB
from app.services.api.src.institutions import service, dto_in, dto_out


router = APIRouter(prefix="/api/v1/institutions", tags=["institutions"])


@router.get("/",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetAllInstitutions)
async def get_institutions(db: DB):
    return service.get_institutions(db)


@router.get("/{institution_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitutionById)
async def get_institution_by_id(db: DB, institution_id: str):
    return service.get_institution_by_id(db, institution_id)


@router.post("/",
             status_code=status.HTTP_201_CREATED,
             response_model=dto_out.GetInstitutionById)
async def create_institution(db: DB, request: dto_in.CreateInstitution):
    return service.create_institution(db, request)


@router.delete("/{institution_id}",
               status_code=status.HTTP_204_NO_CONTENT)
async def delete_institution(db: DB, institution_id: str):
    return service.delete_institution(db, institution_id)


@router.put("/{institution_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitutionById)
async def update_institution(db: DB, institution_id: str, request: dto_in.UpdateInstitution):
    return service.update_institution(db, institution_id, request)
