import secrets
from collections import defaultdict
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

def create_access_token(user_id: int, username: str, token_version: int = 0) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "username": username, "tv": token_version, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

# 로그인 무차별 대입 방어 — 단일 프로세스 기준 메모리 카운터라 재기동 시 초기화되지만,
# 55명 규모 사내 툴에서 온라인 자격증명 무차별 대입을 막는 데는 충분하다.
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 5
_failed_attempts: dict[str, list[datetime]] = defaultdict(list)

def login(db: Session, username: str, password: str) -> dict:
    now = datetime.utcnow()
    attempts = _failed_attempts[username]
    attempts[:] = [t for t in attempts if now - t < timedelta(minutes=LOCKOUT_MINUTES)]
    if len(attempts) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"로그인 시도가 너무 많습니다. {LOCKOUT_MINUTES}분 후 다시 시도하세요",
        )
    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if not user or not verify_password(password, user.password_hash):
        attempts.append(now)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="아이디 또는 비밀번호가 올바르지 않습니다")
    attempts.clear()
    user.last_login = datetime.utcnow()
    db.commit()
    token = create_access_token(user.id, user.username, user.token_version or 0)
    return {"access_token": token, "token_type": "bearer", "user_id": user.id, "name": user.name, "role": user.role}

def change_password(db: Session, user: User, current_password: str, new_password: str):
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다")
    user.password_hash = hash_password(new_password)
    # 비밀번호 변경 이전에 발급된 토큰(예: localStorage에 남아있던 탈취 토큰)을 즉시 무효화한다
    user.token_version = (user.token_version or 0) + 1
    db.commit()


def seed_admin(db: Session):
    """최초 기동 시 admin 계정이 없으면 생성한다.
    운영 환경에서는 알려진 기본 비밀번호(admin123)를 그대로 심으면 누구나 로그인할 수 있으므로,
    무작위 1회성 비밀번호를 생성해 콘솔에 출력한다 — 운영자는 로그인 즉시 비밀번호를 변경해야 한다.
    개발 환경은 Tester Agent들이 admin/admin123로 로그인하는 것을 전제하므로 그대로 둔다."""
    existing = db.query(User).filter(User.username == "admin").first()
    if existing:
        return
    if settings.environment == "production":
        password = secrets.token_urlsafe(12)
        print(f"[seed_admin] 운영 환경 최초 기동 — admin 계정을 임시 비밀번호로 생성했습니다. "
              f"지금 즉시 로그인 후 비밀번호를 변경하세요: {password}")
    else:
        password = "admin123"
    admin = User(
        username="admin",
        password_hash=hash_password(password),
        name="관리자",
        role="admin",
        is_active=True,
    )
    db.add(admin)
    db.commit()
