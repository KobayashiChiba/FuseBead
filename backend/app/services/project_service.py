"""项目服务 — 图片上传 + 色号识别"""
import os
import sys
import uuid
from pathlib import Path

import cv2
import numpy as np
from sqlalchemy.orm import Session

# lib/ 在 backend/ 下，不在 app/ 内
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from ..core.config import settings
from ..models.project import BeadProject, ProjectGrid
from ..models.color_card import ColorCard
from lib.beadextract import extract


def _build_color_map(card: ColorCard) -> dict:
    """色卡 JSON → {色号: (R, G, B)}"""
    return {
        c["code"]: tuple(int(c["hex"][i:i+2], 16) for i in (0, 2, 4))
        for c in card.colors
    }


def create_project(
    db: Session,
    user_id: int,
    name: str,
    folder_id: int | None,
    color_card_id: int,
    image_bytes: bytes,
    image_ext: str,
    ref_x: float,
    ref_y: float,
    cell_size: float,
    merge_threshold: int = 25,
) -> BeadProject:
    """
    创建拼豆项目：保存图片 → 识别色号 → 写入数据库

    返回 BeadProject（已 commit）
    """
    # 1. 保存图片
    ext = image_ext.lstrip(".") or "png"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = Path(settings.UPLOAD_DIR) / filename
    filepath.write_bytes(image_bytes)

    # 2. 读取图片
    img_array = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("无法解析图片")

    # 3. 加载色卡
    card = db.query(ColorCard).filter(ColorCard.id == color_card_id).first()
    if not card:
        raise ValueError("色卡不存在")
    color_map = _build_color_map(card)

    # 4. 提取色号
    color_codes = extract(
        img,
        ref_cell=(ref_x, ref_y, cell_size),
        color_map=color_map,
        merge_threshold=merge_threshold,
    )
    rows = len(color_codes)
    cols = len(color_codes[0]) if rows > 0 else 0

    # 5. 保存项目
    project = BeadProject(
        user_id=user_id,
        folder_id=folder_id,
        name=name,
        source_image=filename,
        grid_rows=rows,
        grid_cols=cols,
        color_card_id=color_card_id,
    )
    db.add(project)
    db.flush()

    grid = ProjectGrid(project_id=project.id, grid_data=color_codes)
    db.add(grid)
    db.commit()
    db.refresh(project)

    return project
