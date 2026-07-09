from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import Optional
from dependencies import get_db, require_staff
from schemas.customer import CustomerCreate, CustomerUpdate, CustomerOut, PaginatedCustomers, ContactCreate, ContactOut
from services import customer_service

router = APIRouter(prefix="/customers", tags=["업체 관리"])

@router.get("/", response_model=PaginatedCustomers)
def list_customers(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=1000),
    search: Optional[str] = None,
    company_type: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    return customer_service.list_customers(db, page, size, search, company_type)

@router.post("/", response_model=CustomerOut, status_code=201)
def create_customer(body: CustomerCreate, db: Session = Depends(get_db), current_user=Depends(require_staff)):
    return customer_service.create_customer(db, body, current_user.id)

@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return customer_service.get_customer(db, customer_id)

@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(customer_id: int, body: CustomerUpdate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return customer_service.update_customer(db, customer_id, body)

@router.delete("/{customer_id}", status_code=204)
def deactivate_customer(customer_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    customer_service.deactivate_customer(db, customer_id)

# ── 담당자 ───────────────────────────────────────────────────
@router.post("/{customer_id}/contacts", response_model=ContactOut, status_code=201)
def add_contact(customer_id: int, body: ContactCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return customer_service.add_contact(db, customer_id, body)

@router.delete("/{customer_id}/contacts/{contact_id}", status_code=204)
def remove_contact(customer_id: int, contact_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    customer_service.remove_contact(db, customer_id, contact_id)

# ── 첨부파일 ─────────────────────────────────────────────────
@router.post("/{customer_id}/attachments", status_code=201)
def upload_attachment(
    customer_id: int,
    doc_type: str = Query("기타"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_staff),
):
    return customer_service.save_attachment(db, customer_id, doc_type, file, current_user.id)

@router.delete("/{customer_id}/attachments/{attachment_id}", status_code=204)
def delete_attachment(customer_id: int, attachment_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    customer_service.delete_attachment(db, customer_id, attachment_id)
