from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from . import Base


class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(128), nullable=False)
    description = Column(String(512), nullable=True)
    is_public = Column(Boolean, default=False)
    is_default = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    thumbnail_project_id = Column(Integer, ForeignKey("bead_projects.id"), nullable=True)

    user = relationship("User", back_populates="folders")
    projects = relationship("BeadProject", back_populates="folder", foreign_keys="BeadProject.folder_id")
    thumbnail_project = relationship("BeadProject", foreign_keys=[thumbnail_project_id])

    def __repr__(self):
        return f"<Folder {self.name}>"
