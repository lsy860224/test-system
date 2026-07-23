from datetime import date
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import delete, insert, select, or_
from models.project import Project, ProjectMilestone, project_standard_items, project_standard_notes
from models.standard import StandardItem
from models.item import Item
from models.schedule import TestSchedule
from schemas.project import ProjectCreate, ProjectUpdate, MilestoneCreate
from services import pagination_helper, standard_service

def _project_membership(db: Session, project_ids: list[int]) -> dict[int, list[int]]:
    """프로젝트별로 현재 연결된(미삭제) 규격 항목 id 목록."""
    if not project_ids:
        return {}
    rows = (
        db.query(project_standard_items.c.project_id, project_standard_items.c.standard_item_id)
        .join(StandardItem, StandardItem.id == project_standard_items.c.standard_item_id)
        .filter(project_standard_items.c.project_id.in_(project_ids), StandardItem.is_deleted == False)
        .all()
    )
    membership: dict[int, list[int]] = {}
    for pid, sid in rows:
        membership.setdefault(pid, []).append(sid)
    return membership

def _round_half_up(x: float) -> int:
    return int(x + 0.5)

def compute_project_progress(db: Session, project_ids: list[int], membership: dict[int, list[int]] | None = None) -> dict[int, int]:
    """규격 항목별 최신 회차 시험 일정의 진행 일수를 계획 소요일 대비로 환산해 프로젝트 진행률(%)을 계산한다.
    - 항목별 소요일 = max(계획종료일 - 계획시작일, 1)일 (당일치기 시험도 최소 1일로 처리)
    - 시험 미시작: 0일 / 진행중: min(오늘 - 실제시작일, 소요일)일 / 완료: 전체 소요일
    - 취소된 일정, 일정이 아직 없는 항목, 프로젝트에서 이미 해제된 항목은 분모·분자 모두에서 제외한다."""
    if membership is None:
        membership = _project_membership(db, project_ids)
    valid_pairs = {(pid, sid) for pid, sids in membership.items() for sid in sids}
    if not valid_pairs:
        return {pid: 0 for pid in project_ids}

    schedules = (
        db.query(TestSchedule)
        .filter(TestSchedule.project_id.in_(project_ids), TestSchedule.status != "취소")
        .order_by(TestSchedule.round_no.desc(), TestSchedule.id.desc())
        .all()
    )
    latest: dict[tuple[int, int], TestSchedule] = {}
    for s in schedules:
        key = (s.project_id, s.standard_item_id)
        if key in valid_pairs and key not in latest:  # 회차 내림차순 정렬이라 처음 만나는 게 최신 회차
            latest[key] = s

    today = date.today()
    totals = {pid: 0 for pid in project_ids}
    progressed = {pid: 0 for pid in project_ids}
    for (pid, _sid), s in latest.items():
        duration = max((s.planned_end - s.planned_start).days, 1)
        totals[pid] += duration
        if s.actual_end:
            progressed[pid] += duration
        elif s.actual_start:
            elapsed = (today - s.actual_start).days
            progressed[pid] += max(0, min(elapsed, duration))

    return {
        pid: (_round_half_up(progressed[pid] / totals[pid] * 100) if totals[pid] > 0 else 0)
        for pid in project_ids
    }

def list_projects(db: Session, page: int, size: int, customer_id, status, phase=None, search=None) -> dict:
    q = db.query(Project)
    if customer_id:
        q = q.filter(Project.customer_id == customer_id)
    if status:
        q = q.filter(Project.status == status)
    if phase:
        q = q.filter(Project.phase == phase)
    if search:
        like = f"%{search}%"
        matching_item_ids = [i.id for i in db.query(Item.id).filter(Item.name.ilike(like)).all()]
        q = q.filter(or_(
            Project.name.ilike(like),
            Project.project_code.ilike(like),
            Project.item_id.in_(matching_item_ids),
        ))
    result = pagination_helper.paginate(q.order_by(Project.created_at.desc()), page, size)
    item_names = {i.id: i.name for i in db.query(Item).all()}
    project_ids = [p.id for p in result["items"]]
    membership = _project_membership(db, project_ids)
    progress_map = compute_project_progress(db, project_ids, membership)
    for p in result["items"]:
        p.item_name = item_names.get(p.item_id)
        p.standard_item_count = len(membership.get(p.id, []))
        p.progress_pct = progress_map.get(p.id, 0)
    return result

def get_project(db: Session, project_id: int) -> Project:
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    return p

def get_project_out(db: Session, project_id: int) -> Project:
    """API 응답용 — 진행률을 최신 시험 일정 기준으로 재계산해서 반환한다."""
    p = get_project(db, project_id)
    p.progress_pct = compute_project_progress(db, [project_id]).get(project_id, 0)
    return p

def create_project(db: Session, body: ProjectCreate, created_by: int) -> Project:
    project = Project(**body.model_dump(), progress_pct=0, created_by=created_by)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

