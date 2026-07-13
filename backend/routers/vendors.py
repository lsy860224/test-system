from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from dependencies import get_db, require_staff
from schemas.vendor import (
    VendorCreate, VendorUpdate, VendorListItem, VendorDetail, PaginatedVendors,
    TestScopeCreate, TestScopeOut,
    OrderCreate, OrderOut,
    PriceCompareItem,
)
from services import vendor_service

router = APIRouter(prefix="/vendors", tags=["외주 시험소"])

# ── 단가 비교 (literal path — /{vendor_id} 보다 먼저) ──
@router.get("/compare", response_model=list[PriceCompareItem])
def compare_prices(
    test_name: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    return vendor_service.compare_prices(db, test_name)

# ── 시험소 CRUD ────────────────────────────────────────────
@router.get("/", response_model=PaginatedVendors)
def list_vendors(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=1000),
    search: Optional[str] = None,
    lab_type: Optional[str] = None,
    kolas_only: bool = False,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    return vendor_service.list_vendors(db, page, size, search, lab_type, kolas_only)

# ── 단건 시험 요청 연계 발주 조회 (vendor_id 무관 — literal path, /{vendor_id} 보다 먼저) ──
@router.get("/orders/by-request/{request_id}", response_model=list[OrderOut])
def list_orders_by_request(request_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return vendor_service.list_orders_by_single_test_request(db, request_id)

@router.post("/", response_model=VendorDetail, status_code=201)
def create_vendor(body: VendorCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return vendor_service.create_vendor(db, body)

@router.get("/{vendor_id}", response_model=VendorDetail)
def get_vendor(vendor_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return vendor_service.get_vendor(db, vendor_id)

@router.put("/{vendor_id}", response_model=VendorDetail)
def update_vendor(vendor_id: int, body: VendorUpdate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return vendor_service.update_vendor(db, vendor_id, body)

@router.delete("/{vendor_id}", status_code=204)
def delete_vendor(vendor_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    vendor_service.delete_vendor(db, vendor_id)

# ── 시험 범위 (단가표) ─────────────────────────────────────
@router.post("/{vendor_id}/scopes", response_model=TestScopeOut, status_code=201)
def add_scope(vendor_id: int, body: TestScopeCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return vendor_service.add_test_scope(db, vendor_id, body)

@router.put("/{vendor_id}/scopes/{scope_id}", response_model=TestScopeOut)
def update_scope(vendor_id: int, scope_id: int, body: TestScopeCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return vendor_service.update_test_scope(db, vendor_id, scope_id, body)

@router.delete("/{vendor_id}/scopes/{scope_id}", status_code=204)
def delete_scope(vendor_id: int, scope_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    vendor_service.delete_test_scope(db, vendor_id, scope_id)

# ── 발주 이력 ─────────────────────────────────────────────
@router.post("/{vendor_id}/orders", response_model=OrderOut, status_code=201)
def add_order(vendor_id: int, body: OrderCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return vendor_service.add_order(db, vendor_id, body)

@router.put("/{vendor_id}/orders/{order_id}", response_model=OrderOut)
def update_order(vendor_id: int, order_id: int, body: OrderCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return vendor_service.update_order(db, vendor_id, order_id, body)

@router.delete("/{vendor_id}/orders/{order_id}", status_code=204)
def delete_order(vendor_id: int, order_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    vendor_service.delete_order(db, vendor_id, order_id)
