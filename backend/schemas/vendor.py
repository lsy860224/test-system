from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


# ── 시험 범위 (단가표) ─────────────────────────────────────
class TestScopeCreate(BaseModel):
    standard_item_id: Optional[int] = None
    test_name: str
    standard_no: Optional[str] = None
    unit_price: Optional[int] = None
    lead_days: Optional[int] = None
    kolas_report: Optional[str] = None  # "가능" | "불가능"
    notes: Optional[str] = None


class TestScopeOut(BaseModel):
    id: int
    vendor_id: int
    standard_item_id: Optional[int] = None
    test_name: str
    standard_no: Optional[str] = None
    unit_price: Optional[int] = None
    lead_days: Optional[int] = None
    kolas_report: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── 발주 등록 ─────────────────────────────────────────────
class OrderCreate(BaseModel):
    project_id: Optional[int] = None  # 단건 시험 요청 발주는 project_id 없이 single_test_request_id만 지정 가능
    schedule_id: Optional[int] = None  # 연계할 시험 일정 (선택한 프로젝트 소속이어야 함)
    single_test_request_id: Optional[int] = None  # 단건 시험 요청과 연계
    test_items: Optional[str] = None
    order_date: Optional[date] = None
    due_date: Optional[date] = None
    status: str = "견적의뢰"
    total_amount: Optional[int] = None
    notes: Optional[str] = None


class OrderOut(BaseModel):
    id: int
    vendor_id: int
    project_id: Optional[int] = None
    project_name: Optional[str] = None  # 서비스 레이어에서 프로젝트 조인 후 주입
    single_test_request_id: Optional[int] = None
    single_test_request_number: Optional[str] = None  # 서비스 레이어에서 조인 후 주입
    schedule_id: Optional[int] = None
    schedule_status: Optional[str] = None       # 서비스 레이어에서 조인 후 주입 (실제 진행 상태, compute_status 기반)
    schedule_test_type: Optional[str] = None
    schedule_planned_start: Optional[date] = None
    schedule_planned_end: Optional[date] = None
    test_items: Optional[str] = None
    order_date: Optional[date] = None
    due_date: Optional[date] = None
    status: str
    total_amount: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── 시험소 기본 정보 ─────────────────────────────────────
class VendorCreate(BaseModel):
    name: str
    short_name: Optional[str] = None
    lab_type: Optional[str] = None
    kolas_certified: bool = False
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class VendorUpdate(VendorCreate):
    pass


class VendorListItem(BaseModel):
    id: int
    name: str
    short_name: Optional[str] = None
    lab_type: Optional[str] = None
    kolas_certified: bool
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    is_active: bool
    created_at: datetime
    scope_count: int = 0    # 서비스 레이어 주입
    order_count: int = 0    # 서비스 레이어 주입

    class Config:
        from_attributes = True


class VendorDetail(VendorListItem):
    address: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    test_scopes: List[TestScopeOut] = []
    orders: List[OrderOut] = []


class PaginatedVendors(BaseModel):
    total: int
    items: List[VendorListItem]


# ── 단가 비교 (동일 시험 항목 대상) ─────────────────────
class PriceCompareItem(BaseModel):
    vendor_id: int
    vendor_name: str
    vendor_short: Optional[str] = None
    kolas_certified: bool
    unit_price: Optional[int] = None
    lead_days: Optional[int] = None
    kolas_report: Optional[str] = None
    notes: Optional[str] = None
