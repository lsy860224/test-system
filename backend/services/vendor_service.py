from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from fastapi import HTTPException

from models.vendor import VendorLab, VendorTestScope, VendorOrder
from schemas.vendor import VendorCreate, VendorUpdate, TestScopeCreate, OrderCreate


def _attach_counts(item: VendorLab) -> VendorLab:
    item.scope_count = len(item.test_scopes) if item.test_scopes else 0
    item.order_count = len(item.orders) if item.orders else 0
    return item


# ── 시험소 CRUD ────────────────────────────────────────────
def list_vendors(
    db: Session, page: int, size: int,
    search: str | None, lab_type: str | None, kolas_only: bool
) -> dict:
    q = db.query(VendorLab).options(
        joinedload(VendorLab.test_scopes),
        joinedload(VendorLab.orders),
    ).filter(VendorLab.is_active == True)

    if search:
        q = q.filter(or_(
            VendorLab.name.ilike(f"%{search}%"),
            VendorLab.short_name.ilike(f"%{search}%"),
        ))
    if lab_type:
        q = q.filter(VendorLab.lab_type == lab_type)
    if kolas_only:
        q = q.filter(VendorLab.kolas_certified == True)

    total = q.count()
    items = q.order_by(VendorLab.name).offset((page - 1) * size).limit(size).all()
    for item in items:
        _attach_counts(item)
    return {"total": total, "items": items}


def get_vendor(db: Session, vendor_id: int) -> VendorLab:
    item = (
        db.query(VendorLab)
        .options(joinedload(VendorLab.test_scopes), joinedload(VendorLab.orders))
        .filter(VendorLab.id == vendor_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="시험소를 찾을 수 없습니다")
    _attach_counts(item)
    return item


def create_vendor(db: Session, body: VendorCreate) -> VendorLab:
    item = VendorLab(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    item.test_scopes = []
    item.orders = []
    _attach_counts(item)
    return item


def update_vendor(db: Session, vendor_id: int, body: VendorUpdate) -> VendorLab:
    item = get_vendor(db, vendor_id)
    for k, v in body.model_dump().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    _attach_counts(item)
    return item


def delete_vendor(db: Session, vendor_id: int):
    item = get_vendor(db, vendor_id)
    db.delete(item)
    db.commit()


# ── 시험 범위 (단가표) ─────────────────────────────────────
def add_test_scope(db: Session, vendor_id: int, body: TestScopeCreate) -> VendorTestScope:
    get_vendor(db, vendor_id)
    record = VendorTestScope(vendor_id=vendor_id, **body.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_test_scope(
    db: Session, vendor_id: int, scope_id: int, body: TestScopeCreate
) -> VendorTestScope:
    record = (
        db.query(VendorTestScope)
        .filter(VendorTestScope.id == scope_id, VendorTestScope.vendor_id == vendor_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="시험 범위를 찾을 수 없습니다")
    for k, v in body.model_dump().items():
        setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return record


def delete_test_scope(db: Session, vendor_id: int, scope_id: int):
    record = (
        db.query(VendorTestScope)
        .filter(VendorTestScope.id == scope_id, VendorTestScope.vendor_id == vendor_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="시험 범위를 찾을 수 없습니다")
    db.delete(record)
    db.commit()


# ── 발주 이력 ─────────────────────────────────────────────
def add_order(db: Session, vendor_id: int, body: OrderCreate) -> VendorOrder:
    get_vendor(db, vendor_id)
    record = VendorOrder(vendor_id=vendor_id, **body.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_order(
    db: Session, vendor_id: int, order_id: int, body: OrderCreate
) -> VendorOrder:
    record = (
        db.query(VendorOrder)
        .filter(VendorOrder.id == order_id, VendorOrder.vendor_id == vendor_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="발주 이력을 찾을 수 없습니다")
    for k, v in body.model_dump().items():
        setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return record


def delete_order(db: Session, vendor_id: int, order_id: int):
    record = (
        db.query(VendorOrder)
        .filter(VendorOrder.id == order_id, VendorOrder.vendor_id == vendor_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="발주 이력을 찾을 수 없습니다")
    db.delete(record)
    db.commit()


# ── 단가 비교 ─────────────────────────────────────────────
def compare_prices(db: Session, test_name: str) -> list[dict]:
    """test_name 포함 검색 → 시험소별 단가 비교"""
    scopes = (
        db.query(VendorTestScope)
        .join(VendorLab)
        .filter(
            VendorTestScope.test_name.ilike(f"%{test_name}%"),
            VendorLab.is_active == True,
        )
        .all()
    )
    result = []
    for s in scopes:
        result.append({
            "vendor_id": s.vendor.id,
            "vendor_name": s.vendor.name,
            "vendor_short": s.vendor.short_name,
            "kolas_certified": s.vendor.kolas_certified,
            "unit_price": s.unit_price,
            "lead_days": s.lead_days,
            "accreditation_scope": s.accreditation_scope,
            "notes": s.notes,
        })
    return sorted(result, key=lambda x: (x["unit_price"] is None, x["unit_price"] or 0))
