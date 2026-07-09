from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from fastapi import HTTPException

from models.vendor import VendorLab, VendorTestScope, VendorOrder
from models.schedule import TestSchedule
from schemas.vendor import VendorCreate, VendorUpdate, TestScopeCreate, OrderCreate
from services import pagination_helper
from services.schedule_service import compute_status


def _attach_counts(item: VendorLab) -> VendorLab:
    item.scope_count = len(item.test_scopes) if item.test_scopes else 0
    item.order_count = len(item.orders) if item.orders else 0
    for order in item.orders or []:
        _attach_order_display(order)
    return item


def _attach_order_display(order: VendorOrder) -> VendorOrder:
    order.project_name = order.project.name if order.project else None
    order.single_test_request_number = order.single_test_request.request_number if order.single_test_request else None
    if order.schedule:
        order.schedule_status = compute_status(order.schedule)
        order.schedule_test_type = order.schedule.test_type
        order.schedule_planned_start = order.schedule.planned_start
        order.schedule_planned_end = order.schedule.planned_end
    else:
        order.schedule_status = None
        order.schedule_test_type = None
        order.schedule_planned_start = None
        order.schedule_planned_end = None
    return order


def _validate_schedule_project(db: Session, schedule_id: int, project_id: int) -> None:
    schedule = db.query(TestSchedule).filter(TestSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="연계할 시험 일정을 찾을 수 없습니다")
    if schedule.project_id != project_id:
        raise HTTPException(status_code=400, detail="선택한 시험 일정이 해당 프로젝트에 속하지 않습니다")


def _sync_status_with_schedule(order: VendorOrder) -> None:
    """발주에 연계된 시험 일정이 이미 진행중/완료 상태면 발주 상태를 즉시 맞춘다."""
    if not order.schedule or order.status == "취소":
        return
    display_status = compute_status(order.schedule)
    target = {"진행중": "진행중", "완료": "완료"}.get(display_status)
    if not target or (order.status == "완료" and target == "진행중"):
        return
    order.status = target


# ── 시험소 CRUD ────────────────────────────────────────────
def list_vendors(
    db: Session, page: int, size: int,
    search: str | None, lab_type: str | None, kolas_only: bool
) -> dict:
    q = db.query(VendorLab).options(
        joinedload(VendorLab.test_scopes),
        joinedload(VendorLab.orders).joinedload(VendorOrder.project),
        joinedload(VendorLab.orders).joinedload(VendorOrder.schedule),
        joinedload(VendorLab.orders).joinedload(VendorOrder.single_test_request),
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

    result = pagination_helper.paginate(q.order_by(VendorLab.name), page, size)
    for item in result["items"]:
        _attach_counts(item)
    return result


def get_vendor(db: Session, vendor_id: int) -> VendorLab:
    item = (
        db.query(VendorLab)
        .options(
            joinedload(VendorLab.test_scopes),
            joinedload(VendorLab.orders).joinedload(VendorOrder.project),
            joinedload(VendorLab.orders).joinedload(VendorOrder.schedule),
        )
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
    if body.schedule_id:
        if not body.project_id:
            raise HTTPException(status_code=400, detail="시험 일정 연계는 프로젝트 발주에서만 가능합니다")
        _validate_schedule_project(db, body.schedule_id, body.project_id)
    record = VendorOrder(vendor_id=vendor_id, **body.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    _sync_status_with_schedule(record)
    db.commit()
    db.refresh(record)
    return _attach_order_display(record)


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
    if body.schedule_id:
        if not body.project_id:
            raise HTTPException(status_code=400, detail="시험 일정 연계는 프로젝트 발주에서만 가능합니다")
        _validate_schedule_project(db, body.schedule_id, body.project_id)
    for k, v in body.model_dump().items():
        setattr(record, k, v)
    db.commit()
    db.refresh(record)
    _sync_status_with_schedule(record)
    db.commit()
    db.refresh(record)
    return _attach_order_display(record)


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


def list_orders_by_single_test_request(db: Session, request_id: int) -> list[VendorOrder]:
    orders = (
        db.query(VendorOrder)
        .options(joinedload(VendorOrder.project), joinedload(VendorOrder.schedule), joinedload(VendorOrder.single_test_request))
        .filter(VendorOrder.single_test_request_id == request_id)
        .order_by(VendorOrder.created_at.desc())
        .all()
    )
    return [_attach_order_display(o) for o in orders]


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
            "kolas_report": s.kolas_report,
            "notes": s.notes,
        })
    return sorted(result, key=lambda x: (x["unit_price"] is None, x["unit_price"] or 0))
