from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from dependencies import get_db, require_staff
from schemas.project import ProjectCreate, ProjectUpdate, ProjectOut, PaginatedProjects, MilestoneCreate, MilestoneOut
from schemas.standard import StandardItemOut
from services import project_service, schedule_service

class StandardItemIds(BaseModel):
    standard_item_ids: list[int]

router = APIRouter(prefix="/projects", tags=["프로젝트 관리"])

@router.get("/", response_model=PaginatedProjects)
def list_projects(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=1000),
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
    phase: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    return project_service.list_projects(db, page, size, customer_id, status, phase, search)

@router.post("/", response_model=ProjectOut, status_code=201)
def create_project(body: ProjectCreate, db: Session = Depends(get_db), current_user=Depends(require_staff)):
    return project_service.create_project(db, body, current_user.id)

@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return project_service.get_project(db, project_id)

@router.put("/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, body: ProjectUpdate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return project_service.update_project(db, project_id, body)

@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    project_service.delete_project(db, project_id)

@router.post("/{project_id}/milestones", response_model=MilestoneOut, status_code=201)
def add_milestone(project_id: int, body: MilestoneCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return project_service.add_milestone(db, project_id, body)

@router.get("/{project_id}/standard-items", response_model=list[StandardItemOut])
def get_project_standard_items(project_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return project_service.get_project_standard_items(db, project_id)

@router.put("/{project_id}/standard-items", response_model=list[StandardItemOut])
def set_project_standard_items(project_id: int, body: StandardItemIds, db: Session = Depends(get_db), _=Depends(require_staff)):
    return project_service.set_project_standard_items(db, project_id, body.standard_item_ids)

@router.get("/{project_id}/schedule-detail")
def get_project_schedule_detail(project_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return schedule_service.get_project_schedule_detail(db, project_id)
