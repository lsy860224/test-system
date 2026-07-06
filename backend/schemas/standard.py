from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

class StandardCategoryOut(BaseModel):
    id: int
    code: str
    name_ko: str
    color_hex: str
    model_config = {"from_attributes": True}

class StandardItemBase(BaseModel):
    standard_no: Optional[str] = None
    standard_name: Optional[str] = None
    revision_no: Optional[str] = None
    standard_code: str
    name: str
    category_id: Optional[int] = None
    test_condition_summary: Optional[str] = None
    test_condition_detail: Optional[str] = None
    source_type: str = "검토중"
    vendor_id: Optional[int] = None
    status: str = "대기"
    priority: str = "Med"
    dv_target_date: Optional[date] = None
    dv_actual_date: Optional[date] = None
    pv_target_date: Optional[date] = None
    pv_actual_date: Optional[date] = None
    assignee_id: Optional[int] = None
    notes: Optional[str] = None

class StandardItemCreate(StandardItemBase):
    pass

class StandardItemUpdate(StandardItemBase):
    pass

class StandardItemOut(StandardItemBase):
    id: int
    priority_score: int
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    model_config = {"from_attributes": True}

class StandardStatusPatch(BaseModel):
    status: str

class StandardBulkStatus(BaseModel):
    ids: list[int]
    status: str

class StandardHistoryOut(BaseModel):
    id: int
    field_name: Optional[str]
    old_value: Optional[str]
    new_value: Optional[str]
    changed_at: datetime
    model_config = {"from_attributes": True}

class PaginatedStandardItems(BaseModel):
    total: int
    items: list[StandardItemOut]
