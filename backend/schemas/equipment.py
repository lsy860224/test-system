from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


# ── 교정 이력 ─────────────────────────────────────────
class CalibrationCreate(BaseModel):
    calibration_type: str = "정기교정"
    calibration_date: date
    next_due_date: Optional[date] = None
    result: str = "합격"
    calibration_body: Optional[str] = None
    certificate_number: Optional[str] = None
    notes: Optional[str] = None


class CalibrationOut(BaseModel):
    id: int
    equipment_id: int
    calibration_type: str
    calibration_date: date
    next_due_date: Optional[date] = None
    result: str
    calibration_body: Optional[str] = None
    certificate_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── 투자 계획 ─────────────────────────────────────────
class InvestmentCreate(BaseModel):
    equipment_id: Optional[int] = None
    year: int
    invest_type: str
    item_name: Optional[str] = None
    amount_est: Optional[int] = None
    notes: Optional[str] = None


class InvestmentOut(BaseModel):
    id: int
    equipment_id: Optional[int] = None
    year: int
    invest_type: str
    item_name: Optional[str] = None
    amount_est: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    equipment_name: Optional[str] = None  # 서비스 레이어에서 주입

    class Config:
        from_attributes = True


# ── 장비 기본 정보 ─────────────────────────────────────
class EquipmentCreate(BaseModel):
    name: str
    model: Optional[str] = None
    manufacturer: Optional[str] = None
    serial_number: Optional[str] = None
    asset_number: Optional[str] = None
    category: Optional[str] = None
    manager: Optional[str] = None
    status: str = "운용중"
    location: Optional[str] = None
    purchase_date: Optional[date] = None
    notes: Optional[str] = None


class EquipmentUpdate(EquipmentCreate):
    pass


class EquipmentListItem(BaseModel):
    """목록용 — 교정 만료일 포함, 상세 관계 미포함"""
    id: int
    name: str
    model: Optional[str] = None
    manufacturer: Optional[str] = None
    serial_number: Optional[str] = None
    asset_number: Optional[str] = None
    category: Optional[str] = None
    manager: Optional[str] = None
    status: str
    location: Optional[str] = None
    purchase_date: Optional[date] = None
    latest_expiry: Optional[date] = None      # 서비스 레이어 계산
    days_to_expiry: Optional[int] = None      # 서비스 레이어 계산
    sop_status: str = "없음"   # 없음/작성중/완료 — 연동된 장비절차서 중 최고 상태
    sop_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class EquipmentDetail(EquipmentListItem):
    """상세용 — 교정 이력·투자 포함"""
    notes: Optional[str] = None
    updated_at: Optional[datetime] = None
    calibrations: List[CalibrationOut] = []
    investments: List[InvestmentOut] = []


class PaginatedEquipment(BaseModel):
    total: int
    items: List[EquipmentListItem]
