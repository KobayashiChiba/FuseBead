from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from . import Base


class InviteCode(Base):
    __tablename__ = "invite_codes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(8), unique=True, nullable=False, index=True)
    created_by = Column(String(64), nullable=False, default="admin")
    used_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", foreign_keys=[used_by], uselist=False)

    def __repr__(self):
        return f"<InviteCode {self.code}>"
