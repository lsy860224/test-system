import os
import shutil
from datetime import datetime
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session
from models.customer import Customer, CustomerContact, CustomerAttachment
from schemas.customer import CustomerCreate, CustomerUpdate, ContactCreate
from config import settings

def list_customers(db: Session, page: int, size: int, search: str | None, company_type: str | None) -> dict:
    q = db.query(Customer).filter(Customer.is_active == True)
    if search:
        q = q.filter(Customer.name.ilike(f"%{search}%"))
    if company_type:
        q = q.filter(Customer.company_type == company_type)
    total = q.count()
    items = q.order_by(Customer.name).offset((page - 1) * size).limit(size).all()
    return {"total": total, "items": items}

def get_customer(db: Session, customer_id: int) -> Customer:
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.is_active == True).first()
    if not customer:
        raise HTTPException(status_code=404, detail="업체를 찾을 수 없습니다")
    return customer

def create_customer(db: Session, body: CustomerCreate, created_by: int) -> Customer:
    customer = Customer(
        name=body.name,
        short_name=body.short_name,
        company_type=body.company_type,
        business_reg_number=body.business_reg_number,
        homepage=body.homepage,
        address=body.address,
        color_hex=body.color_hex,
        partner_code=body.partner_code,
        notes=body.notes,
        is_active=True,
    )
    db.add(customer)
    db.flush()
    for c in body.contacts:
        db.add(CustomerContact(customer_id=customer.id, **c.model_dump()))
    db.commit()
    db.refresh(customer)
    return customer

def update_customer(db: Session, customer_id: int, body: CustomerUpdate) -> Customer:
    customer = get_customer(db, customer_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer

def deactivate_customer(db: Session, customer_id: int):
    customer = get_customer(db, customer_id)
    customer.is_active = False
    db.commit()

def add_contact(db: Session, customer_id: int, body: ContactCreate) -> CustomerContact:
    get_customer(db, customer_id)
    contact = CustomerContact(customer_id=customer_id, **body.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

def remove_contact(db: Session, customer_id: int, contact_id: int):
    contact = db.query(CustomerContact).filter(
        CustomerContact.id == contact_id,
        CustomerContact.customer_id == customer_id,
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="담당자를 찾을 수 없습니다")
    db.delete(contact)
    db.commit()

def save_attachment(db: Session, customer_id: int, doc_type: str, file: UploadFile, uploaded_by: int) -> dict:
    get_customer(db, customer_id)
    dest_dir = os.path.join(settings.upload_dir, "customers", str(customer_id))
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, file.filename)
    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    file_size = os.path.getsize(dest_path)
    attachment = CustomerAttachment(
        customer_id=customer_id,
        doc_type=doc_type,
        file_name=file.filename,
        file_path=dest_path,
        file_size=file_size,
        uploaded_at=datetime.utcnow(),
        uploaded_by=uploaded_by,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return {"id": attachment.id, "file_name": attachment.file_name, "file_size": attachment.file_size}

def delete_attachment(db: Session, customer_id: int, attachment_id: int):
    att = db.query(CustomerAttachment).filter(
        CustomerAttachment.id == attachment_id,
        CustomerAttachment.customer_id == customer_id,
    ).first()
    if not att:
        raise HTTPException(status_code=404, detail="첨부파일을 찾을 수 없습니다")
    if os.path.exists(att.file_path):
        os.remove(att.file_path)
    db.delete(att)
    db.commit()
