from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import delete, insert, select, or_
from models.project import Project, ProjectMilestone, project_standard_items
from models.standard import StandardItem, StandardCategory
from models.item import Item
from schemas.project import ProjectCreate, ProjectUpdate, MilestoneCreate

def _sync_part_name(db: Session, project: Project):
    """item_id가 연결되어 있으면 표시용 part_name을 Item.name으로 동기화 (하위호환 필드)"""
    if project.item_id:
        item = db.query(Item).filter(Item.id == project.item_id).first()
        if item:
            project.part_name = item.name

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
        q = q.filter(or_(Project.name.ilike(like), Project.project_code.ilike(like), Project.part_name.ilike(like)))
    total = q.count()
    items = q.order_by(Project.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"total": total, "items": items}

def get_project(db: Session, project_id: int) -> Project:
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    return p

def create_project(db: Session, body: ProjectCreate, created_by: int) -> Project:
    project = Project(**body.model_dump(), progress_pct=0, created_by=created_by)
    _sync_part_name(db, project)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

def update_project(db: Session, project_id: int, body: ProjectUpdate) -> Project:
    project = get_project(db, project_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    _sync_part_name(db, project)
    db.commit()
    db.refresh(project)
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
def get_project_standard_items(db: Session, project_id: int) -> list:
    get_project(db, project_id)
    cats = {c.id: c for c in db.query(StandardCategory).all()}
    items = (
        db.query(StandardItem)
        .join(project_standard_items, project_standard_items.c.standard_item_id == StandardItem.id)
        .filter(project_standard_items.c.project_id == project_id, StandardItem.is_deleted == False)
        .order_by(StandardItem.standard_code)
        .all()
    )
    for item in items:
        cat = cats.get(item.category_id)
        item.category_name = cat.name_ko if cat else None
        item.category_color = cat.color_hex if cat else None
    return items

def set_project_standard_items(db: Session, project_id: int, standard_item_ids: list[int]) -> list:
    get_project(db, project_id)
    db.execute(delete(project_standard_items).where(project_standard_items.c.project_id == project_id))
    if standard_item_ids:
        db.execute(insert(project_standard_items).values(
            [{"project_id": project_id, "standard_item_id": sid} for sid in standard_item_ids]
        ))
    db.commit()
    return get_project_standard_items(db, project_id)
