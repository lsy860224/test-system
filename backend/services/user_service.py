from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.user import User
from schemas.user import UserCreate, UserUpdate
from services.auth_service import hash_password

def list_users(db: Session) -> list[User]:
    return db.query(User).order_by(User.name).all()

def get_user(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="담당자를 찾을 수 없습니다")
    return user

def create_user(db: Session, body: UserCreate) -> User:
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="이미 사용 중인 아이디입니다")
    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        name=body.name,
        role=body.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def update_user(db: Session, user_id: int, body: UserUpdate) -> User:
    user = get_user(db, user_id)
    user.name = body.name
    user.role = body.role
    if body.password:
        user.password_hash = hash_password(body.password)
    db.commit()
    db.refresh(user)
    return user

def deactivate_user(db: Session, user_id: int):
    user = get_user(db, user_id)
    user.is_active = False
    db.commit()

def activate_user(db: Session, user_id: int):
    user = get_user(db, user_id)
    user.is_active = True
    db.commit()
