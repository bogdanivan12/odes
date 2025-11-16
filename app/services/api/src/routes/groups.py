from starlette import status
from fastapi import APIRouter

from app.libs.db.db import DB
from app.libs.auth import token_utils
from app.libs.auth.token_utils import AUTH
from app.services.api.src.services import groups as service
from app.services.api.src.dtos.input import group as dto_in
from app.services.api.src.dtos.output import group as dto_out


router = APIRouter(prefix="/api/v1/groups", tags=["groups"])


@router.get("/",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetAllGroups)
async def get_groups(db: DB, token: AUTH):
    """Get all groups"""
    current_user_id = token_utils.get_user_id_from_token(token)
    groups = service.get_groups(db, current_user_id)
    return dto_out.GetAllGroups(groups=groups)


@router.get("/{group_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetGroup)
async def get_group_by_id(db: DB, group_id: str, token: AUTH):
    """Get group by ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    group = service.get_group_by_id(db, group_id, current_user_id)
    return dto_out.GetGroup(group=group)


@router.post("/",
             status_code=status.HTTP_201_CREATED,
             response_model=dto_out.GetGroup)
async def create_group(db: DB, request: dto_in.CreateGroup, token: AUTH):
    """Create a new group"""
    current_user_id = token_utils.get_user_id_from_token(token)
    group = service.create_group(db, request, current_user_id)
    return dto_out.GetGroup(group=group)


@router.delete("/{group_id}",
               status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(db: DB, group_id: str, token: AUTH):
    """Delete an group by ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    service.delete_group(db, group_id, current_user_id)


@router.put("/{group_id}",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetGroup)
async def update_group(db: DB, group_id: str, request: dto_in.UpdateGroup, token: AUTH):
    """Update an group by ID"""
    current_user_id = token_utils.get_user_id_from_token(token)
    group = service.update_group(db, group_id, request, current_user_id)
    return dto_out.GetGroup(group=group)


@router.get("/{group_id}/activities",
            status_code=status.HTTP_200_OK,
            response_model=dto_out.GetGroupActivities)
async def get_group_activities(db: DB, group_id: str, token: AUTH):
    """Get all activities for a specific group"""
    current_user_id = token_utils.get_user_id_from_token(token)
    activities = service.get_group_activities(db, group_id, current_user_id)
    return dto_out.GetGroupActivities(activities=activities)
