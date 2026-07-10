"""色卡相关 schemas"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ColorItem(BaseModel):
    code: str
    hex: str


class ColorCardResponse(BaseModel):
    id: int
    name: str
    is_system: bool
    is_active: bool
    color_count: int = 0

    model_config = {"from_attributes": True}


class ColorCardDetailResponse(ColorCardResponse):
    colors: list[ColorItem]
