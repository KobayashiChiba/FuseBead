"""项目相关 schemas"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── 请求体 ──

class ProjectUpdate(BaseModel):
    """编辑项目：前端处理好 grid_data 后直接传完整数组，后端只存不处理"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=128)
    folder_id: Optional[int] = None
    grid_data: Optional[list[list[str]]] = None  # 完整二维色号表，替换整个网格


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
