from datetime import datetime
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session
from models.ncr import NCRReport, NCRAttachment, NCRComment
from schemas.ncr import NCRCreate, NCRUpdate
from services import file_helper, pagination_helper

OPEN_STATUSES = ("초기분석", "8D진행", "검토중")

def _mark_overdue(ncr: NCRReport) -> NCRReport:
    today = datetime.utcnow().date()
    ncr.is_overdue = bool(ncr.due_date and ncr.due_date < today and ncr.status in OPEN_STATUSES)
    return ncr

def _next_ncr_number(db: Session) -> str:
    year = datetime.utcnow().year
    prefix = f"NCR-{year}-"
    last = (
        db.query(NCRReport)
        .filter(NCRReport.ncr_number.like(f"{prefix}%"))
        .order_by(NCRReport.ncr_number.desc())
        .first()
    )
    seq = int(last.ncr_number.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:03d}"

def list_ncrs(db: Session, page: int, size: int, status, severity, search, overdue: bool = False) -> dict:
    q = db.query(NCRReport)
    if status:
        q = q.filter(NCRReport.status == status)
    if severity:
        q = q.filter(NCRReport.severity == severity)
    if search:
        q = q.filter(NCRReport.issue_summary.ilike(f"%{search}%") | NCRReport.part_name.ilike(f"%{search}%"))
    if overdue:
        today = datetime.utcnow().date()
        q = q.filter(NCRReport.due_date < today, NCRReport.status.in_(OPEN_STATUSES))
    result = pagination_helper.paginate(q.order_by(NCRReport.created_at.desc()), page, size)
    result["items"] = [_mark_overdue(i) for i in result["items"]]
    return result

def get_ncr(db: Session, ncr_id: int) -> NCRReport:
    ncr = db.query(NCRReport).filter(NCRReport.id == ncr_id).first()
    if not ncr:
        raise HTTPException(status_code=404, detail="NCR을 찾을 수 없습니다")
    return _mark_overdue(ncr)

def create_ncr(db: Session, body: NCRCreate, created_by: int) -> NCRReport:
    ncr = NCRReport(**body.model_dump(), ncr_number=_next_ncr_number(db), status="초기분석", created_by=created_by)
    db.add(ncr)
    db.commit()
    db.refresh(ncr)
    return _mark_overdue(ncr)

def update_ncr(db: Session, ncr_id: int, body: NCRUpdate) -> NCRReport:
    ncr = get_ncr(db, ncr_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(ncr, field, value)
    ncr.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ncr)
    return _mark_overdue(ncr)

def patch_status(db: Session, ncr_id: int, new_status: str) -> NCRReport:
    ncr = get_ncr(db, ncr_id)
    ncr.status = new_status
    if new_status == "완료":
        ncr.closed_date = datetime.utcnow().date()
    ncr.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ncr)
    return _mark_overdue(ncr)

def add_comment(db: Session, ncr_id: int, content: str, created_by: int) -> NCRComment:
    get_ncr(db, ncr_id)
    comment = NCRComment(ncr_id=ncr_id, content=content, created_by=created_by)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment

def delete_ncr(db: Session, ncr_id: int):
    ncr = get_ncr(db, ncr_id)
    db.delete(ncr)
    db.commit()

def save_attachment(db: Session, ncr_id: int, file: UploadFile, uploaded_by: int) -> dict:
    get_ncr(db, ncr_id)
    dest_path, file_size = file_helper.save_upload("ncr", ncr_id, file)
    att = NCRAttachment(
        ncr_id=ncr_id,
        file_name=file.filename,
        file_path=dest_path,
        file_size=file_size,
        file_type=file.content_type,
        uploaded_at=datetime.utcnow(),
        uploaded_by=uploaded_by,
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return att

def get_attachment(db: Session, ncr_id: int, attachment_id: int) -> NCRAttachment:
    att = db.query(NCRAttachment).filter(
        NCRAttachment.id == attachment_id,
        NCRAttachment.ncr_id == ncr_id,
    ).first()
    return file_helper.attachment_or_404(att)

def delete_attachment(db: Session, ncr_id: int, attachment_id: int):
    att = get_attachment(db, ncr_id, attachment_id)
    file_helper.delete_upload(att.file_path)
    db.delete(att)
    db.commit()
