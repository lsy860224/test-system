from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from dependencies import get_db, require_staff
from services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["대시보드"])

@router.get("/summary")
def get_summary(
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    return dashboard_service.get_summary(db, year)
