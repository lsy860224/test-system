from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class RevisionCreate(BaseModel):
    version: str
    change_summary: Optional[str] = None
    changed_by: Optional[str] = None


class RevisionOut(BaseModel):
    id: int
    sop_id: int
    version: str
    change_summary: Optional[str] = None
    changed_by: Optional[str] = None
    changed_at: datetime

    class Config:
        from_attributes = True


class SOPCreate(BaseModel):
    sop_number: str
    title: str
    version: str = "v1.0"
    category: Optional[str] = None
    status: str = "초안"
    owner: Optional[str] = None
    approved_by: Optional[str] = None
    issue_date: Optional[date] = None
    revision_date: Optional[date] = None
    description: Optional[str] = None
    content: Optional[str] = None
    notes: Optional[str] = None


class SOPUpdate(SOPCreate):
    pass


class SOPListItem(BaseModel):
    id: int
    sop_number: str
    title: str
    version: str
    category: Optional[str] = None
    status: str
    owner: Optional[str] = None
    approved_by: Optional[str] = None
    issue_date: Optional[date] = None
    revision_date: Optional[date] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AttachmentOut(BaseModel):
    id: int
    file_name: str
    file_size: Optional[int] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


class SOPDetail(SOPListItem):
    description: Optional[str] = None
    content: Optional[str] = None
    notes: Optional[str] = None
    revisions: List[RevisionOut] = []
    attachments: List[AttachmentOut] = []


class PaginatedSOPs(BaseModel):
    total: int
    items: List[SOPListItem]
