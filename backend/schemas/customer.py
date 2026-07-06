from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

# ── 담당자 ──────────────────────────────────────────────
class ContactBase(BaseModel):
    name: str
    title: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_primary: bool = False

class ContactCreate(ContactBase):
    pass

class ContactOut(ContactBase):
    id: int
    customer_id: int
    model_config = {"from_attributes": True}

# ── 첨부파일 ─────────────────────────────────────────────
class AttachmentOut(BaseModel):
    id: int
    doc_type: Optional[str]
    file_name: str
    file_size: Optional[int]
    uploaded_at: datetime
    model_config = {"from_attributes": True}

# ── 업체 ─────────────────────────────────────────────────
class CustomerBase(BaseModel):
    name: str
    short_name: Optional[str] = None
    company_type: str                   # 완성차 | 1차협력사 | 납품사_협력사
    business_reg_number: Optional[str] = None
    homepage: Optional[str] = None
    address: Optional[str] = None
    color_hex: str = "#2B2F82"
    partner_code: Optional[str] = None
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    contacts: list[ContactCreate] = []

class CustomerUpdate(CustomerBase):
    pass

class CustomerOut(CustomerBase):
    id: int
    is_active: bool
    created_at: datetime
    contacts: list[ContactOut] = []
    attachments: list[AttachmentOut] = []
    model_config = {"from_attributes": True}

class CustomerListOut(BaseModel):
    id: int
    name: str
    short_name: Optional[str]
    company_type: str
    color_hex: str
    is_active: bool
    partner_code: Optional[str]
    model_config = {"from_attributes": True}

class PaginatedCustomers(BaseModel):
    total: int
    items: list[CustomerListOut]
