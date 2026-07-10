from sqlalchemy.orm import declarative_base

Base = declarative_base()

# 按依赖顺序导入，确保 SQLAlchemy 能解析所有 relationship
from .invite_code import InviteCode  # noqa: E402
from .user import User  # noqa: E402
from .user_settings import UserSetting  # noqa: E402
from .color_card import ColorCard  # noqa: E402
from .folder import Folder  # noqa: E402
from .project import BeadProject, ProjectGrid, ProjectProgress  # noqa: E402
