"""项目相关 schemas"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── 裁剪信息 ──

class CropInfo(BaseModel):
    x: float = 0
    y: float = 0
    w: float = 0  # 0 表示不裁剪，用原图
    h: float = 0


# ── 请求体 ──

class ProjectUpdate(BaseModel):
    """编辑项目：前端处理好 grid_data 后直接传完整数组，后端只存不处理"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=128)
    folder_id: Optional[int] = None
    grid_data: Optional[list[list[str]]] = None  # 完整二维色号表，替换整个网格


class RecognizeRequest(BaseModel):
    """识别请求 — 新建项目和重新识别共用"""
    ref_x: float
    ref_y: float
    cell_size: float
    color_card_id: int
    mode: str = "dominant"       # "dominant" | "average"
    merge_threshold: int = 25    # 全局聚类阈值
    crop: Optional[CropInfo] = None  # 不传则用原图
    name: Optional[str] = Field(default=None, min_length=1, max_length=128)  # 仅新建时需要
    folder_id: Optional[int] = None  # 仅新建时需要
    create_new: bool = False     # 重新识别时：false 覆盖 / true 新建


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
    color_count: Optional[int] = None
    source_image: Optional[str] = None
    ref_x: float = 0
    ref_y: float = 0
    cell_size: float = 20
    crop_x: float = 0
    crop_y: float = 0
    crop_w: float = 0
    crop_h: float = 0
    mode: str = "dominant"
    merge_threshold: int = 25
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectDetailResponse(ProjectResponse):
    grid_data: list[list[str]] = []  # 二维色号表


class ProgressResponse(BaseModel):
    color_progress: dict[str, bool] = {}

    model_config = {"from_attributes": True}


class ProgressUpdate(BaseModel):
    color_progress: dict[str, bool] = {}
