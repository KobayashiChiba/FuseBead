"""图库路由 — CRUD"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.user import User
from ..models.folder import Folder
from ..schemas.folder import FolderCreate, FolderUpdate, FolderResponse
from .auth import get_current_user

router = APIRouter(prefix="/api/folders", tags=["folders"])


def _folder_response(folder: Folder) -> FolderResponse:
    return FolderResponse(
        id=folder.id,
        name=folder.name,
        is_public=folder.is_public,
        is_default=folder.is_default,
        sort_order=folder.sort_order,
        project_count=len(folder.projects) if folder.projects else 0,
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
    folder = Folder(user_id=current_user.id, name=body.name)
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
    """更新图库（改名/切换公开）"""
    folder = db.query(Folder).filter(Folder.id == folder_id, Folder.user_id == current_user.id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="图库不存在")
    if body.name is not None:
        folder.name = body.name
    if body.is_public is not None:
        folder.is_public = body.is_public
    if body.sort_order is not None:
        folder.sort_order = body.sort_order
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
    db.delete(folder)
    db.commit()
    return {"message": "已删除"}
