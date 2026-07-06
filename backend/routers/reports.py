from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from dependencies import get_db, get_current_user
from services import report_service

router = APIRouter(prefix="/reports", tags=["임원 보고"])

@router.get("/gap-analysis")
def gap_analysis(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return report_service.generate_gap_analysis(db)

@router.get("/quarterly-kpi")
def quarterly_kpi(year: Optional[int] = Query(None), db: Session = Depends(get_db), _=Depends(get_current_user)):
    return report_service.generate_quarterly_kpi(db, year or date.today().year)
