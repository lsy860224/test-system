from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

class NCRAttachmentOut(BaseModel):
    id: int
    file_name: str
    file_size: Optional[int]
    file_type: Optional[str]
    uploaded_at: datetime
    model_config = {"from_attributes": True}

class NCRCommentCreate(BaseModel):
    content: str

class NCRCommentOut(BaseModel):
    id: int
    content: str
    created_at: datetime
    created_by: Optional[int]
    model_config = {"from_attributes": True}

class NCRBase(BaseModel):
    standard_item_id: Optional[int] = None
    test_schedule_id: Optional[int] = None
    part_name: str
    test_section: Optional[str] = None
    issue_summary: str
    issue_detail: Optional[str] = None
    severity: str = "Medium"
    assignee_id: Optional[int] = None
    detected_date: Optional[date] = None
    due_date: Optional[date] = None
    d1_team: Optional[str] = None
    d2_problem: Optional[str] = None
    d3_containment: Optional[str] = None
    d4_root_cause: Optional[str] = None
    d5_permanent_action: Optional[str] = None
    d6_verify_action: Optional[str] = None
    d7_prevent_recurrence: Optional[str] = None
    d8_congratulate: Optional[str] = None

class NCRCreate(NCRBase):
    pass

class NCRUpdate(NCRBase):
    status: Optional[str] = None

class NCRStatusPatch(BaseModel):
    status: str

class NCROut(NCRBase):
    id: int
    ncr_number: str
    status: str
    closed_date: Optional[date]
    created_at: datetime
    updated_at: datetime
    is_overdue: bool = False
    attachments: list[NCRAttachmentOut] = []
    comments: list[NCRCommentOut] = []
    model_config = {"from_attributes": True}

class NCRListOut(BaseModel):
    id: int
    ncr_number: str
    part_name: str
    issue_summary: str
    severity: str
    status: str
    detected_date: Optional[date]
    due_date: Optional[date]
    is_overdue: bool = False
    assignee_id: Optional[int] = None
    model_config = {"from_attributes": True}

class PaginatedNCRs(BaseModel):
    total: int
    items: list[NCRListOut]
