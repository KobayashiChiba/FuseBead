"""用户路由 — 个人信息"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.user import User
from ..schemas.user import UserResponse, UserUpdateRequest
from .auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.patch("/me", response_model=UserResponse)
def update_me(
    body: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """更新当前用户信息"""
    if body.nickname is not None:
        current_user.nickname = body.nickname
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)
