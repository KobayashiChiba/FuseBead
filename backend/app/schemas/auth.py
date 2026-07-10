"""认证相关 schemas"""
from __future__ import annotations

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=2, max_length=64)
    password: str = Field(min_length=6, max_length=128)
    nickname: str = Field(min_length=1, max_length=64)
    invite_code: str = Field(min_length=8, max_length=8)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"  # noqa: F821  # 延迟引用，运行时解析


class ResetPasswordRequest(BaseModel):
    username: str
    new_password: str = Field(min_length=6, max_length=128)
    verify_code: str


# 延迟导入避免循环引用
from .user import UserResponse  # noqa: E402, F811
TokenResponse.model_rebuild()
