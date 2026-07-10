"""管理员路由 — 邀请码管理 + 重置码管理"""
import secrets
import string
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.user import User
from ..models.invite_code import InviteCode
from ..schemas.invite_code import InviteCodeResponse, InviteCodeGenerate
from .auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _check_admin(user: User):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")


def _random_code(length: int = 8) -> str:
    return "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(length))


@router.get("/invite-codes", response_model=list[InviteCodeResponse])
def list_codes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """邀请码列表"""
    _check_admin(current_user)
    codes = db.query(InviteCode).order_by(InviteCode.created_at.desc()).all()
    return [InviteCodeResponse.model_validate(c) for c in codes]


@router.post("/invite-codes", response_model=list[InviteCodeResponse], status_code=201)
def generate_codes(
    body: InviteCodeGenerate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """生成邀请码"""
    _check_admin(current_user)
    codes = []
    for _ in range(body.count):
        code = InviteCode(code=_random_code(), created_by=current_user.username)
        db.add(code)
        db.flush()
        codes.append(code)
    db.commit()
    return [InviteCodeResponse.model_validate(c) for c in codes]


# ── 重置码 ──

class ResetCodeRequest(BaseModel):
    username: str = Field(min_length=2, max_length=64)

class ResetCodeResponse(BaseModel):
    username: str
    reset_code: str
    expires_at: datetime


@router.post("/reset-codes", response_model=ResetCodeResponse)
def generate_reset_code(
    body: ResetCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """为指定用户生成密码重置码（10 分钟有效，一次性使用）"""
    _check_admin(current_user)

    user = db.query(User).filter(User.username == body.username, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    code = _random_code(6)
    expires = datetime.utcnow() + timedelta(minutes=10)
    user.reset_code = code
    user.reset_code_expires = expires
    db.commit()

    return ResetCodeResponse(username=user.username, reset_code=code, expires_at=expires)
