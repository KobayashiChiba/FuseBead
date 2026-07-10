"""认证路由 — 注册 / 登录 / 重置密码"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)
from ..models.user import User
from ..models.invite_code import InviteCode
from ..models.folder import Folder
from ..schemas.auth import RegisterRequest, LoginRequest, TokenResponse, ResetPasswordRequest
from ..schemas.user import UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── 依赖注入 ──

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """从 Authorization: Bearer <token> 解析当前用户"""
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效或过期的令牌")
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="令牌格式错误")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在或已禁用")
    return user


# ── 端点 ──

@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """注册新用户"""
    # 校验邀请码
    invite = db.query(InviteCode).filter(
        InviteCode.code == body.invite_code,
        InviteCode.used_by.is_(None),
    ).first()
    if not invite:
        raise HTTPException(status_code=400, detail="邀请码无效或已被使用")

    # 检查用户名唯一
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="用户名已被占用")

    # 创建用户
    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        nickname=body.nickname,
        invite_code_id=invite.id,
    )
    db.add(user)
    db.flush()  # 获取 user.id

    # 标记邀请码已使用
    invite.used_by = user.id
    from datetime import datetime, timezone
    invite.used_at = datetime.now(timezone.utc)

    # 创建默认图库
    default_folder = Folder(
        user_id=user.id,
        name="我的图库",
        is_default=True,
    )
    db.add(default_folder)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """登录"""
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已被禁用")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """重置密码（验证码由管理员线下提供）"""
    # TODO: 验证码校验逻辑 — 当前暂存为简单实现，后续可扩展
    # 目前：verify_code 固定为 "admin" 时允许重置（仅开发用）
    if body.verify_code != "admin":
        raise HTTPException(status_code=400, detail="验证码错误")

    user = db.query(User).filter(User.username == body.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "密码已重置"}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """返回当前登录用户信息"""
    return UserResponse.model_validate(current_user)
