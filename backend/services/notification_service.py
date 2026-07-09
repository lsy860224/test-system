from sqlalchemy.orm import Session
from models.notification import Notification

LIST_LIMIT = 30


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
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(LIST_LIMIT)
        .all()
    )
    unread_count = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
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
