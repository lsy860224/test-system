from fastapi import APIRouter, Depends, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from dependencies import get_db, require_staff
from schemas.ncr import (
    NCRCreate, NCRUpdate, NCROut, NCRStatusPatch, PaginatedNCRs,
    NCRCommentCreate, NCRCommentOut, NCRAttachmentOut,
)
from services import ncr_service

router = APIRouter(prefix="/ncr", tags=["NCR 추적"])

@router.get("/", response_model=PaginatedNCRs)
def list_ncrs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=1000),
    status: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    overdue: bool = False,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    return ncr_service.list_ncrs(db, page, size, status, severity, search, overdue)

@router.post("/", response_model=NCROut, status_code=201)
def create_ncr(body: NCRCreate, db: Session = Depends(get_db), current_user=Depends(require_staff)):
    return ncr_service.create_ncr(db, body, current_user.id)

@router.get("/{ncr_id}", response_model=NCROut)
def get_ncr(ncr_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return ncr_service.get_ncr(db, ncr_id)

@router.put("/{ncr_id}", response_model=NCROut)
def update_ncr(ncr_id: int, body: NCRUpdate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return ncr_service.update_ncr(db, ncr_id, body)

@router.patch("/{ncr_id}/status", response_model=NCROut)
def patch_status(ncr_id: int, body: NCRStatusPatch, db: Session = Depends(get_db), _=Depends(require_staff)):
    return ncr_service.patch_status(db, ncr_id, body.status)

@router.delete("/{ncr_id}", status_code=204)
def delete_ncr(ncr_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    ncr_service.delete_ncr(db, ncr_id)

@router.post("/{ncr_id}/comments", response_model=NCRCommentOut, status_code=201)
def add_comment(ncr_id: int, body: NCRCommentCreate, db: Session = Depends(get_db), current_user=Depends(require_staff)):
    return ncr_service.add_comment(db, ncr_id, body.content, current_user.id)

@router.post("/{ncr_id}/attachments", response_model=NCRAttachmentOut, status_code=201)
def upload_attachment(
    ncr_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_staff),
):
    return ncr_service.save_attachment(db, ncr_id, file, current_user.id)

@router.get("/{ncr_id}/attachments/{attachment_id}/download")
def download_attachment(ncr_id: int, attachment_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    att = ncr_service.get_attachment(db, ncr_id, attachment_id)
    return FileResponse(att.file_path, filename=att.file_name)

@router.delete("/{ncr_id}/attachments/{attachment_id}", status_code=204)
def delete_attachment(ncr_id: int, attachment_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    ncr_service.delete_attachment(db, ncr_id, attachment_id)
