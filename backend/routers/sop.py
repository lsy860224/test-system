from fastapi import APIRouter, Depends, Query, UploadFile, File
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Literal, Optional
from urllib.parse import quote

from dependencies import get_db, require_staff
from schemas.sop import (
    SOPCreate, SOPUpdate, SOPListItem, SOPDetail, PaginatedSOPs,
    RevisionCreate, RevisionOut, AttachmentOut,
)
from schemas.standard import StandardItemOut
from schemas.equipment import EquipmentListItem
from services import sop_service, sop_export_service

class StandardItemIds(BaseModel):
    standard_item_ids: list[int]

class EquipmentIds(BaseModel):
    equipment_ids: list[int]

class SOPExportRequest(BaseModel):
    sop_ids: list[int]
    format: Literal["pptx", "docx"]
    variant: Literal["절차서", "계획서"] = "절차서"
    cover_info: Optional[dict[str, str]] = None

router = APIRouter(prefix="/sop", tags=["절차서 관리"])

# ── SOP CRUD ──────────────────────────────────────────────
@router.get("/", response_model=PaginatedSOPs)
def list_sops(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=1000),
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    doc_type: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    return sop_service.list_sops(db, page, size, search, category, status, doc_type)

@router.post("/", response_model=SOPDetail, status_code=201)
def create_sop(body: SOPCreate, db: Session = Depends(get_db), current_user=Depends(require_staff)):
    return sop_service.create_sop(db, body, current_user)

@router.get("/{sop_id}", response_model=SOPDetail)
def get_sop(sop_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return sop_service.get_sop(db, sop_id)

@router.put("/{sop_id}", response_model=SOPDetail)
def update_sop(sop_id: int, body: SOPUpdate, db: Session = Depends(get_db), current_user=Depends(require_staff)):
    return sop_service.update_sop(db, sop_id, body, current_user)

@router.delete("/{sop_id}", status_code=204)
def delete_sop(sop_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    sop_service.delete_sop(db, sop_id)

# ── 개정 이력 ─────────────────────────────────────────────
@router.post("/{sop_id}/revisions", response_model=RevisionOut, status_code=201)
def add_revision(sop_id: int, body: RevisionCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return sop_service.add_revision(db, sop_id, body)

@router.delete("/{sop_id}/revisions/{rev_id}", status_code=204)
def delete_revision(sop_id: int, rev_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    sop_service.delete_revision(db, sop_id, rev_id)

# ── 첨부파일 ──────────────────────────────────────────────
@router.post("/{sop_id}/attachments", response_model=AttachmentOut, status_code=201)
def upload_attachment(
    sop_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_staff),
):
    return sop_service.save_attachment(db, sop_id, file, current_user.id)

@router.get("/{sop_id}/attachments/{attachment_id}/download")
def download_attachment(sop_id: int, attachment_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    att = sop_service.get_attachment(db, sop_id, attachment_id)
    return FileResponse(att.file_path, filename=att.file_name)

@router.delete("/{sop_id}/attachments/{attachment_id}", status_code=204)
def delete_attachment(sop_id: int, attachment_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    sop_service.delete_attachment(db, sop_id, attachment_id)

# ── 규격 항목 연동 ──────────────────────────────────────────
@router.get("/{sop_id}/standard-items", response_model=list[StandardItemOut])
def get_sop_standard_items(sop_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return sop_service.get_sop_standard_items(db, sop_id)

@router.put("/{sop_id}/standard-items", response_model=list[StandardItemOut])
def set_sop_standard_items(sop_id: int, body: StandardItemIds, db: Session = Depends(get_db), _=Depends(require_staff)):
    return sop_service.set_sop_standard_items(db, sop_id, body.standard_item_ids)

# ── 장비 연동 (장비절차서) ─────────────────────────────────────
@router.get("/{sop_id}/equipment", response_model=list[EquipmentListItem])
def get_sop_equipment(sop_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return sop_service.get_sop_equipment(db, sop_id)

@router.put("/{sop_id}/equipment", response_model=list[EquipmentListItem])
def set_sop_equipment(sop_id: int, body: EquipmentIds, db: Session = Depends(get_db), _=Depends(require_staff)):
    return sop_service.set_sop_equipment(db, sop_id, body.equipment_ids)

# ── 문서 내보내기 (다중 절차서 → 병합 pptx/docx) ──────────────────
@router.post("/export")
def export_documents(body: SOPExportRequest, db: Session = Depends(get_db), _=Depends(require_staff)):
    if body.format == "pptx":
        content = sop_export_service.generate_pptx(db, body.sop_ids, body.variant, body.cover_info)
        media_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    else:
        content = sop_export_service.generate_docx(db, body.sop_ids, body.variant, body.cover_info)
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    filename = f"SOP_{body.variant}.{body.format}"
    encoded_filename = quote(filename)
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename=\"SOP_export.{body.format}\"; filename*=UTF-8''{encoded_filename}"},
    )