def update_project(db: Session, project_id: int, body: ProjectUpdate) -> Project:
    project = get_project(db, project_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    project.progress_pct = compute_project_progress(db, [project_id]).get(project_id, 0)
    return project

def delete_project(db: Session, project_id: int):
    project = get_project(db, project_id)
    project.status = "취소"
    db.commit()

def add_milestone(db: Session, project_id: int, body: MilestoneCreate) -> ProjectMilestone:
    get_project(db, project_id)
    ms = ProjectMilestone(project_id=project_id, **body.model_dump(), delay_days=0)
    db.add(ms)
    db.commit()
    db.refresh(ms)
    return ms

# ── 프로젝트-규격 항목 연동 ────────────────────────────────────
def list_co_candidates(db: Session, item_id: int, exclude_project_id: int | None = None) -> list[dict]:
    """C/O 대상 후보 — 같은 아이템(item_id)을 쓰는 다른 프로젝트들의 실제 시험 일정."""
    q = (
        db.query(TestSchedule, Project)
        .join(Project, Project.id == TestSchedule.project_id)
        .filter(Project.item_id == item_id, Project.vehicle_model.isnot(None), Project.vehicle_model != "")
    )
    if exclude_project_id is not None:
        q = q.filter(Project.id != exclude_project_id)
    rows = q.order_by(TestSchedule.standard_item_id, TestSchedule.round_no.desc()).all()
    return [
        {
            "schedule_id": s.id,
            "project_id": p.id,
            "project_name": p.name,
            "vehicle_model": p.vehicle_model,
            "standard_item_id": s.standard_item_id,
            "round_no": s.round_no,
            "test_type": s.test_type,
            "planned_start": s.planned_start,
            "planned_end": s.planned_end,
            "actual_start": s.actual_start,
            "actual_end": s.actual_end,
            "result": s.result,
        }
        for s, p in rows
    ]

def get_project_standard_items(db: Session, project_id: int) -> list:
    get_project(db, project_id)
    rows = (
        db.query(StandardItem, project_standard_items.c.is_carry_over, project_standard_items.c.co_source_schedule_id)
        .join(project_standard_items, project_standard_items.c.standard_item_id == StandardItem.id)
        .filter(project_standard_items.c.project_id == project_id, StandardItem.is_deleted == False)
        .order_by(StandardItem.standard_code)
        .all()
    )
    schedule_ids = [sid for _, _, sid in rows if sid]
    schedule_map: dict[int, tuple[TestSchedule, Project]] = {}
    if schedule_ids:
        for s, p in (
            db.query(TestSchedule, Project)
            .join(Project, Project.id == TestSchedule.project_id)
            .filter(TestSchedule.id.in_(schedule_ids))
            .all()
        ):
            schedule_map[s.id] = (s, p)

    items = []
    for item, is_carry_over, co_source_schedule_id in rows:
        item.is_carry_over = bool(is_carry_over)
        item.co_source_schedule_id = co_source_schedule_id
        sched = schedule_map.get(co_source_schedule_id)
        if sched:
            s, p = sched
            item.co_vehicle_model = p.vehicle_model
            item.co_project_name = p.name
            item.co_round_no = s.round_no
            item.co_planned_start = s.planned_start
            item.co_planned_end = s.planned_end
            item.co_actual_start = s.actual_start
            item.co_actual_end = s.actual_end
            item.co_result = s.result
        else:
            item.co_vehicle_model = None
            item.co_project_name = None
            item.co_round_no = None
            item.co_planned_start = None
            item.co_planned_end = None
            item.co_actual_start = None
            item.co_actual_end = None
            item.co_result = None
        items.append(item)
    return standard_service.attach_category_names(db, items)

def set_project_standard_items(db: Session, project_id: int, selections: list[dict]) -> list:
    get_project(db, project_id)
    db.execute(delete(project_standard_items).where(project_standard_items.c.project_id == project_id))
    if selections:
        db.execute(insert(project_standard_items).values([
            {
                "project_id": project_id,
                "standard_item_id": s["standard_item_id"],
                "is_carry_over": s.get("is_carry_over", False),
                "co_source_schedule_id": s.get("co_source_schedule_id") if s.get("is_carry_over") else None,
            }
            for s in selections
        ]))
    db.commit()
    return get_project_standard_items(db, project_id)

# ── 프로젝트-규격(standard_no) 단위 비고 ───────────────────────
def get_project_standard_notes(db: Session, project_id: int) -> list:
    get_project(db, project_id)
    rows = db.execute(
        select(project_standard_notes.c.standard_no, project_standard_notes.c.notes)
        .where(project_standard_notes.c.project_id == project_id)
    ).all()
    return [{"standard_no": r.standard_no, "notes": r.notes} for r in rows]

def set_project_standard_notes(db: Session, project_id: int, notes_list: list[dict]) -> list:
    get_project(db, project_id)
    db.execute(delete(project_standard_notes).where(project_standard_notes.c.project_id == project_id))
    entries = [n for n in notes_list if (n.get("notes") or "").strip()]
    if entries:
        db.execute(insert(project_standard_notes).values([
            {"project_id": project_id, "standard_no": n["standard_no"], "notes": n["notes"]}
            for n in entries
        ]))
    db.commit()
    return get_project_standard_notes(db, project_id)
