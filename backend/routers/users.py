from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from dependencies import get_db, get_current_user
from schemas.user import UserCreate, UserUpdate, UserListOut
from services import user_service

router = APIRouter(prefix="/users", tags=["담당자 관리"])

def require_admin(current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="관리자만 사용할 수 있습니다")
    return current_user

@router.get("/", response_model=list[UserListOut])
def list_users(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return user_service.list_users(db)

@router.post("/", response_model=UserListOut, status_code=201)
def create_user(body: UserCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    return user_service.create_user(db, body)

@router.put("/{user_id}", response_model=UserListOut)
def update_user(user_id: int, body: UserUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    return user_service.update_user(db, user_id, body)

@router.patch("/{user_id}/deactivate", response_model=UserListOut)
def deactivate_user(user_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    user_service.deactivate_user(db, user_id)
    return user_service.get_user(db, user_id)

@router.patch("/{user_id}/activate", response_model=UserListOut)
def activate_user(user_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    user_service.activate_user(db, user_id)
    return user_service.get_user(db, user_id)
