from datetime import datetime, date
from sqlalchemy.orm import Session, joinedload
from models.standard import StandardItem
from models.ncr import NCRReport
from models.equipment import Equipment, EquipmentStandardMapping, EquipmentCalibration
from models.schedule import TestSchedule
from models.sop import SOP


def generate_gap_analysis(db: Session) -> dict:
    today = date.today()

    # ── 규격 커버리지 ──────────────────────────────────────
    active_standards = db.query(StandardItem).filter(StandardItem.is_deleted == False)
    total_standards = active_standards.count()
    self_count = active_standards.filter(StandardItem.source_type == "자체").count()
    outsource_count = active_standards.filter(StandardItem.source_type == "외주").count()
    pending_items = active_standards.filter(StandardItem.source_type == "검토중").order_by(StandardItem.updated_at.desc()).all()
    pending_count = len(pending_items)
    confirmed_count = self_count + outsource_count
    coverage_pct = round(confirmed_count / total_standards * 100, 1) if total_standards > 0 else 0

    # ── 장비 Capability 갭 ─────────────────────────────────
    covered_ids = {r[0] for r in db.query(EquipmentStandardMapping.standard_item_id).distinct().all()}
    uncovered = [s for s in active_standards.all() if s.id not in covered_ids]
    uncovered_total = len(uncovered)
    capability_pct = round((total_standards - uncovered_total) / total_standards * 100, 1) if total_standards > 0 else 0

    eq_items = db.query(Equipment).options(joinedload(Equipment.calibrations)).filter(Equipment.status != "폐기").all()
    cal_expired = []
    cal_alert = []
    for eq in eq_items:
        valid = [c for c in eq.calibrations if c.next_due_date]
        if not valid:
            continue
        latest = max(valid, key=lambda c: c.next_due_date)
        days = (latest.next_due_date - today).days
        if days < 0:
            cal_expired.append({"id": eq.id, "name": eq.name, "next_due_date": latest.next_due_date.isoformat(), "days_to_expiry": days})
        elif days <= 60:
            cal_alert.append({"id": eq.id, "name": eq.name, "next_due_date": latest.next_due_date.isoformat(), "days_to_expiry": days})

    # ── SOP 정립 현황 ──────────────────────────────────────
    sop_total = db.query(SOP).count()
    sop_approved = db.query(SOP).filter(SOP.status == "승인").count()
    sop_review = db.query(SOP).filter(SOP.status == "검토중").count()
    sop_draft = db.query(SOP).filter(SOP.status == "초안").count()
    sop_approved_pct = round(sop_approved / sop_total * 100, 1) if sop_total > 0 else 0

    # ── NCR 기한 초과 ──────────────────────────────────────
    overdue_ncrs = (
        db.query(NCRReport)
        .filter(NCRReport.status.notin_(["완료", "취소"]), NCRReport.due_date != None, NCRReport.due_date < today)
        .order_by(NCRReport.due_date)
        .all()
    )
    ncr_total = db.query(NCRReport).filter(NCRReport.status != "취소").count()
    ncr_managed = db.query(NCRReport).filter(
        NCRReport.status.notin_(["완료", "취소"]),
        (NCRReport.due_date == None) | (NCRReport.due_date >= today),
    ).count()

    # ── Gap 판정 (규칙 기반, 실측 데이터만 사용) ────────────
    findings = []
    if pending_count > 0:
        findings.append({
            "level": "high" if pending_count >= 5 else "med",
            "title": f"규격 자체/외주 미결정 {pending_count}건",
            "detail": "수행방식(자체/외주)이 확정되지 않은 규격 항목입니다. 양산 일정 지연 리스크로 우선 결정이 필요합니다.",
        })
    if uncovered_total > 0:
        findings.append({
            "level": "high" if capability_pct < 70 else "med",
            "title": f"장비 Capability 미확보 규격 {uncovered_total}건 (커버리지 {capability_pct}%)",
            "detail": "보유 장비로 대응 불가한 규격 항목입니다. 신규 투자 또는 외주 전환 검토가 필요합니다.",
        })
    if cal_expired:
        findings.append({
            "level": "high",
            "title": f"교정 만료 장비 {len(cal_expired)}대",
            "detail": "교정 기한이 지난 장비로 시험 데이터 유효성에 영향을 줍니다. 즉시 재교정이 필요합니다.",
        })
    if cal_alert:
        findings.append({
            "level": "med",
            "title": f"교정 만료 임박 장비 {len(cal_alert)}대 (D-60 이내)",
            "detail": "교정 일정을 사전에 확보해 만료 공백을 방지해야 합니다.",
        })
    if overdue_ncrs:
        findings.append({
            "level": "high",
            "title": f"기한 초과 NCR {len(overdue_ncrs)}건",
            "detail": "조치 기한을 넘긴 부적합입니다. No Bad News = No Good News — 임원 보고 후 즉시 재계획이 필요합니다.",
        })
    if sop_draft + sop_review > 0:
        findings.append({
            "level": "low",
            "title": f"절차서 초안/검토중 {sop_draft + sop_review}건 (승인율 {sop_approved_pct}%)",
            "detail": "속인성 제거를 위해 표준화가 필요한 시험 절차입니다. 승인 완료 시점을 관리하세요.",
        })
    if not findings:
        findings.append({
            "level": "low",
            "title": "현재 등록된 데이터 기준 주요 Gap 없음",
            "detail": "규격/장비/절차서/NCR 전 항목이 임계값 이내로 관리되고 있습니다.",
        })

    return {
        "generated_at": datetime.now().isoformat(),
        "standards": {
            "total": total_standards,
            "self_count": self_count,
            "outsource_count": outsource_count,
            "pending_count": pending_count,
            "coverage_pct": coverage_pct,
            "pending_items": [
                {"id": s.id, "standard_no": s.standard_no, "standard_code": s.standard_code, "name": s.name}
                for s in pending_items[:20]
            ],
        },
        "equipment": {
            "capability_pct": capability_pct,
            "uncovered_total": uncovered_total,
            "uncovered_items": [
                {"id": s.id, "standard_no": s.standard_no, "standard_code": s.standard_code, "name": s.name}
                for s in uncovered[:20]
            ],
            "cal_expired": cal_expired,
            "cal_alert": cal_alert,
        },
        "sop": {
            "total": sop_total,
            "approved": sop_approved,
            "review": sop_review,
            "draft": sop_draft,
            "approved_pct": sop_approved_pct,
        },
        "ncr": {
            "total": ncr_total,
            "managed": ncr_managed,
            "overdue_count": len(overdue_ncrs),
            "overdue_items": [
                {
                    "id": n.id, "ncr_number": n.ncr_number, "part_name": n.part_name,
                    "issue_summary": n.issue_summary, "severity": n.severity,
                    "due_date": n.due_date.isoformat() if n.due_date else None,
                    "days_overdue": (today - n.due_date).days if n.due_date else None,
                }
                for n in overdue_ncrs[:20]
            ],
        },
        "findings": findings,
    }


