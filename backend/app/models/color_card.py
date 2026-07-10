from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from . import Base


class ColorCard(Base):
    __tablename__ = "color_cards"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False)
    colors = Column(JSON, nullable=False)
    is_system = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    projects = relationship("BeadProject", back_populates="color_card")

    def __repr__(self):
        return f"<ColorCard {self.name}>"
