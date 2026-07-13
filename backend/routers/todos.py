from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from dependencies import get_db, require_staff
from services import todo_service

router = APIRouter(prefix="/todos", tags=["할 일 보드"])

@router.get("/")
def list_todos(db: Session = Depends(get_db), _=Depends(require_staff)):
    return todo_service.get_todo_cards(db)
