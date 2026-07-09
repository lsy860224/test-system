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
    sop_status: str = "없음"   # 없음/작성중/완료 — 연동된 시험절차서 중 최고 상태
    sop_count: int = 0
    model_config = {"from_attributes": True}

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

class StandardGroupUpdate(BaseModel):
    old_standard_no: Optional[str] = None   # 현재 규격 No. (그룹 식별자, 미지정 그룹은 None)
    standard_no: Optional[str] = None
    standard_name: Optional[str] = None
    revision_no: Optional[str] = None

class StandardGroupUpdateResult(BaseModel):
    updated: int
