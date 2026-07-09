from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from dependencies import get_db, require_staff
from schemas.schedule import TestScheduleCreate, TestScheduleUpdate, TestScheduleOut, TestScheduleResultPatch, PaginatedSchedules
from services import schedule_service

router = APIRouter(prefix="/schedules", tags=["시험 일정"])

# ── Gantt 뷰 (literal path → /{schedule_id} 보다 먼저 정의) ──
@router.get("/gantt")
def gantt_view(
    project_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    return schedule_service.get_gantt_data(db, project_id, status)

@router.get("/by-project-summary")
def by_project_summary(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=1000),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    return schedule_service.get_project_summary(db, page, size, search)

@router.get("/", response_model=PaginatedSchedules)
def list_schedules(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=1000),
    project_id: Optional[int] = None,
    status: Optional[str] = None,
    test_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    return schedule_service.list_schedules(db, page, size, project_id, status, test_type, search)

@router.post("/", response_model=TestScheduleOut, status_code=201)
def create_schedule(body: TestScheduleCreate, db: Session = Depends(get_db), current_user=Depends(require_staff)):
    return schedule_service.create_schedule(db, body, current_user.id)

@router.get("/{schedule_id}", response_model=TestScheduleOut)
def get_schedule(schedule_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return schedule_service.get_schedule(db, schedule_id)

@router.put("/{schedule_id}", response_model=TestScheduleOut)
def update_schedule(schedule_id: int, body: TestScheduleUpdate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return schedule_service.update_schedule(db, schedule_id, body)

@router.patch("/{schedule_id}/start", response_model=TestScheduleOut)
def start_schedule(schedule_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return schedule_service.start_schedule(db, schedule_id)

@router.patch("/{schedule_id}/result", response_model=TestScheduleOut)
def record_result(schedule_id: int, body: TestScheduleResultPatch, db: Session = Depends(get_db), current_user=Depends(require_staff)):
    return schedule_service.record_result(db, schedule_id, body, current_user.id)

@router.post("/{schedule_id}/retest", response_model=TestScheduleOut, status_code=201)
def create_retest(schedule_id: int, db: Session = Depends(get_db), current_user=Depends(require_staff)):
    return schedule_service.create_retest(db, schedule_id, current_user.id)

@router.delete("/{schedule_id}", status_code=204)
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    schedule_service.delete_schedule(db, schedule_id)
