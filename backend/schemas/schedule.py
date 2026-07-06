from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

class VendorBase(BaseModel):
    name: str
    location: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    accreditation_type: Optional[str] = None
    accreditation_number: Optional[str] = None
    accreditation_scope: Optional[str] = None
    lead_time_days: Optional[int] = None
    notes: Optional[str] = None

class VendorCreate(VendorBase):
    pass

class VendorOut(VendorBase):
    id: int
    is_active: bool
    model_config = {"from_attributes": True}

class TestScheduleBase(BaseModel):
    project_id: int
    standard_item_id: int
    test_type: str
    equipment_id: Optional[int] = None
    vendor_id: Optional[int] = None
    planned_start: date
    planned_end: date
    actual_start: Optional[date] = None
    actual_end: Optional[date] = None
    assignee_id: Optional[int] = None
    data_path: Optional[str] = None
    notes: Optional[str] = None

class TestScheduleCreate(TestScheduleBase):
    pass

class TestScheduleUpdate(TestScheduleBase):
    pass

class TestScheduleResultPatch(BaseModel):
    result: str        # 합격 | 불합격 | 보류
    actual_end: Optional[date] = None
    data_path: str      # 시험 데이터 저장 경로 — 합격/불합격 무관하게 필수

class TestScheduleOut(TestScheduleBase):
    id: int
    status: str
    result: Optional[str]
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class TestScheduleListOut(BaseModel):
    id: int
    project_id: int
    standard_item_id: int
    project_name: Optional[str] = None
    project_part_name: Optional[str] = None
    standard_name: Optional[str] = None
    standard_code: Optional[str] = None
    test_type: str
    planned_start: date
    planned_end: date
    status: str
    display_status: Optional[str] = None
    result: Optional[str]
    data_path: Optional[str] = None
    assignee_id: Optional[int] = None
    model_config = {"from_attributes": True}

class PaginatedSchedules(BaseModel):
    total: int
    items: list[TestScheduleListOut]
