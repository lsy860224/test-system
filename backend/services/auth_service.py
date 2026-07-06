from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt
import bcrypt
from config import settings
from models.user import User

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def create_access_token(user_id: int, username: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "username": username, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

def login(db: Session, username: str, password: str) -> dict:
    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="아이디 또는 비밀번호가 올바르지 않습니다")
    user.last_login = datetime.utcnow()
    db.commit()
    token = create_access_token(user.id, user.username)
    return {"access_token": token, "token_type": "bearer", "user_id": user.id, "name": user.name, "role": user.role}

def seed_admin(db: Session):
    existing = db.query(User).filter(User.username == "admin").first()
    if not existing:
        admin = User(
            username="admin",
            password_hash=hash_password("admin123"),
            name="관리자",
            role="admin",
            is_active=True,
        )
        db.add(admin)
        db.commit()
