import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import init_db
from routers import auth, mods, announcements, anticheat, sync, admin, landing
from config import MODS_DIR, CLIENT_PACK_DIR, IS_PROD, CORS_ORIGINS


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化
    init_db()
    os.makedirs(MODS_DIR, exist_ok=True)
    os.makedirs(CLIENT_PACK_DIR, exist_ok=True)
    os.makedirs("./updates", exist_ok=True)
    yield


# 生产环境禁用 Swagger 文档
app = FastAPI(
    title="MCLauncher Server",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(mods.router)
app.include_router(sync.router)
app.include_router(announcements.router)
app.include_router(anticheat.router)
app.include_router(admin.router)
app.include_router(landing.router)

# 挂载静态文件服务用于自动更新
app.mount("/updates", StaticFiles(directory="./updates"), name="updates")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "5806"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=not IS_PROD)
