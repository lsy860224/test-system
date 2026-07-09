from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, delete, insert
from fastapi import HTTPException, UploadFile

from models.sop import SOP, SOPRevision, SOPAttachment, sop_standard_items, sop_equipment
from models.standard import StandardItem
from models.equipment import Equipment
from models.user import User
from schemas.sop import SOPCreate, SOPUpdate, RevisionCreate
from services import file_helper, pagination_helper, standard_service, notification_service

# 상태 전이에 필요한 최소 역할 — 팀장/임원은 하위 단계 권한도 포함한다
STATUS_ROLE_MAP: dict[str, set[str]] = {
    "초안":  {"admin", "팀원", "팀장", "임원"},
    "검토중": {"admin", "팀원", "팀장", "임원"},
    "승인":  {"admin", "팀장", "임원"},
    "폐기":  {"admin", "팀장", "임원"},
}


def _check_status_permission(status: str, current_user: User):
    allowed = STATUS_ROLE_MAP.get(status)
    if allowed and current_user.role not in allowed:
        raise HTTPException(
            status_code=403,
            detail=f"'{status}' 상태로 변경할 권한이 없습니다 (현재 역할: {current_user.role})",
        )


def _notify_approver_if_submitted(db: Session, item: SOP, old_status: str | None):
    if item.status != "검토중" or old_status == "검토중" or not item.approver_id:
        return
    notification_service.create_notification(
        db, user_id=item.approver_id,
        title=f"[승인 요청] {item.title}",
        message=f"{item.sop_number} · {item.title} 문서가 검토/승인을 기다리고 있습니다.",
        link_path="/sop", related_type="sop", related_id=item.id,
    )


# ── SOP CRUD ──────────────────────────────────────────────
def list_sops(
    db: Session, page: int, size: int,
    search: str | None, category: str | None, status: str | None, doc_type: str | None = None,
) -> dict:
    q = db.query(SOP)
    if search:
        q = q.filter(or_(
            SOP.sop_number.ilike(f"%{search}%"),
            SOP.title.ilike(f"%{search}%"),
            SOP.owner.ilike(f"%{search}%"),
        ))
    if category:
        q = q.filter(SOP.category == category)
    if status:
        q = q.filter(SOP.status == status)
    if doc_type:
        q = q.filter(SOP.doc_type == doc_type)

    return pagination_helper.paginate(q.order_by(SOP.sop_number), page, size)


def get_sop(db: Session, sop_id: int) -> SOP:
    item = (
        db.query(SOP)
        .options(joinedload(SOP.revisions), joinedload(SOP.attachments))
        .filter(SOP.id == sop_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="SOP를 찾을 수 없습니다")
    return item


def create_sop(db: Session, body: SOPCreate, current_user: User) -> SOP:
    _check_status_permission(body.status, current_user)
    # 중복 문서 번호 확인
    existing = db.query(SOP).filter(
        SOP.sop_number == body.sop_number,
        SOP.version == body.version,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"문서 번호 {body.sop_number} {body.version}이 이미 존재합니다")

    item = SOP(**body.model_dump())
    item.owner = current_user.name  # 작성자는 로그인 사용자 이름 고정 — 수정 불가
    db.add(item)
    db.commit()
    db.refresh(item)
    item.revisions = []
    _notify_approver_if_submitted(db, item, old_status=None)
    return item


def update_sop(db: Session, sop_id: int, body: SOPUpdate, current_user: User) -> SOP:
    item = get_sop(db, sop_id)
    old_status = item.status
    if body.status != old_status:
        _check_status_permission(body.status, current_user)
    for k, v in body.model_dump().items():
        if k == "owner":
            continue  # 작성자는 최초 등록 시점 값으로 고정 — 수정 불가
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    _notify_approver_if_submitted(db, item, old_status)
    return item


def delete_sop(db: Session, sop_id: int):
    item = get_sop(db, sop_id)
    for att in item.attachments:
        file_helper.delete_upload(att.file_path)
    db.delete(item)
    db.commit()


# ── 개정 이력 ─────────────────────────────────────────────
def add_revision(db: Session, sop_id: int, body: RevisionCreate) -> SOPRevision:
    get_sop(db, sop_id)
    record = SOPRevision(sop_id=sop_id, **body.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def delete_revision(db: Session, sop_id: int, rev_id: int):
    record = (
        db.query(SOPRevision)
        .filter(SOPRevision.id == rev_id, SOPRevision.sop_id == sop_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="개정 이력을 찾을 수 없습니다")
    db.delete(record)
    db.commit()


# ── 첨부파일 ──────────────────────────────────────────────
def save_attachment(db: Session, sop_id: int, file: UploadFile, uploaded_by: int) -> SOPAttachment:
    get_sop(db, sop_id)
    dest_path, file_size = file_helper.save_upload("sop", sop_id, file)
    attachment = SOPAttachment(
        sop_id=sop_id,
        file_name=file.filename,
        file_path=dest_path,
        file_size=file_size,
        uploaded_by=uploaded_by,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


def get_attachment(db: Session, sop_id: int, attachment_id: int) -> SOPAttachment:
    att = db.query(SOPAttachment).filter(
        SOPAttachment.id == attachment_id,
        SOPAttachment.sop_id == sop_id,
    ).first()
    return file_helper.attachment_or_404(att)


def delete_attachment(db: Session, sop_id: int, attachment_id: int):
    att = get_attachment(db, sop_id, attachment_id)
    file_helper.delete_upload(att.file_path)
    db.delete(att)
    db.commit()


# ── SOP-규격 항목 연동 ──────────────────────────────────────
def get_sop_standard_items(db: Session, sop_id: int) -> list:
    get_sop(db, sop_id)
    items = (
        db.query(StandardItem)
        .join(sop_standard_items, sop_standard_items.c.standard_item_id == StandardItem.id)
        .filter(sop_standard_items.c.sop_id == sop_id, StandardItem.is_deleted == False)
        .order_by(StandardItem.standard_code)
        .all()
    )
    return standard_service.attach_category_names(db, items)


def set_sop_standard_items(db: Session, sop_id: int, standard_item_ids: list[int]) -> list:
    get_sop(db, sop_id)
    db.execute(delete(sop_standard_items).where(sop_standard_items.c.sop_id == sop_id))
    if standard_item_ids:
        db.execute(insert(sop_standard_items).values(
            [{"sop_id": sop_id, "standard_item_id": sid} for sid in standard_item_ids]
        ))
    db.commit()
    return get_sop_standard_items(db, sop_id)


# ── SOP-장비 연동 ──────────────────────────────────────────
def get_sop_equipment(db: Session, sop_id: int) -> list:
    get_sop(db, sop_id)
    return (
        db.query(Equipment)
        .join(sop_equipment, sop_equipment.c.equipment_id == Equipment.id)
        .filter(sop_equipment.c.sop_id == sop_id)
        .order_by(Equipment.name)
        .all()
    )


def set_sop_equipment(db: Session, sop_id: int, equipment_ids: list[int]) -> list:
    get_sop(db, sop_id)
    db.execute(delete(sop_equipment).where(sop_equipment.c.sop_id == sop_id))
    if equipment_ids:
        db.execute(insert(sop_equipment).values(
            [{"sop_id": sop_id, "equipment_id": eid} for eid in equipment_ids]
        ))
    db.commit()
    return get_sop_equipment(db, sop_id)
