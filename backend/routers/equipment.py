from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional

from dependencies import get_db, require_staff
from schemas.equipment import (
    EquipmentCreate, EquipmentUpdate, EquipmentListItem, EquipmentDetail, PaginatedEquipment,
    CalibrationCreate, CalibrationOut,
    InvestmentCreate, InvestmentOut,
)
from services import equipment_service

router = APIRouter(prefix="/equipment", tags=["장비 관리"])

# ── 교정이력 관리 양식 (literal path → /{eq_id} 보다 먼저 정의) ──
@router.get("/calibration-template")
def download_calibration_template(_=Depends(require_staff)):
    content = equipment_service.generate_calibration_template()
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename*=UTF-8''%EA%B5%90%EC%A0%95%EC%9D%B4%EB%A0%A5%EA%B4%80%EB%A6%AC_%EC%96%91%EC%8B%9D.xlsx"},
    )

# ── 투자 계획 (literal path → /{eq_id} 보다 먼저 정의) ──
@router.get("/investments", response_model=list[InvestmentOut])
def list_investments(
    year: Optional[int] = None,
    equipment_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    return equipment_service.list_investments(db, year, equipment_id)

@router.post("/investments", response_model=InvestmentOut, status_code=201)
def create_investment(body: InvestmentCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return equipment_service.create_investment(db, body)

@router.put("/investments/{inv_id}", response_model=InvestmentOut)
def update_investment(inv_id: int, body: InvestmentCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return equipment_service.update_investment(db, inv_id, body)

@router.delete("/investments/{inv_id}", status_code=204)
def delete_investment(inv_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    equipment_service.delete_investment(db, inv_id)

# ── 교정 만료 알림 (literal path) ──────────────────────
@router.get("/calibration-alerts")
def calibration_alerts(
    days: int = Query(60, ge=1, le=365),
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    return equipment_service.get_calibration_alerts(db, days)

# ── 장비 CRUD ──────────────────────────────────────────
@router.get("/", response_model=PaginatedEquipment)
def list_equipment(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=1000),
    search: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    return equipment_service.list_equipment(db, page, size, search, status, category)

@router.post("/", response_model=EquipmentDetail, status_code=201)
def create_equipment(body: EquipmentCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return equipment_service.create_equipment(db, body)

@router.get("/{eq_id}", response_model=EquipmentDetail)
def get_equipment(eq_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return equipment_service.get_equipment(db, eq_id)

@router.put("/{eq_id}", response_model=EquipmentDetail)
def update_equipment(eq_id: int, body: EquipmentUpdate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return equipment_service.update_equipment(db, eq_id, body)

@router.delete("/{eq_id}", status_code=204)
def delete_equipment(eq_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    equipment_service.delete_equipment(db, eq_id)

# ── 교정 이력 ──────────────────────────────────────────
@router.post("/{eq_id}/calibrations", response_model=CalibrationOut, status_code=201)
def add_calibration(eq_id: int, body: CalibrationCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return equipment_service.add_calibration(db, eq_id, body)

@router.put("/{eq_id}/calibrations/{cal_id}", response_model=CalibrationOut)
def update_calibration(eq_id: int, cal_id: int, body: CalibrationCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return equipment_service.update_calibration(db, eq_id, cal_id, body)

@router.delete("/{eq_id}/calibrations/{cal_id}", status_code=204)
def delete_calibration(eq_id: int, cal_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    equipment_service.delete_calibration(db, eq_id, cal_id)

# ── 규격 Capability 매핑 ─────────────────────────────────
@router.get("/{eq_id}/standard-items")
def get_standard_items(eq_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return equipment_service.get_standard_item_ids(db, eq_id)

@router.put("/{eq_id}/standard-items")
def set_standard_items(eq_id: int, body: dict, db: Session = Depends(get_db), _=Depends(require_staff)):
    return equipment_service.set_standard_items(db, eq_id, body.get("standard_item_ids", []))
