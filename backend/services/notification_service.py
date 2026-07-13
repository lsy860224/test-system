from datetime import date
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from models.notification import Notification
from models.project import Project
from models.user import User

LIST_LIMIT = 30
DEADLINE_THRESHOLDS = [60, 45, 30, 20, 10, 5, 0]
DEADLINE_EXCLUDED_STATUSES = {"완료", "취소", "보류"}


def create_notification(
    db: Session, user_id: int, title: str,
    message: str | None = None, link_path: str | None = None,
    related_type: str | None = None, related_id: int | None = None,
) -> Notification:
    n = Notification(
        user_id=user_id, title=title, message=message, link_path=link_path,
        related_type=related_type, related_id=related_id,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


def list_for_user(db: Session, user_id: int) -> dict:
    items = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_removed == False)
        .order_by(Notification.created_at.desc())
        .limit(LIST_LIMIT)
        .all()
    )
    unread_count = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False, Notification.is_removed == False)
        .count()
    )
    return {"items": items, "unread_count": unread_count}


def mark_read(db: Session, user_id: int, notif_id: int):
    n = db.query(Notification).filter(
        Notification.id == notif_id, Notification.user_id == user_id,
    ).first()
    if n:
        n.is_read = True
        db.commit()


def mark_all_read(db: Session, user_id: int):
    db.query(Notification).filter(
        Notification.user_id == user_id, Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()


def delete_notification(db: Session, user_id: int, notif_id: int):
    n = db.query(Notification).filter(
        Notification.id == notif_id, Notification.user_id == user_id,
    ).first()
    if n:
        n.is_removed = True
        db.commit()


def sync_project_deadline_notifications(db: Session):
    """프로젝트 완료 예정일(target_date) D-60/45/30/20/10/5/0에 알림을 생성한다.
    related_type에 임계값을 인코딩해 이미 생성된(또는 삭제된) 알림은 재생성하지 않는다."""
    today = date.today()
    projects = (
        db.query(Project)
        .filter(Project.target_date.isnot(None))
        .filter(~Project.status.in_(DEADLINE_EXCLUDED_STATUSES))
        .all()
    )
    for project in projects:
        days_left = (project.target_date - today).days
        if days_left not in DEADLINE_THRESHOLDS:
            continue
        related_type = f"project_deadline_d{days_left}"
        already = db.query(Notification).filter(
            Notification.related_type == related_type,
            Notification.related_id == project.id,
        ).first()
        if already:
            continue
        recipient_ids = (
            [project.assignee_id] if project.assignee_id
            else [u.id for u in db.query(User).filter(User.role.in_(["admin", "팀장"])).all()]
        )
        for uid in recipient_ids:
            try:
                create_notification(
                    db, user_id=uid,
                    title=f"완료 예정일 D-{days_left} — {project.name}",
                    message=f"완료 예정일 {project.target_date.isoformat()}",
                    link_path="/schedule",
                    related_type=related_type, related_id=project.id,
                )
            except IntegrityError:
                # 동시 요청(폴링 겹침 등)이 같은 알림을 먼저 만든 경우 — DB 유니크 인덱스가 막아주므로 조용히 건너뜀
                db.rollback()
