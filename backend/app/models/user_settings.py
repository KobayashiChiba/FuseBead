from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from . import Base


class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    default_color_card_id = Column(Integer, ForeignKey("color_cards.id"), nullable=True)

    user = relationship("User", back_populates="settings")
    default_color_card = relationship("ColorCard", foreign_keys=[default_color_card_id])

    def __repr__(self):
        return f"<UserSetting user_id={self.user_id}>"
