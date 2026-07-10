from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
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
    thumbnail = Column(String(256), nullable=True)
    grid_rows = Column(Integer, nullable=False)
    grid_cols = Column(Integer, nullable=False)
    color_card_id = Column(Integer, ForeignKey("color_cards.id"), nullable=True)
    status = Column(String(16), default="draft")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="projects")
    folder = relationship("Folder", back_populates="projects")
    color_card = relationship("ColorCard", back_populates="projects")
    grid = relationship("ProjectGrid", back_populates="project", uselist=False,
                        cascade="all, delete-orphan")
    progress = relationship("ProjectProgress", back_populates="project", uselist=False,
                            cascade="all, delete-orphan")

    def __repr__(self):
        return f"<BeadProject {self.name}>"


class ProjectGrid(Base):
    __tablename__ = "project_grids"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("bead_projects.id"), unique=True, nullable=False)
    grid_data = Column(JSON, nullable=False)

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
