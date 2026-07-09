"""규격 항목 / 장비에 연동된 절차서의 작성 완료 여부를 계산한다.
승인된 절차서가 하나라도 있으면 완료, 초안·검토중만 있으면 작성중, 연동이 없으면(또는 폐기뿐이면) 없음.
"""
from sqlalchemy.orm import Session
from models.sop import SOP, sop_standard_items, sop_equipment

_RANK = {"승인": 2, "검토중": 1, "초안": 1, "폐기": -1}


def _aggregate(rows: list[tuple[int, str]]) -> dict[int, dict]:
    result: dict[int, dict] = {}
    for target_id, status in rows:
        entry = result.setdefault(target_id, {"status": "없음", "count": 0, "_rank": -1})
        entry["count"] += 1
        rank = _RANK.get(status, -1)
        if rank > entry["_rank"]:
            entry["_rank"] = rank
            entry["status"] = "완료" if rank == 2 else ("작성중" if rank == 1 else "없음")
    for entry in result.values():
        del entry["_rank"]
    return result


def get_standard_coverage(db: Session, standard_item_ids: list[int]) -> dict[int, dict]:
    if not standard_item_ids:
        return {}
    rows = (
        db.query(sop_standard_items.c.standard_item_id, SOP.status)
        .join(SOP, SOP.id == sop_standard_items.c.sop_id)
        .filter(sop_standard_items.c.standard_item_id.in_(standard_item_ids))
        .all()
    )
    return _aggregate(rows)


def get_equipment_coverage(db: Session, equipment_ids: list[int]) -> dict[int, dict]:
    if not equipment_ids:
        return {}
    rows = (
        db.query(sop_equipment.c.equipment_id, SOP.status)
        .join(SOP, SOP.id == sop_equipment.c.sop_id)
        .filter(sop_equipment.c.equipment_id.in_(equipment_ids))
        .all()
    )
    return _aggregate(rows)
