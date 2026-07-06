from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

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
    part_name: Optional[str] = None
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
    part_name: Optional[str]
    phase: str
    status: str
    progress_pct: int
    target_date: Optional[date]
    customer_id: int
    assignee_id: Optional[int] = None
    model_config = {"from_attributes": True}

class PaginatedProjects(BaseModel):
    total: int
    items: list[ProjectListOut]
