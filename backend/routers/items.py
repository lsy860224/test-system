from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from dependencies import get_db, require_staff
from schemas.item import ItemCreate, ItemUpdate, ItemOut, PaginatedItems
from services import item_service

router = APIRouter(prefix="/items", tags=["아이템 관리"])

@router.get("/", response_model=PaginatedItems)
def list_items(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=1000),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    return item_service.list_items(db, page, size, search)

@router.post("/", response_model=ItemOut, status_code=201)
def create_item(body: ItemCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return item_service.create_item(db, body)

@router.get("/{item_id}", response_model=ItemOut)
def get_item(item_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return item_service.get_item(db, item_id)

@router.put("/{item_id}", response_model=ItemOut)
def update_item(item_id: int, body: ItemUpdate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return item_service.update_item(db, item_id, body)

@router.delete("/{item_id}", status_code=204)
def deactivate_item(item_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    item_service.deactivate_item(db, item_id)
