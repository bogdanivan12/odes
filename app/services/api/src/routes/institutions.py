from starlette import status
from fastapi import APIRouter

from app.libs.db.db import DB
from app.services.api.src.services import institutions as service
from app.services.api.src.dtos.input import institution as dto_in
from app.services.api.src.dtos.output import institution as dto_out


router = APIRouter(prefix="/api/v1/institutions", tags=["institutions"])


@router.get("/",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetAllInstitutions)
async def get_institutions(db: DB):
    """Get all institutions"""
    institutions = service.get_institutions(db)
    return dto_out.GetAllInstitutions(institutions=institutions)


@router.get("/{institution_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitution)
async def get_institution_by_id(db: DB, institution_id: str):
    """Get institution by ID"""
    institution = service.get_institution_by_id(db, institution_id)
    return dto_out.GetInstitution(institution=institution)


@router.post("/",
             status_code=status.HTTP_201_CREATED,
             response_model=dto_out.GetInstitution)
async def create_institution(db: DB, request: dto_in.CreateInstitution):
    """Create a new institution"""
    institution = service.create_institution(db, request)
    return dto_out.GetInstitution(institution=institution)


@router.delete("/{institution_id}",
               status_code=status.HTTP_204_NO_CONTENT)
async def delete_institution(db: DB, institution_id: str):
    """Delete an institution by ID"""
    service.delete_institution(db, institution_id)


@router.put("/{institution_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitution)
async def update_institution(db: DB, institution_id: str, request: dto_in.UpdateInstitution):
    """Update an institution by ID"""
    institution = service.update_institution(db, institution_id, request)
    return dto_out.GetInstitution(institution=institution)


@router.get("/{institution_id}/courses",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitutionCourses)
async def get_institution_courses(db: DB, institution_id: str):
    """Get all courses for a specific institution"""
    courses = service.get_institution_courses(db, institution_id)
    return dto_out.GetInstitutionCourses(courses=courses)


@router.get("/{institution_id}/rooms",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitutionRooms)
async def get_institution_rooms(db: DB, institution_id: str):
    """Get all rooms for a specific institution"""
    rooms = service.get_institution_rooms(db, institution_id)
    return dto_out.GetInstitutionRooms(rooms=rooms)


@router.get("/{institution_id}/groups",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitutionGroups)
async def get_institution_groups(db: DB, institution_id: str):
    """Get all groups for a specific institution"""
    groups = service.get_institution_groups(db, institution_id)
    return dto_out.GetInstitutionGroups(groups=groups)


@router.get("/{institution_id}/users",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitutionUsers)
async def get_institution_users(db: DB, institution_id: str):
    """Get all users for a specific institution"""
    users = service.get_institution_users(db, institution_id)
    return dto_out.GetInstitutionUsers(users=users)


@router.get("/{institution_id}/activities",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitutionActivities)
async def get_institution_activities(db: DB, institution_id: str):
    """Get all activities for a specific institution"""
    activities = service.get_institution_activities(db, institution_id)
    return dto_out.GetInstitutionActivities(activities=activities)


@router.get("/{institution_id}/schedules",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitutionSchedules)
async def get_institution_schedules(db: DB, institution_id: str):
    """Get all schedules for a specific institution"""
    schedules = service.get_institution_schedules(db, institution_id)
    return dto_out.GetInstitutionSchedules(schedules=schedules)
