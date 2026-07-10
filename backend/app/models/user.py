from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from . import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    password_hash = Column(String(128), nullable=False)
    nickname = Column(String(64), nullable=False, default="")
    avatar_url = Column(String(256), nullable=True)
    invite_code_id = Column(Integer, ForeignKey("invite_codes.id"), nullable=True)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    reset_code = Column(String(32), nullable=True)
    reset_code_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    invite_code = relationship("InviteCode", foreign_keys=[invite_code_id])
    settings = relationship("UserSetting", back_populates="user", uselist=False)
    folders = relationship("Folder", back_populates="user")
    projects = relationship("BeadProject", back_populates="user")

    def __repr__(self):
        return f"<User {self.username}>"

# 延迟导入避免循环引用
from .user_settings import UserSetting  # noqa: E402, F811
