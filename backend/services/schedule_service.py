from datetime import date, timedelta
from fastapi import HTTPException
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from models.schedule import TestSchedule
from models.project import Project
from models.standard import StandardItem
from models.customer import Customer
from models.item import Item
from models.vendor import VendorOrder
from models.ncr import NCRReport
from schemas.schedule import TestScheduleCreate, TestScheduleUpdate, TestScheduleResultPatch
from services import pagination_helper

STATUS_KEYS = ["계획", "준비중", "진행중", "완료", "지연", "취소"]


def compute_status(schedule: TestSchedule) -> str:
    """저장된 status는 '취소'만 신뢰하고, 나머지는 실제 날짜를 기준으로 매번 다시 판정한다.
    계획 - 시험 항목 선택 O, 일정 수립 X (일정 자체가 없는 경우 — 이 함수 밖에서 처리)
    준비중 - 일정 수립 O, 시험 시작 X, 계획 시작일 아직 안 지남
    지연 - 일정 수립 O, 시험 시작 X, 계획 시작일 지남
    진행중 - 시험 시작 O, 시험 종료 X
    완료 - 시험 종료 O
    취소 - 별도 수동 입력
    """
    if schedule.status == "취소":
        return "취소"
    if schedule.actual_end:
        return "완료"
    if schedule.actual_start:
        return "진행중"
    if date.today() > schedule.planned_start:
        return "지연"
    return "준비중"


def _sync_vendor_orders(db: Session, schedule: TestSchedule) -> None:
    """연계된 발주의 상태를 시험 일정 실제 진행 상태에 맞춰 갱신한다.
    진행중/완료만 자동 반영 — 취소는 비용 문제가 걸려 있어 발주 쪽에서 수동으로만 처리한다."""
    display_status = compute_status(schedule)
    target = {"진행중": "진행중", "완료": "완료"}.get(display_status)
    if not target:
        return
    orders = db.query(VendorOrder).filter(VendorOrder.schedule_id == schedule.id).all()
    changed = False
    for o in orders:
        if o.status == "취소":
            continue
        if o.status == "완료" and target == "진행중":
            continue
        if o.status != target:
            o.status = target
            changed = True
    if changed:
        db.commit()


def start_schedule(db: Session, schedule_id: int) -> TestSchedule:
    schedule = get_schedule(db, schedule_id)
    if schedule.actual_start:
        raise HTTPException(status_code=400, detail="이미 시작된 시험입니다")
    schedule.actual_start = date.today()
    db.commit()
    db.refresh(schedule)
    _sync_vendor_orders(db, schedule)
    return schedule


def list_schedules(db: Session, page: int, size: int, project_id, status, test_type, search=None) -> dict:
    q = db.query(TestSchedule)
    if project_id:
        q = q.filter(TestSchedule.project_id == project_id)
    if status:
        q = q.filter(TestSchedule.status == status)
    if test_type:
        q = q.filter(TestSchedule.test_type == test_type)
    if search:
        like = f"%{search}%"
        matching_project_ids = [p.id for p in db.query(Project.id).filter(
            or_(Project.name.ilike(like), Project.project_code.ilike(like))
        ).all()]
        matching_std_ids = [s.id for s in db.query(StandardItem.id).filter(
            or_(StandardItem.name.ilike(like), StandardItem.standard_code.ilike(like), StandardItem.standard_no.ilike(like))
        ).all()]
        q = q.filter(or_(
            TestSchedule.project_id.in_(matching_project_ids),
            TestSchedule.standard_item_id.in_(matching_std_ids),
        ))
    result = pagination_helper.paginate(q.order_by(TestSchedule.planned_start), page, size)

    projects_all = db.query(Project).all()
    proj_names = {p.id: p.name for p in projects_all}
    std_items_all = db.query(StandardItem).all()
    std_names = {s.id: s.name for s in std_items_all}
    std_codes = {s.id: s.standard_code for s in std_items_all}
    for it in result["items"]:
        it.project_name = proj_names.get(it.project_id)
        it.standard_name = std_names.get(it.standard_item_id)
        it.standard_code = std_codes.get(it.standard_item_id)
        it.display_status = compute_status(it)
    return result

def get_schedule(db: Session, schedule_id: int) -> TestSchedule:
    s = db.query(TestSchedule).filter(TestSchedule.id == schedule_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="시험 일정을 찾을 수 없습니다")
    return s

def create_schedule(db: Session, body: TestScheduleCreate, created_by: int) -> TestSchedule:
    schedule = TestSchedule(**body.model_dump(), status="계획", created_by=created_by)
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule

