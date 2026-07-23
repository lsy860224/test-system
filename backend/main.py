from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from config import settings
from database import init_db, SessionLocal
from routers import auth, customers, standards, ncr, dashboard, projects, schedules, equipment, vendors, sop, reports, export, items, users, todos, notifications, single_test, vehicle_models

DEFAULT_SECRET_KEY = "au-inc-secret-key-change-in-production-2026"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    if settings.environment == "production" and settings.secret_key == DEFAULT_SECRET_KEY:
        # scripts/preflight_check.py가 같은 조건을 먼저 막지만, 그 스크립트를 건너뛰고
        # uvicorn을 직접 실행하는 경로(예: .bat 파싱 오류)에 대비한 마지막 방어선
        raise RuntimeError(
            "SECRET_KEY가 기본값 그대로인 상태로는 운영 환경(production)을 기동할 수 없습니다. "
            "SECRET_KEY 환경변수를 설정하세요."
        )
    init_db()
    from services.auth_service import seed_admin
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
    yield
    # shutdown (필요 시 추가)

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:4173", "app://"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(standards.router)
app.include_router(ncr.router)
app.include_router(dashboard.router)
app.include_router(projects.router)
app.include_router(schedules.router)
app.include_router(equipment.router)
app.include_router(vendors.router)
app.include_router(sop.router)
app.include_router(reports.router)
app.include_router(export.router)
app.include_router(items.router)
app.include_router(users.router)
app.include_router(todos.router)
app.include_router(notifications.router)
app.include_router(single_test.router)
app.include_router(vehicle_models.router)

os.makedirs(settings.upload_dir, exist_ok=True)

@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}
