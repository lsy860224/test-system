from datetime import datetime
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from models.single_test import SingleTestRequest, SingleTestAttachment, SingleTestComment, SingleTestDelivery
from models.user import User
from schemas.single_test import (
    SingleTestRequestCreate, SingleTestRequestUpdate,
    ApproveIn, RejectIn, StartIn, CompleteTestIn, CancelIn,
    SingleTestDeliveryCreate,
)
from services import file_helper, pagination_helper
from dependencies import REQUESTER_ROLE

TERMINAL_STATUSES = ("전달완료", "반려", "취소")


def _next_request_number(db: Session) -> str:
    year = datetime.utcnow().year
    prefix = f"STR-{year}-"
    last = (
        db.query(SingleTestRequest)
        .filter(SingleTestRequest.request_number.like(f"{prefix}%"))
        .order_by(SingleTestRequest.request_number.desc())
        .first()
    )
    seq = int(last.request_number.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:03d}"


def _require_status(req: SingleTestRequest, expected: str):
    if req.status != expected:
        raise HTTPException(status_code=400, detail=f"'{expected}' 상태에서만 처리할 수 있습니다 (현재: {req.status})")


def list_requests(db: Session, page: int, size: int, status: str | None, search: str | None, current_user) -> dict:
    q = db.query(SingleTestRequest)
    if current_user.role == REQUESTER_ROLE:
        q = q.filter(SingleTestRequest.requester_user_id == current_user.id)
    if status:
        q = q.filter(SingleTestRequest.status == status)
    if search:
        q = q.filter(
            SingleTestRequest.test_name.ilike(f"%{search}%")
            | SingleTestRequest.requesting_dept.ilike(f"%{search}%")
        )
    return pagination_helper.paginate(q.order_by(SingleTestRequest.created_at.desc()), page, size)


def get_request(db: Session, request_id: int, current_user=None) -> SingleTestRequest:
    req = db.query(SingleTestRequest).filter(SingleTestRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="단건 시험 요청을 찾을 수 없습니다")
    if current_user and current_user.role == REQUESTER_ROLE and req.requester_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="본인이 등록한 요청만 조회할 수 있습니다")
    return req


