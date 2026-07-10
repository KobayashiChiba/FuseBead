from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from . import Base


class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(128), nullable=False)
    is_public = Column(Boolean, default=False)
    is_default = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)

    user = relationship("User", back_populates="folders")
    projects = relationship("BeadProject", back_populates="folder")

    def __repr__(self):
        return f"<Folder {self.name}>"
