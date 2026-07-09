from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class SingleTestAttachmentOut(BaseModel):
    id: int
    attachment_type: str
    file_name: str
    file_size: Optional[int]
    file_type: Optional[str]
    uploaded_at: datetime
    model_config = {"from_attributes": True}


class SingleTestCommentCreate(BaseModel):
    content: str


class SingleTestCommentOut(BaseModel):
    id: int
    content: str
    created_at: datetime
    created_by: Optional[int]
    model_config = {"from_attributes": True}


class SingleTestDeliveryCreate(BaseModel):
    delivered_at: date
    delivered_to: str
    method: str  # 이메일 | 사내메신저 | 출력물 | 직접전달
    notes: Optional[str] = None


class SingleTestDeliveryOut(SingleTestDeliveryCreate):
    id: int
    created_at: datetime
    created_by: Optional[int]
    model_config = {"from_attributes": True}


class SingleTestRequestBase(BaseModel):
    requesting_dept: str
    requester_name: str
    requester_contact: Optional[str] = None
    test_name: str
    standard_item_id: Optional[int] = None
    sample_info: Optional[str] = None
    purpose: Optional[str] = None
    desired_due_date: Optional[date] = None
    notes: Optional[str] = None


class SingleTestRequestCreate(SingleTestRequestBase):
    pass


class SingleTestRequestUpdate(SingleTestRequestBase):
    assignee_id: Optional[int] = None


class ApproveIn(BaseModel):
    execution_type: str  # 자체 | 외주
    equipment_id: Optional[int] = None
    assignee_id: Optional[int] = None
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None


class RejectIn(BaseModel):
    rejection_reason: str


class StartIn(BaseModel):
    actual_start: Optional[date] = None


class CompleteTestIn(BaseModel):
    result: str  # 합격 | 불합격 | 보류
    actual_end: Optional[date] = None


class CancelIn(BaseModel):
    reason: Optional[str] = None


class SingleTestRequestOut(SingleTestRequestBase):
    id: int
    request_number: str
    status: str
    execution_type: Optional[str] = None
    equipment_id: Optional[int] = None
    assignee_id: Optional[int] = None
    requester_user_id: Optional[int] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None
    actual_start: Optional[date] = None
    actual_end: Optional[date] = None
    result: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    attachments: list[SingleTestAttachmentOut] = []
    comments: list[SingleTestCommentOut] = []
    deliveries: list[SingleTestDeliveryOut] = []
    model_config = {"from_attributes": True}


class SingleTestRequestListOut(BaseModel):
    id: int
    request_number: str
    requesting_dept: str
    test_name: str
    status: str
    execution_type: Optional[str] = None
    assignee_id: Optional[int] = None
    desired_due_date: Optional[date] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class PaginatedSingleTestRequests(BaseModel):
    total: int
    items: list[SingleTestRequestListOut]
