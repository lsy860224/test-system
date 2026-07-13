from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from dependencies import get_db, get_current_user
from schemas.notification import NotificationList
from services import notification_service

router = APIRouter(prefix="/notifications", tags=["알림"])


@router.get("/", response_model=NotificationList)
def list_notifications(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    notification_service.sync_project_deadline_notifications(db)
    return notification_service.list_for_user(db, current_user.id)


@router.patch("/{notif_id}/read", status_code=204)
def mark_read(notif_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    notification_service.mark_read(db, current_user.id, notif_id)


@router.patch("/read-all", status_code=204)
def mark_all_read(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    notification_service.mark_all_read(db, current_user.id)


@router.delete("/{notif_id}", status_code=204)
def delete_notification(notif_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    notification_service.delete_notification(db, current_user.id, notif_id)
