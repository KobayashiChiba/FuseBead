"""用户相关 schemas"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserResponse(BaseModel):
    id: int
    username: str
    nickname: str
    avatar_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    nickname: Optional[str] = Field(default=None, min_length=1, max_length=64)
    avatar_url: Optional[str] = Field(default=None, max_length=256)
