from fastapi import APIRouter, Depends, Query, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
from dependencies import get_db, get_current_user
from schemas.standard import (
    StandardItemCreate, StandardItemUpdate, StandardItemOut, StandardStatusPatch, StandardBulkStatus,
    PaginatedStandardItems, StandardHistoryOut, StandardCategoryOut,
)
from services import standard_service

router = APIRouter(prefix="/standards", tags=["규격 매트릭스"])

@router.get("/categories", response_model=list[StandardCategoryOut])
def list_categories(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return standard_service.list_categories(db)

@router.get("/template")
def download_template(_=Depends(get_current_user)):
    content = standard_service.generate_template()
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename*=UTF-8''%EA%B7%9C%EA%B2%A9%EB%A7%A4%ED%8A%B8%EB%A6%AD%EC%8A%A4_%EC%96%91%EC%8B%9D.xlsx"},
    )

@router.post("/import-excel")
async def import_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    content = await file.read()
    return standard_service.import_from_excel(db, content, current_user.id)

@router.get("/", response_model=PaginatedStandardItems)
def list_standard_items(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=1000),
    category_id: Optional[int] = None,
    status: Optional[str] = None,
    source_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return standard_service.list_items(db, page, size, category_id, status, source_type, search)

@router.post("/", response_model=StandardItemOut, status_code=201)
def create_standard_item(body: StandardItemCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return standard_service.create_item(db, body, current_user.id)

@router.get("/{item_id}", response_model=StandardItemOut)
def get_standard_item(item_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return standard_service.get_item(db, item_id)

@router.put("/{item_id}", response_model=StandardItemOut)
def update_standard_item(item_id: int, body: StandardItemUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return standard_service.update_item(db, item_id, body, current_user.id)

@router.patch("/{item_id}/status", response_model=StandardItemOut)
def patch_status(item_id: int, body: StandardStatusPatch, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return standard_service.patch_status(db, item_id, body.status, current_user.id)

@router.delete("/{item_id}", status_code=204)
def delete_standard_item(item_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    standard_service.soft_delete(db, item_id)

@router.post("/bulk-status", response_model=list[StandardItemOut])
def bulk_update_status(body: StandardBulkStatus, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return standard_service.bulk_patch_status(db, body.ids, body.status, current_user.id)

@router.get("/{item_id}/history", response_model=list[StandardHistoryOut])
def get_history(item_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return standard_service.get_history(db, item_id)
