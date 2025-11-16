from starlette import status
from fastapi import APIRouter

from app.libs.db.db import DB
from app.libs.db import models
from app.libs.auth import token_utils
from app.libs.auth.token_utils import AUTH
from app.services.api.src.services import institutions as service
from app.services.api.src.dtos.input import institution as dto_in
from app.services.api.src.dtos.output import institution as dto_out


router = APIRouter(prefix="/api/v1/institutions", tags=["institutions"])


@router.get("/",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetAllInstitutions)
async def get_institutions(db: DB, token: AUTH):
    """Get all institutions"""
    current_user_id = token_utils.get_user_id_from_token(token)
    institutions = service.get_institutions(db, current_user_id)
    return dto_out.GetAllInstitutions(institutions=institutions)


@router.get("/{institution_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitution)
async def get_institution_by_id(db: DB, institution_id: str, token: AUTH):
    """Get institution by ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    institution = service.get_institution_by_id(db, institution_id, current_user_id)
    return dto_out.GetInstitution(institution=institution)


@router.post("/",
             status_code=status.HTTP_201_CREATED,
             response_model=dto_out.GetInstitution)
async def create_institution(db: DB, request: dto_in.CreateInstitution, token: AUTH):
    """Create a new institution"""
    current_user_id = token_utils.get_user_id_from_token(token)
    institution = service.create_institution(db, request, current_user_id)
    return dto_out.GetInstitution(institution=institution)


@router.delete("/{institution_id}",
               status_code=status.HTTP_204_NO_CONTENT)
async def delete_institution(db: DB, institution_id: str, token: AUTH):
    """Delete an institution by ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    service.delete_institution(db, institution_id, current_user_id)


@router.put("/{institution_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitution)
async def update_institution(
        db: DB,
        institution_id: str,
        request: dto_in.UpdateInstitution,
        token: AUTH
):
    """Update an institution by ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    institution = service.update_institution(db, institution_id, request, current_user_id)
    return dto_out.GetInstitution(institution=institution)


@router.get("/{institution_id}/courses",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitutionCourses)
async def get_institution_courses(db: DB, institution_id: str, token: AUTH):
    """Get all courses for a specific institution"""
    current_user_id = token_utils.get_user_id_from_token(token)
    courses = service.get_institution_courses(db, institution_id, current_user_id)
    return dto_out.GetInstitutionCourses(courses=courses)


@router.get("/{institution_id}/rooms",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitutionRooms)
async def get_institution_rooms(db: DB, institution_id: str, token: AUTH):
    """Get all rooms for a specific institution"""
    current_user_id = token_utils.get_user_id_from_token(token)
    rooms = service.get_institution_rooms(db, institution_id, current_user_id)
    return dto_out.GetInstitutionRooms(rooms=rooms)


@router.get("/{institution_id}/groups",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitutionGroups)
async def get_institution_groups(db: DB, institution_id: str, token: AUTH):
    """Get all groups for a specific institution"""
    current_user_id = token_utils.get_user_id_from_token(token)
    groups = service.get_institution_groups(db, institution_id, current_user_id)
    return dto_out.GetInstitutionGroups(groups=groups)


@router.get("/{institution_id}/users",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitutionUsers)
async def get_institution_users(db: DB, institution_id: str, token: AUTH):
    """Get all users for a specific institution"""
    current_user_id = token_utils.get_user_id_from_token(token)
    users = service.get_institution_users(db, institution_id, current_user_id)
    return dto_out.GetInstitutionUsers(users=users)


@router.get("/{institution_id}/activities",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitutionActivities)
async def get_institution_activities(db: DB, institution_id: str, token: AUTH):
    """Get all activities for a specific institution"""
    current_user_id = token_utils.get_user_id_from_token(token)
    activities = service.get_institution_activities(db, institution_id, current_user_id)
    return dto_out.GetInstitutionActivities(activities=activities)


@router.get("/{institution_id}/schedules",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetInstitutionSchedules)
async def get_institution_schedules(db: DB, institution_id: str, token: AUTH):
    """Get all schedules for a specific institution"""
    current_user_id = token_utils.get_user_id_from_token(token)
    schedules = service.get_institution_schedules(db, institution_id, current_user_id)
    return dto_out.GetInstitutionSchedules(schedules=schedules)


@router.post("/{institution_id}/users/{user_id}/roles/{role}",
             status_code=status.HTTP_204_NO_CONTENT)
async def assign_role_to_user(
        db: DB,
        user_id: str,
        institution_id: str,
        role: models.UserRole,
        token: AUTH
):
    """Assign a role to a user for a specific institution"""
    current_user = token_utils.get_user_id_from_token(token)
    service.assign_role_to_user(db, user_id, institution_id, role, current_user)


@router.delete("/{institution_id}/users/{user_id}/roles/{role}",
               status_code=status.HTTP_204_NO_CONTENT)
async def remove_role_from_user(
        db: DB,
        user_id: str,
        institution_id: str,
        role: models.UserRole,
        token: AUTH
):
    """Remove a role from a user for a specific institution"""
    current_user = token_utils.get_user_id_from_token(token)
    service.remove_role_from_user(db, user_id, institution_id, role, current_user)


@router.delete("/{institution_id}/users/{user_id}",
               status_code=status.HTTP_204_NO_CONTENT)
async def remove_user_from_institution(
        db: DB,
        user_id: str,
        institution_id: str,
        token: AUTH
):
    """Remove all roles from a user for a specific institution"""
    current_user = token_utils.get_user_id_from_token(token)
    service.remove_user_from_institution(db, user_id, institution_id, current_user)
