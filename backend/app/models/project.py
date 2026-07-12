from sqlalchemy import Column, Integer, String, DateTime, JSON, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from . import Base


class BeadProject(Base):
    __tablename__ = "bead_projects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    name = Column(String(128), nullable=False)
    source_image = Column(String(256), nullable=True)
    grid_rows = Column(Integer, nullable=False)
    grid_cols = Column(Integer, nullable=False)
    color_card_id = Column(Integer, ForeignKey("color_cards.id"), nullable=True)
    # 识别参数
    crop_x = Column(Float, default=0)
    crop_y = Column(Float, default=0)
    crop_w = Column(Float, default=0)
    crop_h = Column(Float, default=0)
    ref_x = Column(Float, default=0)
    ref_y = Column(Float, default=0)
    cell_size = Column(Float, default=20)
    mode = Column(String(16), default="dominant")
    merge_threshold = Column(Integer, default=25)
    status = Column(String(16), default="draft")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="projects")
    folder = relationship("Folder", back_populates="projects", foreign_keys=[folder_id])
    color_card = relationship("ColorCard", back_populates="projects")
    grid = relationship("ProjectGrid", back_populates="project", uselist=False,
                        cascade="all, delete-orphan")
    progress = relationship("ProjectProgress", back_populates="project", uselist=False,
                            cascade="all, delete-orphan")

    @property
    def thumbnail(self):
        return self.grid.thumbnail if self.grid else None

    @property
    def color_count(self):
        return self.grid.color_count if self.grid else None

    def __repr__(self):
        return f"<BeadProject {self.name}>"


class ProjectGrid(Base):
    __tablename__ = "project_grids"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("bead_projects.id"), unique=True, nullable=False)
    grid_data = Column(JSON, nullable=False)
    thumbnail = Column(String, nullable=True)  # base64 PNG data URL
    color_count = Column(Integer, nullable=True)

    project = relationship("BeadProject", back_populates="grid")

    def __repr__(self):
        return f"<ProjectGrid project_id={self.project_id}>"


class ProjectProgress(Base):
    __tablename__ = "project_progress"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("bead_projects.id"), unique=True, nullable=False)
    color_progress = Column(JSON, nullable=True)

    project = relationship("BeadProject", back_populates="progress")

    def __repr__(self):
        return f"<ProjectProgress project_id={self.project_id}>"
