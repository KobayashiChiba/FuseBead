"""项目服务 — 图片上传 + 色号识别"""
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


def _load_and_crop(image_bytes: bytes, crop: dict | None) -> np.ndarray:
    """读取图片，可选裁剪"""
    img_array = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("无法解析图片")

    if crop and crop.get("w", 0) > 0 and crop.get("h", 0) > 0:
        x, y, w, h = int(crop["x"]), int(crop["y"]), int(crop["w"]), int(crop["h"])
        h_img, w_img = img.shape[:2]
        x = max(0, min(x, w_img - 1))
        y = max(0, min(y, h_img - 1))
        w = max(1, min(w, w_img - x))
        h = max(1, min(h, h_img - y))
        img = img[y:y+h, x:x+w]

    return img


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
    mode: str = "dominant",
    merge_threshold: int = 25,
    crop: dict | None = None,
    progress_callback=None,
) -> BeadProject:
    """创建拼豆项目：保存图片 → (裁剪) → 识别色号 → 写入数据库"""
    def _report(progress, message):
        if progress_callback:
            progress_callback(progress, message)

    # 1. 保存原图
    _report(5, '正在保存图片...')
    ext = image_ext.lstrip(".") or "png"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = Path(settings.UPLOAD_DIR) / filename
    filepath.write_bytes(image_bytes)

    # 2. 读取 + 裁剪
    _report(10, '正在读取和裁剪图片...')
    img = _load_and_crop(image_bytes, crop)

    # 3. 加载色卡
    card = db.query(ColorCard).filter(ColorCard.id == color_card_id).first()
    if not card:
        raise ValueError("色卡不存在")
    color_map = _build_color_map(card)

    # 4. 提取色号（extract 内部会通过 progress_callback 报告 15-95 的进度）
    color_codes = extract(
        img, ref_cell=(ref_x, ref_y, cell_size), color_map=color_map,
        merge_threshold=merge_threshold, mode=mode,
        progress_callback=progress_callback,
    )
    rows = len(color_codes)
    cols = len(color_codes[0]) if rows > 0 else 0

    # 5. 保存项目
    _report(98, '正在保存项目...')
    project = BeadProject(
        user_id=user_id, folder_id=folder_id, name=name,
        source_image=filename, grid_rows=rows, grid_cols=cols,
        color_card_id=color_card_id,
    )
    db.add(project)
    db.flush()
    grid = ProjectGrid(project_id=project.id, grid_data=color_codes)
    db.add(grid)
    db.commit()
    db.refresh(project)
    return project


def re_recognize(
    db: Session,
    project: BeadProject,
    ref_x: float,
    ref_y: float,
    cell_size: float,
    color_card_id: int,
    mode: str = "dominant",
    merge_threshold: int = 25,
    crop: dict | None = None,
    create_new: bool = False,
) -> BeadProject:
    """
    重新识别已有项目
    - create_new=False → 覆盖原项目 grid_data
    - create_new=True  → 新建项目（复制 source_image）
    """
    # 读取原图
    source_path = Path(settings.UPLOAD_DIR) / project.source_image
    if not source_path.exists():
        raise ValueError(f"原图文件不存在: {project.source_image}")
    image_bytes = source_path.read_bytes()

    if create_new:
        # 新建项目
        name = f"{project.name}_重新识别"
        return create_project(
            db=db, user_id=project.user_id, name=name,
            folder_id=project.folder_id, color_card_id=color_card_id,
            image_bytes=image_bytes, image_ext=source_path.suffix,
            ref_x=ref_x, ref_y=ref_y, cell_size=cell_size,
            mode=mode, merge_threshold=merge_threshold, crop=crop,
        )
    else:
        # 覆盖原项目
        img = _load_and_crop(image_bytes, crop)
        card = db.query(ColorCard).filter(ColorCard.id == color_card_id).first()
        if not card:
            raise ValueError("色卡不存在")
        color_map = _build_color_map(card)

        color_codes = extract(
            img, ref_cell=(ref_x, ref_y, cell_size), color_map=color_map,
            merge_threshold=merge_threshold, mode=mode,
        )
        project.grid.grid_data = color_codes
        project.grid_rows = len(color_codes)
        project.grid_cols = len(color_codes[0]) if color_codes else 0
        project.color_card_id = color_card_id
        db.commit()
        db.refresh(project)
        return project