def update_schedule(db: Session, schedule_id: int, body: TestScheduleUpdate) -> TestSchedule:
    schedule = get_schedule(db, schedule_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(schedule, field, value)
    db.commit()
    db.refresh(schedule)
    _sync_vendor_orders(db, schedule)
    return schedule

def record_result(db: Session, schedule_id: int, body: TestScheduleResultPatch, changed_by: int) -> TestSchedule:
    schedule = get_schedule(db, schedule_id)
    schedule.result = body.result
    schedule.data_path = body.data_path
    if body.result == "보류":
        # 보류는 판단 유보일 뿐 시험이 끝난 게 아니므로 '완료'로 넘기지 않고 '진행중'으로 되돌린다.
        schedule.status = "진행중"
        schedule.actual_end = None
    else:
        schedule.status = "완료"
        if body.actual_end:
            schedule.actual_end = body.actual_end
    db.commit()
    db.refresh(schedule)
    _sync_vendor_orders(db, schedule)
    return schedule

def delete_schedule(db: Session, schedule_id: int):
    schedule = get_schedule(db, schedule_id)
    schedule.status = "취소"
    db.commit()

def create_retest(db: Session, schedule_id: int, created_by: int) -> TestSchedule:
    """불합격 판정된 시험을 새 회차(round_no+1)로 등록한다.
    기존 회차 레코드는 그대로 두어 최초 불합격 시점의 데이터·이력을 보존한다."""
    original = get_schedule(db, schedule_id)
    if original.result != "불합격":
        raise HTTPException(status_code=400, detail="결과가 '불합격'인 시험만 재시험으로 등록할 수 있습니다")
    max_round = db.query(func.max(TestSchedule.round_no)).filter(
        TestSchedule.project_id == original.project_id,
        TestSchedule.standard_item_id == original.standard_item_id,
    ).scalar() or 1
    duration = max((original.planned_end - original.planned_start).days, 0)
    planned_start = date.today()
    retest = TestSchedule(
        project_id=original.project_id,
        standard_item_id=original.standard_item_id,
        test_type=original.test_type,
        equipment_id=original.equipment_id,
        assignee_id=original.assignee_id,
        planned_start=planned_start,
        planned_end=planned_start + timedelta(days=duration),
        status="계획",
        round_no=max_round + 1,
        created_by=created_by,
    )
    db.add(retest)
    db.commit()
    db.refresh(retest)
    return retest

# ── Gantt 뷰 (프로젝트별 그룹) ─────────────────────────────
def get_gantt_data(db: Session, project_id: int | None, status: str | None) -> dict:
    proj_q = db.query(Project).filter(Project.status == "활성") if not project_id else db.query(Project).filter(Project.id == project_id)
    projects = proj_q.order_by(Project.project_code).all()
    if not projects:
        return {"projects": []}

    std_names = {s.id: s.name for s in db.query(StandardItem).all()}

    proj_ids = [p.id for p in projects]
    sched_q = db.query(TestSchedule).filter(TestSchedule.project_id.in_(proj_ids), TestSchedule.status != "취소")
    if status:
        sched_q = sched_q.filter(TestSchedule.status == status)
    schedules = sched_q.order_by(TestSchedule.planned_start).all()

    by_project: dict[int, list] = {p.id: [] for p in projects}
    for s in schedules:
        by_project.setdefault(s.project_id, []).append({
            "id": s.id,
            "standard_name": std_names.get(s.standard_item_id, ""),
            "test_type": s.test_type,
            "planned_start": s.planned_start.isoformat(),
            "planned_end": s.planned_end.isoformat(),
            "actual_start": s.actual_start.isoformat() if s.actual_start else None,
            "actual_end": s.actual_end.isoformat() if s.actual_end else None,
            "status": compute_status(s),
            "result": s.result,
        })

    return {
        "projects": [
            {
                "project_id": p.id,
                "project_code": p.project_code,
                "project_name": p.name,
                "phase": p.phase,
                "schedules": by_project.get(p.id, []),
            }
            for p in projects if by_project.get(p.id)
        ]
    }


# ── 프로젝트별 그룹 목록 (시험 일정 '목록' 탭) ──────────────
def _item_status_for_project(db: Session, project_id: int, standard_item_id: int) -> tuple[TestSchedule | None, str]:
    schedule = (
        db.query(TestSchedule)
        .filter(TestSchedule.project_id == project_id, TestSchedule.standard_item_id == standard_item_id)
        .order_by(TestSchedule.id.desc())
        .first()
    )
    if not schedule:
        return None, "계획"
    return schedule, compute_status(schedule)


def get_project_summary(db: Session, page: int, size: int, search: str | None = None) -> dict:
    q = db.query(Project)
    if search:
        like = f"%{search}%"
        matching_item_ids = [i.id for i in db.query(Item.id).filter(Item.name.ilike(like)).all()]
        q = q.filter(or_(
            Project.name.ilike(like),
            Project.project_code.ilike(like),
            Project.item_id.in_(matching_item_ids),
        ))
    paged = pagination_helper.paginate(q.order_by(Project.id.desc()), page, size)
    total = paged["total"]
    projects = paged["items"]

    customer_names = {c.id: c.name for c in db.query(Customer).all()}
    item_names = {i.id: i.name for i in db.query(Item).all()}

    result_items = []
    for p in projects:
        standard_ids = [s.id for s in p.standard_items if not s.is_deleted]
        counts = {k: 0 for k in STATUS_KEYS}
        for sid in standard_ids:
            _, st = _item_status_for_project(db, p.id, sid)
            counts[st] = counts.get(st, 0) + 1
        result_items.append({
            "project_id": p.id,
            "project_name": p.name,
            "project_code": p.project_code,
            "customer_name": customer_names.get(p.customer_id),
            "item_name": item_names.get(p.item_id),
            "phase": p.phase,
            "total_items": len(standard_ids),
            "status_counts": counts,
        })
    return {"total": total, "items": result_items}


def get_project_schedule_detail(db: Session, project_id: int) -> dict:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")

    customer = db.query(Customer).filter(Customer.id == project.customer_id).first()
    item = db.query(Item).filter(Item.id == project.item_id).first() if project.item_id else None

    std_items = sorted(
        (s for s in project.standard_items if not s.is_deleted),
        key=lambda s: (s.standard_no or "", s.standard_code or ""),
    )

    linked_schedule_ids = {
        n.test_schedule_id for n in
        db.query(NCRReport.test_schedule_id).filter(NCRReport.test_schedule_id.isnot(None)).all()
    }

    groups: dict[str, dict] = {}
    counts = {k: 0 for k in STATUS_KEYS}
    for s in std_items:
        schedules = (
            db.query(TestSchedule)
            .filter(TestSchedule.project_id == project_id, TestSchedule.standard_item_id == s.id)
            .order_by(TestSchedule.round_no.asc(), TestSchedule.id.asc())
            .all()
        )
        key = s.standard_no or ""
        g = groups.setdefault(key, {
            "standard_no": s.standard_no,
            "standard_name": s.standard_name,
            "revision_no": s.revision_no,
            "items": [],
        })

        if not schedules:
            counts["계획"] += 1
            g["items"].append({
                "standard_item_id": s.id,
                "standard_code": s.standard_code,
                "name": s.name,
                "round_no": 1,
                "schedule_id": None,
                "test_type": None,
                "planned_start": None,
                "planned_end": None,
                "actual_start": None,
                "actual_end": None,
                "display_status": "계획",
                "result": None,
                "data_path": None,
                "has_ncr": False,
                "can_retest": False,
            })
            continue

        last_idx = len(schedules) - 1
        for idx, schedule in enumerate(schedules):
            st = compute_status(schedule)
            if idx == last_idx:
                # 회차가 여러 개여도 상단 요약(summary)에는 가장 최근 회차 상태만 반영한다 —
                # 이 카운트는 "규격 항목 단위" 진행 현황이지 "시도 횟수"가 아니기 때문.
                counts[st] = counts.get(st, 0) + 1
            g["items"].append({
                "standard_item_id": s.id,
                "standard_code": s.standard_code,
                "name": s.name if schedule.round_no <= 1 else f"{s.name} 재시험 {schedule.round_no}",
                "round_no": schedule.round_no,
                "schedule_id": schedule.id,
                "test_type": schedule.test_type,
                "planned_start": schedule.planned_start.isoformat() if schedule.planned_start else None,
                "planned_end": schedule.planned_end.isoformat() if schedule.planned_end else None,
                "actual_start": schedule.actual_start.isoformat() if schedule.actual_start else None,
                "actual_end": schedule.actual_end.isoformat() if schedule.actual_end else None,
                "display_status": st,
                "result": schedule.result,
                "data_path": schedule.data_path,
                "has_ncr": schedule.id in linked_schedule_ids,
                "can_retest": idx == last_idx and schedule.result == "불합격",
            })

    return {
        "project": {
            "id": project.id,
            "name": project.name,
            "project_code": project.project_code,
            "customer_name": customer.name if customer else None,
            "item_name": item.name if item else None,
            "phase": project.phase,
            "status": project.status,
            "start_date": project.start_date.isoformat() if project.start_date else None,
            "target_date": project.target_date.isoformat() if project.target_date else None,
        },
        "summary": counts,
        "standards": sorted(groups.values(), key=lambda g: (g["standard_no"] or "")),
    }
