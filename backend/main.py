from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from config import settings
from database import init_db, SessionLocal
from routers import auth, customers, standards, ncr, dashboard, projects, schedules, equipment, vendors, sop, reports, export, items, users, todos, notifications

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    init_db()
    from services.auth_service import seed_admin
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
    yield
    # shutdown (필요 시 추가)

app = FastAPI(title=settings.app_name, version="0.1.0", docs_url="/docs", lifespan=lifespan)

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

os.makedirs(settings.upload_dir, exist_ok=True)

@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}
