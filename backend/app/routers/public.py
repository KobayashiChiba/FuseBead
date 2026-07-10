"""公开访问路由 — 无需登录"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.user import User
from ..models.folder import Folder
from ..models.project import BeadProject
from ..schemas.folder import FolderResponse
from ..schemas.project import ProjectResponse, ProjectDetailResponse

router = APIRouter(prefix="/api", tags=["public"])


@router.get("/users/{username}/galleries", response_model=list[FolderResponse])
def user_galleries(username: str, db: Session = Depends(get_db)):
    """用户主页 — 公开图库列表"""
    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    folders = db.query(Folder).filter(
        Folder.user_id == user.id, Folder.is_public == True
    ).order_by(Folder.sort_order).all()
    return [
        FolderResponse(
            id=f.id,
            name=f.name,
            is_public=f.is_public,
            is_default=f.is_default,
            sort_order=f.sort_order,
            project_count=len(f.projects) if f.projects else 0,
        )
        for f in folders
    ]


@router.get("/galleries/{gallery_id}/projects", response_model=list[ProjectResponse])
def gallery_projects(gallery_id: int, db: Session = Depends(get_db)):
    """公开图库下的项目"""
    gallery = db.query(Folder).filter(
        Folder.id == gallery_id, Folder.is_public == True
    ).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="图库不存在或未公开")
    projects = db.query(BeadProject).filter(
        BeadProject.folder_id == gallery_id
    ).order_by(BeadProject.updated_at.desc()).all()
    return [ProjectResponse.model_validate(p) for p in projects]


@router.get("/galleries/{gallery_id}/projects/{project_id}", response_model=ProjectDetailResponse)
def gallery_project_detail(gallery_id: int, project_id: int, db: Session = Depends(get_db)):
    """公开项目详情"""
    gallery = db.query(Folder).filter(
        Folder.id == gallery_id, Folder.is_public == True
    ).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="图库不存在或未公开")
    project = db.query(BeadProject).filter(
        BeadProject.id == project_id, BeadProject.folder_id == gallery_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    result = ProjectDetailResponse.model_validate(project)
    result.grid_data = project.grid.grid_data if project.grid else []
    return result
