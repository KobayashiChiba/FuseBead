"""图库路由 — CRUD"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.user import User
from ..models.folder import Folder
from ..models.project import BeadProject
from ..schemas.folder import FolderCreate, FolderUpdate, FolderResponse
from .auth import get_current_user

router = APIRouter(prefix="/api/folders", tags=["folders"])


def _folder_response(folder: Folder) -> FolderResponse:
    # Validate thumbnail — must belong to this folder
    thumb_id = None
    if folder.thumbnail_project_id:
        project = folder.thumbnail_project
        if project and project.folder_id == folder.id:
            thumb_id = folder.thumbnail_project_id

    return FolderResponse(
        id=folder.id,
        name=folder.name,
        description=folder.description,
        is_public=folder.is_public,
        is_default=folder.is_default,
        sort_order=folder.sort_order,
        project_count=len(folder.projects) if folder.projects else 0,
        thumbnail_project_id=thumb_id,
    )


@router.get("", response_model=list[FolderResponse])
def list_folders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """我的图库列表"""
    folders = db.query(Folder).filter(Folder.user_id == current_user.id).order_by(Folder.sort_order).all()
    return [_folder_response(f) for f in folders]


@router.post("", response_model=FolderResponse, status_code=201)
def create_folder(
    body: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """创建自定义图库"""
    folder = Folder(
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        is_public=body.is_public,
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return _folder_response(folder)


@router.patch("/{folder_id}", response_model=FolderResponse)
def update_folder(
    folder_id: int,
    body: FolderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """更新图库（改名/简介/公开/排序/封面）"""
    folder = db.query(Folder).filter(Folder.id == folder_id, Folder.user_id == current_user.id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="图库不存在")
    if body.name is not None:
        folder.name = body.name
    if body.description is not None:
        folder.description = body.description
    if body.is_public is not None:
        folder.is_public = body.is_public
    if body.sort_order is not None:
        folder.sort_order = body.sort_order
    if body.thumbnail_project_id is not None:
        # Validate the project belongs to this user & folder
        project = db.query(BeadProject).filter(
            BeadProject.id == body.thumbnail_project_id,
            BeadProject.user_id == current_user.id,
            BeadProject.folder_id == folder_id,
        ).first()
        if not project:
            raise HTTPException(status_code=400, detail="封面项目不存在或不属于此图库")
        folder.thumbnail_project_id = body.thumbnail_project_id
    db.commit()
    db.refresh(folder)
    return _folder_response(folder)


@router.delete("/{folder_id}")
def delete_folder(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除图库（默认图库不可删）"""
    folder = db.query(Folder).filter(Folder.id == folder_id, Folder.user_id == current_user.id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="图库不存在")
    if folder.is_default:
        raise HTTPException(status_code=403, detail="默认图库不可删除")

    # 转移项目到默认图库
    default_folder = db.query(Folder).filter(
        Folder.user_id == current_user.id, Folder.is_default == True
    ).first()
    if default_folder:
        db.query(BeadProject).filter(
            BeadProject.folder_id == folder_id, BeadProject.user_id == current_user.id
        ).update({BeadProject.folder_id: default_folder.id})

    db.delete(folder)
    db.commit()
    return {"message": "已删除"}
