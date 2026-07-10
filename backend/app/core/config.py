"""
应用配置 — 集中管理所有配置项
使用 pydantic-settings 从环境变量 / .env 加载，支持默认值
"""
from pathlib import Path
from pydantic_settings import BaseSettings


# 项目根 — backend/ 目录
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/

# 数据目录在项目根 FuseBead/data/
DATA_DIR = BASE_DIR.parent / "data"


class Settings(BaseSettings):
    # ── 应用 ──
    APP_NAME: str = "FuseBead"
    DEBUG: bool = True

    # ── 数据库 ──
    DATABASE_URL: str = f"sqlite:///{DATA_DIR / 'fusebead.db'}"

    # ── JWT ──
    SECRET_KEY: str = "change-me-in-production-use-random-string"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 30
    ALGORITHM: str = "HS256"

    # ── 文件上传 ──
    UPLOAD_DIR: str = str(DATA_DIR / "uploads")
    MAX_UPLOAD_SIZE_MB: int = 10

    # ── CORS ──
    CORS_ORIGINS: list[str] = ["*"]

    # ── 邀请码长度 ──
    INVITE_CODE_LENGTH: int = 8

    model_config = {"env_prefix": "FUSEBEAD_", "env_file": ".env"}


settings = Settings()

# 确保上传目录存在
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
