"""用户路由 — 个人信息 & 设置"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pathlib import Path

from ..core.database import get_db
from ..core.config import settings
from ..models.user import User
from ..models.user_settings import UserSetting
from ..schemas.user import UserResponse, UserUpdateRequest, UserSettingsResponse, UserSettingsUpdateRequest
from .auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])

ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp"}


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


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """上传头像"""
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="只支持 PNG / JPG / GIF / WebP 格式")

    # 读取内容，限制 5MB
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="头像不能超过 5MB")

    # 生成文件名
    filename = f"avatar_{uuid.uuid4().hex}{ext}"
    filepath = Path(settings.UPLOAD_DIR) / filename
    filepath.write_bytes(content)

    # 更新用户
    current_user.avatar_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.get("/me/settings", response_model=UserSettingsResponse)
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前用户设置"""
    s = db.query(UserSetting).filter(UserSetting.user_id == current_user.id).first()
    if not s:
        s = UserSetting(user_id=current_user.id)
        db.add(s)
        db.commit()
        db.refresh(s)
    return UserSettingsResponse.model_validate(s)


@router.patch("/me/settings", response_model=UserSettingsResponse)
def update_settings(
    body: UserSettingsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """更新当前用户设置"""
    s = db.query(UserSetting).filter(UserSetting.user_id == current_user.id).first()
    if not s:
        s = UserSetting(user_id=current_user.id)
        db.add(s)
    if body.default_color_card_id is not None:
        s.default_color_card_id = body.default_color_card_id
    db.commit()
    db.refresh(s)
    return UserSettingsResponse.model_validate(s)
