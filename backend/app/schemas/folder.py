"""图库相关 schemas"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class FolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)


class FolderUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=128)
    is_public: Optional[bool] = None
    sort_order: Optional[int] = None


class FolderResponse(BaseModel):
    id: int
    name: str
    is_public: bool
    is_default: bool
    sort_order: int
    project_count: int = 0

    model_config = {"from_attributes": True}
