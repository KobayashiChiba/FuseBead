"""
FuseBead V2 — FastAPI 应用入口
"""
from contextlib import asynccontextmanager
from pathlib import Path
import sys

# 让 backend/ 目录下的 seed_data 可 import
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.database import SessionLocal
from seed_data.seed_color_cards import seed
from .routers import auth, users, folders, color_cards, projects, admin, public


@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动时导入预置色卡"""
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
    yield


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(folders.router)
app.include_router(color_cards.router)
app.include_router(projects.router)
app.include_router(admin.router)
app.include_router(public.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