_QUARTER_MONTH_RANGES = [
    (1, 1, 3, 31),
    (2, 4, 6, 30),
    (3, 7, 9, 30),
    (4, 10, 12, 31),
]


def generate_quarterly_kpi(db: Session, year: int) -> dict:
    """분기별 활동 지표 집계 — 실제 발생일(detected_date, actual_end 등) 기준. 과거 시점의 커버리지·Capability 스냅샷은
    저장하지 않으므로 포함하지 않는다 (추정 금지 원칙)."""
    quarters = []
    for q, start_month, end_month, end_day in _QUARTER_MONTH_RANGES:
        q_start = date(year, start_month, 1)
        q_end = date(year, end_month, end_day)

        ncr_new = db.query(NCRReport).filter(
            NCRReport.detected_date >= q_start, NCRReport.detected_date <= q_end,
        ).count()
        ncr_closed = db.query(NCRReport).filter(
            NCRReport.status == "완료", NCRReport.closed_date >= q_start, NCRReport.closed_date <= q_end,
        ).count()

        # compute_status()와 동일한 기준(취소가 아니고 actual_end가 있으면 완료)으로 판정한다 —
        # 저장된 status만 보면 실제로 종료됐지만 status가 갱신되지 않은 일정을 놓칠 수 있다.
        sched_completed = db.query(TestSchedule).filter(
            TestSchedule.status != "취소", TestSchedule.actual_end >= q_start, TestSchedule.actual_end <= q_end,
        ).all()
        sched_pass = sum(1 for s in sched_completed if s.result == "합격")
        sched_pass_rate = round(sched_pass / len(sched_completed) * 100, 1) if sched_completed else None

        dv_completed = db.query(StandardItem).filter(
            StandardItem.is_deleted == False, StandardItem.dv_actual_date >= q_start, StandardItem.dv_actual_date <= q_end,
        ).count()
        pv_completed = db.query(StandardItem).filter(
            StandardItem.is_deleted == False, StandardItem.pv_actual_date >= q_start, StandardItem.pv_actual_date <= q_end,
        ).count()

        calibration_count = db.query(EquipmentCalibration).filter(
            EquipmentCalibration.calibration_date >= q_start, EquipmentCalibration.calibration_date <= q_end,
        ).count()

        sop_approved = db.query(SOP).filter(
            SOP.status == "승인", SOP.revision_date >= q_start, SOP.revision_date <= q_end,
        ).count()

        quarters.append({
            "quarter": f"{year}-Q{q}",
            "label": f"{q}분기",
            "start": q_start.isoformat(),
            "end": q_end.isoformat(),
            "ncr_new": ncr_new,
            "ncr_closed": ncr_closed,
            "schedule_completed": len(sched_completed),
            "schedule_pass_rate": sched_pass_rate,
            "dv_completed": dv_completed,
            "pv_completed": pv_completed,
            "calibration_count": calibration_count,
            "sop_approved": sop_approved,
        })

    return {"year": year, "quarters": quarters}
