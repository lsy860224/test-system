from datetime import date, timedelta
from sqlalchemy.orm import Session
from models.schedule import TestSchedule
from models.ncr import NCRReport
from models.project import Project
from models.standard import StandardItem
from services import equipment_service
from services.schedule_service import compute_status

SEVERITY_ORDER = {"High": 0, "Med": 1, "Low": 2}
CAP_PER_TYPE = 10  # 밀린 항목이 많아도 보드가 스크롤 지옥이 되지 않도록 종류별 상한


def get_todo_cards(db: Session) -> dict:
    today = date.today()

    proj_names = {p.id: p.name for p in db.query(Project).all()}
    std_names = {s.id: s.name for s in db.query(StandardItem).all()}

    # ── 1. NCR 미작성 ──────────────────────────────────────
    ncr_cards: list[dict] = []
    failed_schedules = db.query(TestSchedule).filter(TestSchedule.result == "불합격").all()
    linked_schedule_ids = {n.test_schedule_id for n in db.query(NCRReport.test_schedule_id).filter(NCRReport.test_schedule_id.isnot(None)).all()}
    for s in failed_schedules:
        if s.id in linked_schedule_ids:
            continue
        ncr_cards.append({
            "type": "ncr_pending",
            "severity": "High",
            "title": f"NCR 작성 필요 — {proj_names.get(s.project_id, '(프로젝트 미상)')}",
            "description": f"{std_names.get(s.standard_item_id, '')} 시험 불합격 — 연결된 NCR이 없습니다",
            "link_path": "/schedule",
            "action": {
                "kind": "ncr_new",
                "test_schedule_id": s.id,
                "standard_item_id": s.standard_item_id,
                "issue_summary": f"{std_names.get(s.standard_item_id, '')} 시험 불합격",
            },
            "_sort": 0,
        })

    draft_ncrs = db.query(NCRReport).filter(NCRReport.status == "초기분석").all()
    for n in draft_ncrs:
        days_open = (today - n.detected_date).days if n.detected_date else 0
        ncr_cards.append({
            "type": "ncr_pending",
            "severity": "Med",
            "title": f"작성 미완료 — {n.ncr_number}",
            "description": f"{n.part_name} — {n.issue_summary}",
            "link_path": "/ncr",
            "action": {"kind": "ncr_edit", "ncr_id": n.id},
            "_sort": -days_open,  # 오래 방치된 것부터
        })

    # ── 2. 교정 만료 임박/만료 ────────────────────────────────
    calibration_cards: list[dict] = []
    for a in equipment_service.get_calibration_alerts(db, days=60):
        expired = a["days_to_expiry"] < 0
        calibration_cards.append({
            "type": "calibration",
            "severity": "High" if expired else "Med",
            "title": f"교정 {'만료' if expired else '만료 임박'} — {a['name']}",
            "description": f"만료일 {a['latest_expiry']} ({'D+' + str(abs(a['days_to_expiry'])) if expired else 'D-' + str(a['days_to_expiry'])})",
            "link_path": "/equipment",
            "action": {"kind": "equipment_edit", "equipment_id": a["id"]},
            "_sort": a["days_to_expiry"],  # 만료에 가까울수록(음수일수록) 우선
        })

    # ── 3. 시험 마감 임박 ─────────────────────────────────────
    deadline_cards: list[dict] = []
    deadline_candidates = db.query(TestSchedule).filter(
        TestSchedule.planned_end <= today + timedelta(days=7),
    ).all()
    deadline_schedules = [s for s in deadline_candidates if compute_status(s) not in ("완료", "취소")]
    for s in deadline_schedules:
        days_left = (s.planned_end - today).days
        overdue = days_left < 0
        deadline_cards.append({
            "type": "deadline",
            "severity": "High" if overdue else "Med",
            "title": f"시험 마감 {'초과' if overdue else f'D-{days_left}'} — {proj_names.get(s.project_id, '(프로젝트 미상)')}",
            "description": f"{std_names.get(s.standard_item_id, '')} (계획 완료 {s.planned_end.isoformat()})",
            "link_path": "/schedule",
            "action": {"kind": "schedule_result", "schedule_id": s.id},
            "_sort": days_left,  # 마감이 가까울수록(더 밀렸을수록) 우선
        })

    def cap(group: list[dict]) -> tuple[list[dict], int]:
        group.sort(key=lambda c: c["_sort"])
        total = len(group)
        for c in group:
            del c["_sort"]
        return group[:CAP_PER_TYPE], total

    ncr_shown, ncr_total = cap(ncr_cards)
    cal_shown, cal_total = cap(calibration_cards)
    deadline_shown, deadline_total = cap(deadline_cards)

    items = ncr_shown + cal_shown + deadline_shown
    items.sort(key=lambda c: SEVERITY_ORDER.get(c["severity"], 9))

    return {
        "items": items,
        "total": ncr_total + cal_total + deadline_total,
        "by_type_total": {"ncr_pending": ncr_total, "calibration": cal_total, "deadline": deadline_total},
    }