def create_request(db: Session, body: SingleTestRequestCreate, current_user) -> SingleTestRequest:
    req = SingleTestRequest(
        **body.model_dump(),
        request_number=_next_request_number(db),
        status="접수",
        requester_user_id=current_user.id if current_user.role == REQUESTER_ROLE else None,
        created_by=current_user.id,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


def update_request(db: Session, request_id: int, body: SingleTestRequestUpdate, current_user) -> SingleTestRequest:
    req = get_request(db, request_id, current_user)
    if current_user.role == REQUESTER_ROLE and req.status != "접수":
        raise HTTPException(status_code=400, detail="접수 상태의 요청만 수정할 수 있습니다")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(req, field, value)
    req.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(req)
    return req


def delete_request(db: Session, request_id: int):
    req = get_request(db, request_id)
    for att in req.attachments:
        file_helper.delete_upload(att.file_path)
    db.delete(req)
    db.commit()


# ── 상태 전이 ────────────────────────────────────────────
def submit(db: Session, request_id: int) -> SingleTestRequest:
    req = get_request(db, request_id)
    _require_status(req, "접수")
    req.status = "검토중"
    db.commit()
    db.refresh(req)
    return req


def approve(db: Session, request_id: int, body: ApproveIn, current_user: User) -> SingleTestRequest:
    req = get_request(db, request_id)
    _require_status(req, "검토중")
    req.execution_type = body.execution_type
    req.equipment_id = body.equipment_id
    req.assignee_id = body.assignee_id
    req.planned_start = body.planned_start
    req.planned_end = body.planned_end
    req.approved_at = datetime.utcnow()
    req.approved_by = current_user.id
    req.status = "승인"
    db.commit()
    db.refresh(req)
    return req


def reject(db: Session, request_id: int, body: RejectIn) -> SingleTestRequest:
    req = get_request(db, request_id)
    _require_status(req, "검토중")
    if not body.rejection_reason or not body.rejection_reason.strip():
        raise HTTPException(status_code=400, detail="반려 사유를 입력해야 합니다")
    req.rejection_reason = body.rejection_reason
    req.status = "반려"
    db.commit()
    db.refresh(req)
    return req


def start(db: Session, request_id: int, body: StartIn) -> SingleTestRequest:
    req = get_request(db, request_id)
    _require_status(req, "승인")
    req.actual_start = body.actual_start or datetime.utcnow().date()
    req.status = "진행중"
    db.commit()
    db.refresh(req)
    return req


def complete_test(db: Session, request_id: int, body: CompleteTestIn) -> SingleTestRequest:
    req = get_request(db, request_id)
    _require_status(req, "진행중")
    req.result = body.result
    req.actual_end = body.actual_end or datetime.utcnow().date()
    req.status = "시험완료"
    db.commit()
    db.refresh(req)
    return req


def submit_report(db: Session, request_id: int) -> SingleTestRequest:
    req = get_request(db, request_id)
    _require_status(req, "시험완료")
    req.status = "보고서작성"
    db.commit()
    db.refresh(req)
    return req


def review_report(db: Session, request_id: int) -> SingleTestRequest:
    req = get_request(db, request_id)
    _require_status(req, "보고서작성")
    if not any(a.attachment_type == "성적서" for a in req.attachments):
        raise HTTPException(status_code=400, detail="성적서 첨부파일을 먼저 등록해야 합니다")
    req.status = "검토"
    db.commit()
    db.refresh(req)
    return req


def deliver(db: Session, request_id: int) -> SingleTestRequest:
    req = get_request(db, request_id)
    _require_status(req, "검토")
    if not req.deliveries:
        raise HTTPException(status_code=400, detail="전달 이력을 먼저 등록해야 합니다")
    req.status = "전달완료"
    db.commit()
    db.refresh(req)
    return req


def cancel(db: Session, request_id: int, body: CancelIn) -> SingleTestRequest:
    req = get_request(db, request_id)
    if req.status in TERMINAL_STATUSES:
        raise HTTPException(status_code=400, detail=f"이미 종결된 요청입니다 (현재: {req.status})")
    if body.reason:
        req.notes = f"{req.notes}\n[취소 사유] {body.reason}" if req.notes else f"[취소 사유] {body.reason}"
    req.status = "취소"
    db.commit()
    db.refresh(req)
    return req


# ── 댓글 ────────────────────────────────────────────────
def add_comment(db: Session, request_id: int, content: str, current_user: User) -> SingleTestComment:
    get_request(db, request_id, current_user)
    comment = SingleTestComment(request_id=request_id, content=content, created_by=current_user.id)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


# ── 전달 이력 ────────────────────────────────────────────
def add_delivery(db: Session, request_id: int, body: SingleTestDeliveryCreate, created_by: int) -> SingleTestDelivery:
    req = get_request(db, request_id)
    _require_status(req, "검토")
    if not body.delivered_to or not body.delivered_to.strip():
        raise HTTPException(status_code=400, detail="수신자를 입력해야 합니다")
    delivery = SingleTestDelivery(request_id=request_id, **body.model_dump(), created_by=created_by)
    db.add(delivery)
    db.commit()
    db.refresh(delivery)
    return delivery


# ── 첨부파일 ────────────────────────────────────────────
def save_attachment(db: Session, request_id: int, file: UploadFile, attachment_type: str, current_user: User) -> SingleTestAttachment:
    get_request(db, request_id, current_user)
    dest_path, file_size = file_helper.save_upload("single_test", request_id, file)
    att = SingleTestAttachment(
        request_id=request_id,
        attachment_type=attachment_type,
        file_name=file.filename,
        file_path=dest_path,
        file_size=file_size,
        file_type=file.content_type,
        uploaded_at=datetime.utcnow(),
        uploaded_by=current_user.id,
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return att


def get_attachment(db: Session, request_id: int, attachment_id: int, current_user=None) -> SingleTestAttachment:
    get_request(db, request_id, current_user)
    att = db.query(SingleTestAttachment).filter(
        SingleTestAttachment.id == attachment_id,
        SingleTestAttachment.request_id == request_id,
    ).first()
    return file_helper.attachment_or_404(att)


def delete_attachment(db: Session, request_id: int, attachment_id: int):
    att = get_attachment(db, request_id, attachment_id)
    file_helper.delete_upload(att.file_path)
    db.delete(att)
    db.commit()
