from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional

from dependencies import get_db, get_current_user
from schemas.single_test import (
    SingleTestRequestCreate, SingleTestRequestUpdate, SingleTestRequestOut, PaginatedSingleTestRequests,
    ApproveIn, RejectIn, StartIn, CompleteTestIn, CancelIn,
    SingleTestCommentCreate, SingleTestCommentOut,
    SingleTestAttachmentOut,
    SingleTestDeliveryCreate, SingleTestDeliveryOut,
)
from services import single_test_service

router = APIRouter(prefix="/single-tests", tags=["단건 시험 요청"])


def require_staff(current_user=Depends(get_current_user)):
    if current_user.role == single_test_service.REQUESTER_ROLE:
        raise HTTPException(status_code=403, detail="시험평가팀만 처리할 수 있습니다")
    return current_user


@router.get("/", response_model=PaginatedSingleTestRequests)
def list_requests(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=1000),
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return single_test_service.list_requests(db, page, size, status, search, current_user)


@router.post("/", response_model=SingleTestRequestOut, status_code=201)
def create_request(body: SingleTestRequestCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return single_test_service.create_request(db, body, current_user)


@router.get("/{request_id}", response_model=SingleTestRequestOut)
def get_request(request_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return single_test_service.get_request(db, request_id, current_user)


@router.put("/{request_id}", response_model=SingleTestRequestOut)
def update_request(request_id: int, body: SingleTestRequestUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return single_test_service.update_request(db, request_id, body, current_user)


@router.delete("/{request_id}", status_code=204)
def delete_request(request_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    single_test_service.delete_request(db, request_id)


# ── 상태 전이 (시험평가팀 전용) ────────────────────────────
@router.post("/{request_id}/submit", response_model=SingleTestRequestOut)
def submit(request_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return single_test_service.submit(db, request_id)


@router.post("/{request_id}/approve", response_model=SingleTestRequestOut)
def approve(request_id: int, body: ApproveIn, db: Session = Depends(get_db), current_user=Depends(require_staff)):
    return single_test_service.approve(db, request_id, body, current_user)


@router.post("/{request_id}/reject", response_model=SingleTestRequestOut)
def reject(request_id: int, body: RejectIn, db: Session = Depends(get_db), _=Depends(require_staff)):
    return single_test_service.reject(db, request_id, body)


@router.post("/{request_id}/start", response_model=SingleTestRequestOut)
def start(request_id: int, body: StartIn, db: Session = Depends(get_db), _=Depends(require_staff)):
    return single_test_service.start(db, request_id, body)


@router.post("/{request_id}/complete-test", response_model=SingleTestRequestOut)
def complete_test(request_id: int, body: CompleteTestIn, db: Session = Depends(get_db), _=Depends(require_staff)):
    return single_test_service.complete_test(db, request_id, body)


@router.post("/{request_id}/submit-report", response_model=SingleTestRequestOut)
def submit_report(request_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return single_test_service.submit_report(db, request_id)


@router.post("/{request_id}/review-report", response_model=SingleTestRequestOut)
def review_report(request_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return single_test_service.review_report(db, request_id)


@router.post("/{request_id}/deliver", response_model=SingleTestRequestOut)
def deliver(request_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return single_test_service.deliver(db, request_id)


@router.post("/{request_id}/cancel", response_model=SingleTestRequestOut)
def cancel(request_id: int, body: CancelIn, db: Session = Depends(get_db), _=Depends(require_staff)):
    return single_test_service.cancel(db, request_id, body)


# ── 댓글 ────────────────────────────────────────────────
@router.post("/{request_id}/comments", response_model=SingleTestCommentOut, status_code=201)
def add_comment(request_id: int, body: SingleTestCommentCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return single_test_service.add_comment(db, request_id, body.content, current_user)


# ── 전달 이력 ────────────────────────────────────────────
@router.post("/{request_id}/deliveries", response_model=SingleTestDeliveryOut, status_code=201)
def add_delivery(request_id: int, body: SingleTestDeliveryCreate, db: Session = Depends(get_db), _=Depends(require_staff), current_user=Depends(get_current_user)):
    return single_test_service.add_delivery(db, request_id, body, current_user.id)


# ── 첨부파일 ────────────────────────────────────────────
@router.post("/{request_id}/attachments", response_model=SingleTestAttachmentOut, status_code=201)
def upload_attachment(
    request_id: int,
    file: UploadFile = File(...),
    attachment_type: str = "기타",
    db: Session = Depends(get_db),
    current_user=Depends(require_staff),
):
    return single_test_service.save_attachment(db, request_id, file, attachment_type, current_user)


@router.get("/{request_id}/attachments/{attachment_id}/download")
def download_attachment(request_id: int, attachment_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    att = single_test_service.get_attachment(db, request_id, attachment_id, current_user)
    return FileResponse(att.file_path, filename=att.file_name)


@router.delete("/{request_id}/attachments/{attachment_id}", status_code=204)
def delete_attachment(request_id: int, attachment_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    single_test_service.delete_attachment(db, request_id, attachment_id)
