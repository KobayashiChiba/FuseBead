"""项目相关 schemas"""
from __future__ import annotations

from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, Field


# ── 编辑嵌套结构 ──

class GridCellUpdate(BaseModel):
    row: int
    col: int
    new_color: str = Field(min_length=1, max_length=16)


class ColorReplace(BaseModel):
    old_color: str = Field(min_length=1, max_length=16)
    new_color: str = Field(min_length=1, max_length=16)


# ── 请求体 ──

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=128)
    folder_id: Optional[int] = None
    grid_update: Optional[GridCellUpdate] = None
    color_replace: Optional[ColorReplace] = None


# ── 响应体 ──

class ProjectResponse(BaseModel):
    id: int
    name: str
    user_id: int
    folder_id: Optional[int] = None
    grid_rows: int
    grid_cols: int
    color_card_id: Optional[int] = None
    status: str
    thumbnail: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectDetailResponse(ProjectResponse):
    grid_data: list[list[str]]  # 二维色号表


class ProgressResponse(BaseModel):
    color_progress: dict[str, str] = {}  # 色号 → 状态

    model_config = {"from_attributes": True}


class ProgressUpdate(BaseModel):
    color_progress: dict[str, str] = {}  # 色号 → 状态（合并更新）
