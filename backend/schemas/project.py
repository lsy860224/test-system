from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from schemas.standard import StandardItemOut

class MilestoneBase(BaseModel):
    name: str
    milestone_type: Optional[str] = None
    planned_date: Optional[date] = None
    actual_date: Optional[date] = None
    status: str = "예정"
    is_critical: bool = False
    notes: Optional[str] = None

class MilestoneCreate(MilestoneBase):
    pass

class MilestoneOut(MilestoneBase):
    id: int
    project_id: int
    delay_days: int
    model_config = {"from_attributes": True}

class ProjectBase(BaseModel):
    customer_id: int
    item_id: Optional[int] = None
    name: str
    project_code: Optional[str] = None
    vehicle_model: Optional[str] = None
    phase: str = "개발"
    status: str = "활성"
    start_date: Optional[date] = None
    target_date: Optional[date] = None
    actual_date: Optional[date] = None
    assignee_id: Optional[int] = None
    notes: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    pass

class ProjectOut(ProjectBase):
    id: int
    progress_pct: int
    created_at: datetime
    updated_at: datetime
    milestones: list[MilestoneOut] = []
    model_config = {"from_attributes": True}

class ProjectListOut(BaseModel):
    id: int
    name: str
    project_code: Optional[str]
    item_id: Optional[int] = None
    item_name: Optional[str] = None
    phase: str
    status: str
    progress_pct: int
    standard_item_count: int = 0
    target_date: Optional[date]
    customer_id: int
    assignee_id: Optional[int] = None
    model_config = {"from_attributes": True}

class PaginatedProjects(BaseModel):
    total: int
    items: list[ProjectListOut]

# ── 프로젝트-규격 항목 연동 ────────────────────────────────────
class ProjectStandardItemOut(StandardItemOut):
    is_carry_over: bool = False
    co_source_schedule_id: Optional[int] = None
    # 아래는 co_source_schedule_id가 가리키는 실제 시험 일정의 표시용 스냅샷(조회 시 조인해서 채움)
    co_vehicle_model: Optional[str] = None
    co_project_name: Optional[str] = None
    co_round_no: Optional[int] = None
    co_planned_start: Optional[date] = None
    co_planned_end: Optional[date] = None
    co_actual_start: Optional[date] = None
    co_actual_end: Optional[date] = None
    co_result: Optional[str] = None

class StandardItemSelection(BaseModel):
    standard_item_id: int
    is_carry_over: bool = False
    co_source_schedule_id: Optional[int] = None

class StandardItemSelections(BaseModel):
    items: list[StandardItemSelection]

# ── C/O 후보 — 같은 아이템을 쓰는 타 프로젝트의 실제 시험 일정 ─────
class CoCandidateOut(BaseModel):
    schedule_id: int
    project_id: int
    project_name: str
    vehicle_model: str
    standard_item_id: int
    round_no: int
    test_type: Optional[str] = None
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None
    actual_start: Optional[date] = None
    actual_end: Optional[date] = None
    result: Optional[str] = None
    model_config = {"from_attributes": True}

# ── 프로젝트-규격(standard_no) 단위 비고 ───────────────────────
class ProjectStandardNoteOut(BaseModel):
    standard_no: str
    notes: Optional[str] = None
    model_config = {"from_attributes": True}

class ProjectStandardNoteIn(BaseModel):
    standard_no: str
    notes: Optional[str] = None

class ProjectStandardNotesUpdate(BaseModel):
    notes: list[ProjectStandardNoteIn]
