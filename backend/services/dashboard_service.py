import calendar as cal_mod
from datetime import date
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from models.standard import StandardItem
from models.ncr import NCRReport
from models.project import Project, project_standard_items
from models.schedule import TestSchedule
from models.equipment import Equipment, EquipmentCalibration, EquipmentStandardMapping
from models.vendor import VendorLab
from models.sop import SOP
from services.schedule_service import compute_status


def get_summary(db: Session, year: int | None = None) -> dict:
    today = date.today()
    y = year or today.year

    # ── 규격 역량 현황 ──────────────────────────────────────────
    total_standards = db.query(StandardItem).filter(StandardItem.is_deleted == False).count()
    self_count = db.query(StandardItem).filter(StandardItem.is_deleted == False, StandardItem.source_type == "자체").count()
    outsource_count = db.query(StandardItem).filter(StandardItem.is_deleted == False, StandardItem.source_type == "외주").count()
    pending_count = db.query(StandardItem).filter(StandardItem.is_deleted == False, StandardItem.source_type == "검토중").count()
    confirmed_count = self_count + outsource_count
    coverage_pct = round(confirmed_count / total_standards * 100, 1) if total_standards > 0 else 0

    # ── 미결 NCR ──────────────────────────────────────────────
    open_filter = NCRReport.status.notin_(["완료", "취소"])
    managed = db.query(NCRReport).filter(
        open_filter,
        (NCRReport.due_date == None) | (NCRReport.due_date >= today),
    ).count()
    overdue = db.query(NCRReport).filter(
        open_filter,
        NCRReport.due_date != None,
        NCRReport.due_date < today,
    ).count()
    ncr_completed = db.query(NCRReport).filter(
        NCRReport.status == "완료",
    ).count()
    ncr_total = db.query(NCRReport).filter(NCRReport.status != "취소").count()

    # ── 프로젝트 현황 ─────────────────────────────────────────
    project_status_counts: dict[str, int] = {}
    for (status,) in db.query(Project.status).all():
        s = status or "활성"
        project_status_counts[s] = project_status_counts.get(s, 0) + 1
    project_total = sum(project_status_counts.values())

    # ── 시험 일정 4분할 ───────────────────────────────────────
    # 예정: 활성 프로젝트에 연결된 규격 항목 중 TestSchedule이 없는 것
    active_proj_ids = [
        row[0] for row in db.query(Project.id).filter(Project.status == "활성").all()
    ]
    if active_proj_ids:
        linked_standards = db.execute(
            select(project_standard_items.c.project_id, project_standard_items.c.standard_item_id).where(
                project_standard_items.c.project_id.in_(active_proj_ids)
            )
        ).all()
        scheduled_pairs = {
            (r[0], r[1])
            for r in db.query(TestSchedule.project_id, TestSchedule.standard_item_id)
            .filter(
                TestSchedule.project_id.in_(active_proj_ids),
                TestSchedule.status != "취소",
            )
            .all()
        }
        expected = sum(1 for row in linked_standards if (row.project_id, row.standard_item_id) not in scheduled_pairs)
    else:
        expected = 0

    # 저장된 status는 '취소'만 신뢰할 수 있으므로(schedule_service.compute_status 참고), 나머지 구간은
    # 날짜 기준으로 다시 판정한다 — 그렇지 않으면 지연된 일정이 "계획/진행중"으로 잘못 집계된다.
    display_statuses = [compute_status(s) for s in db.query(TestSchedule).all()]
    planned = sum(1 for st in display_statuses if st == "준비중")
    delayed = sum(1 for st in display_statuses if st == "지연")
    in_progress = sum(1 for st in display_statuses if st == "진행중")
    completed = sum(1 for st in display_statuses if st == "완료")

    # ── 장비 현황 ─────────────────────────────────────────
    eq_items = (
        db.query(Equipment)
        .options(joinedload(Equipment.calibrations))
        .filter(Equipment.status != "폐기")
        .all()
    )
    eq_total = len(eq_items)
    eq_by_status: dict[str, int] = {}
    cal_alert_count = 0
    cal_expired_count = 0
    for eq in eq_items:
        eq_by_status[eq.status] = eq_by_status.get(eq.status, 0) + 1
        # 최신 교정 만료일 계산
        valid = [c for c in eq.calibrations if c.next_due_date]
        if valid:
            latest = max(valid, key=lambda c: c.next_due_date)
            days = (latest.next_due_date - today).days
            if days < 0:
                cal_expired_count += 1
            elif days <= 60:
                cal_alert_count += 1

    # ── SOP 현황 ──────────────────────────────────────────
    sop_total = db.query(SOP).count()
    sop_approved = db.query(SOP).filter(SOP.status == "승인").count()
    sop_review = db.query(SOP).filter(SOP.status == "검토중").count()
    sop_draft = db.query(SOP).filter(SOP.status == "초안").count()

    # ── 외주 시험소 현황 ───────────────────────────────────
    vendor_total = db.query(VendorLab).filter(VendorLab.is_active == True).count()
    vendor_kolas = db.query(VendorLab).filter(VendorLab.is_active == True, VendorLab.kolas_certified == True).count()

    # ── 월별 NCR 트렌드 (최근 6개월) ────────────────────────
    ncr_trend = []
    for i in range(5, -1, -1):
        m = today.month - i
        yr = today.year
        while m <= 0:
            m += 12
            yr -= 1
        m_last = cal_mod.monthrange(yr, m)[1]
        m_start = date(yr, m, 1)
        m_end = date(yr, m, m_last)
        new_cnt = db.query(NCRReport).filter(
            NCRReport.detected_date >= m_start,
            NCRReport.detected_date <= m_end,
        ).count()
        closed_cnt = db.query(NCRReport).filter(
            NCRReport.closed_date >= m_start,
            NCRReport.closed_date <= m_end,
            NCRReport.status == "완료",
        ).count()
        ncr_trend.append({"month": f"{yr}-{m:02d}", "label": f"{m}월", "new": new_cnt, "closed": closed_cnt})

    # ── 장비 Capability 커버리지 ─────────────────────────────
    eq_covered_standards = db.query(EquipmentStandardMapping.standard_item_id).distinct().count()
    eq_capability_pct = round(eq_covered_standards / total_standards * 100, 1) if total_standards > 0 else 0

    return {
        "year": y,
        "standards": {
            "total": total_standards,
            "self_count": self_count,
            "outsource_count": outsource_count,
            "pending_count": pending_count,
            "confirmed_count": confirmed_count,
            "coverage_pct": coverage_pct,
        },
        "ncr": {
            "total": ncr_total,
            "managed": managed,
            "overdue": overdue,
            "completed": ncr_completed,
        },
        "projects": {
            "total": project_total,
            "by_status": project_status_counts,
        },
        "schedules": {
            "expected": expected,
            "planned": planned,
            "delayed": delayed,
            "in_progress": in_progress,
            "completed": completed,
        },
        "equipment": {
            "total": eq_total,
            "by_status": eq_by_status,
            "cal_alert_count": cal_alert_count,
            "cal_expired_count": cal_expired_count,
            "capability_covered": eq_covered_standards,
            "capability_pct": eq_capability_pct,
        },
        "sop": {
            "total": sop_total,
            "approved": sop_approved,
            "review": sop_review,
            "draft": sop_draft,
        },
        "vendors": {
            "total": vendor_total,
            "kolas": vendor_kolas,
        },
        "ncr_trend": ncr_trend,
    }
