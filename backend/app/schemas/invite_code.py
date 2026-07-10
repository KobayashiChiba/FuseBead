"""邀请码相关 schemas（管理员）"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class InviteCodeGenerate(BaseModel):
    count: int = Field(default=1, ge=1, le=20)


class InviteCodeResponse(BaseModel):
    id: int
    code: str
    created_by: str
    used_by: Optional[int] = None
    used_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
