"""项目路由 — 创建 / 查看 / 编辑 / 删除 / 进度 / 渲染"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.user import User
from ..models.folder import Folder
from ..models.project import BeadProject, ProjectGrid, ProjectProgress
from ..services.project_service import create_project
from ..schemas.project import (
    ProjectResponse,
    ProjectDetailResponse,
    ProjectUpdate,
    ProgressResponse,
    ProgressUpdate,
)
from .auth import get_current_user

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
def list_projects(
    folder_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """项目列表（按图库筛选）"""
    q = db.query(BeadProject).filter(BeadProject.user_id == current_user.id)
    if folder_id is not None:
        q = q.filter(BeadProject.folder_id == folder_id)
    projects = q.order_by(BeadProject.updated_at.desc()).all()
    return [ProjectResponse.model_validate(p) for p in projects]


@router.post("", response_model=ProjectResponse, status_code=201)
async def upload_project(
    name: str = Form(...),
    folder_id: int | None = Form(None),
    color_card_id: int = Form(...),
    ref_x: float = Form(...),
    ref_y: float = Form(...),
    cell_size: float = Form(...),
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """上传图片 → 识别色号 → 创建项目"""
    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="仅支持图片文件")

    # 检验文件夹归属
    if folder_id is not None:
        folder = db.query(Folder).filter(
            Folder.id == folder_id, Folder.user_id == current_user.id
        ).first()
        if not folder:
            raise HTTPException(status_code=404, detail="图库不存在")

    image_bytes = await image.read()
    ext = Path(image.filename).suffix if image.filename else ".png"

    try:
        project = create_project(
            db=db,
            user_id=current_user.id,
            name=name,
            folder_id=folder_id,
            color_card_id=color_card_id,
            image_bytes=image_bytes,
            image_ext=ext,
            ref_x=ref_x,
            ref_y=ref_y,
            cell_size=cell_size,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return ProjectResponse.model_validate(project)


@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """项目详情（含网格数据）"""
    project = db.query(BeadProject).filter(
        BeadProject.id == project_id, BeadProject.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    result = ProjectDetailResponse.model_validate(project)
    result.grid_data = project.grid.grid_data if project.grid else []
    return result


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    body: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """编辑项目：基本信息 / 单格改色 / 全局替换"""
    project = db.query(BeadProject).filter(
        BeadProject.id == project_id, BeadProject.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    # 基本信息更新
    if body.name is not None:
        project.name = body.name
    if body.folder_id is not None:
        folder = db.query(Folder).filter(
            Folder.id == body.folder_id, Folder.user_id == current_user.id
        ).first()
        if not folder:
            raise HTTPException(status_code=404, detail="目标图库不存在")
        project.folder_id = body.folder_id

    # 单格改色
    if body.grid_update and project.grid:
        grid_data = project.grid.grid_data
        gu = body.grid_update
        if 0 <= gu.row < project.grid_rows and 0 <= gu.col < project.grid_cols:
            grid_data[gu.row][gu.col] = gu.new_color
            project.grid.grid_data = grid_data

    # 全局替换
    if body.color_replace and project.grid:
        cr = body.color_replace
        grid_data = project.grid.grid_data
        for r in range(project.grid_rows):
            for c in range(project.grid_cols):
                if grid_data[r][c] == cr.old_color:
                    grid_data[r][c] = cr.new_color
        project.grid.grid_data = grid_data

    db.commit()
    db.refresh(project)
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除项目（级联删除 grid + progress）"""
    project = db.query(BeadProject).filter(
        BeadProject.id == project_id, BeadProject.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    db.delete(project)
    db.commit()
    return {"message": "已删除"}


@router.get("/{project_id}/progress", response_model=ProgressResponse)
def get_progress(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取拼豆进度"""
    project = db.query(BeadProject).filter(
        BeadProject.id == project_id, BeadProject.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if project.progress:
        return ProgressResponse(color_progress=project.progress.color_progress or {})
    return ProgressResponse()


@router.put("/{project_id}/progress", response_model=ProgressResponse)
def update_progress(
    project_id: int,
    body: ProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """更新拼豆进度（合并更新，不覆盖未传的色号）"""
    project = db.query(BeadProject).filter(
        BeadProject.id == project_id, BeadProject.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    progress = project.progress
    if not progress:
        progress = ProjectProgress(project_id=project.id, color_progress={})
        db.add(progress)
        db.flush()

    current = progress.color_progress or {}
    current.update(body.color_progress)
    progress.color_progress = current
    db.commit()
    return ProgressResponse(color_progress=progress.color_progress)


from pathlib import Path  # noqa: E402


@router.get("/{project_id}/render")
def render_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """渲染拼豆预览图"""
    project = db.query(BeadProject).filter(
        BeadProject.id == project_id, BeadProject.user_id == current_user.id
    ).first()
    if not project or not project.grid:
        raise HTTPException(status_code=404, detail="项目或网格数据不存在")

    from ..models.color_card import ColorCard
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
    from lib.beadrender import render_bead_art
    import cv2

    card = db.query(ColorCard).filter(ColorCard.id == project.color_card_id).first()
    color_map = {
        c["code"]: tuple(int(c["hex"][i:i+2], 16) for i in (0, 2, 4))
        for c in card.colors
    } if card else {}

    import tempfile
    img = render_bead_art(project.grid.grid_data, color_map, title=project.name)
    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    cv2.imwrite(tmp.name, img)
    tmp.close()

    from fastapi.responses import FileResponse
    return FileResponse(tmp.name, media_type="image/png", filename=f"{project.name}.png")
