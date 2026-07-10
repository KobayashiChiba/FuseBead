"""
安全工具 — JWT 令牌 + bcrypt 密码哈希
"""
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from .config import settings

# ── 密码哈希 ──
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """明文密码 → bcrypt 哈希"""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """验证明文密码是否匹配哈希"""
    return pwd_context.verify(plain, hashed)


# ── JWT ──
def create_access_token(data: dict) -> str:
    """生成 JWT access token，默认 30 天有效期"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """解码 JWT token，失败返回 None"""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.PyJWTError:
        return None
