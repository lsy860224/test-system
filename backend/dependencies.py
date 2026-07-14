from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from database import SessionLocal
from config import settings

security = HTTPBearer()

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    from models.user import User
    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[settings.algorithm])
        user_id = int(payload.get("sub", 0))
        token_version = payload.get("tv", 0)
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if token_version != (user.token_version or 0):
        # 비밀번호 변경 이후 발급된 새 토큰이 아니면 거부 — 탈취된 구 토큰 무효화
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return user

REQUESTER_ROLE = "의뢰자"

def require_staff(current_user=Depends(get_current_user)):
    """의뢰자(외부 요청자) role은 단건 시험 요청 모듈 외 나머지 업무 모듈에 접근할 수 없다."""
    if current_user.role == REQUESTER_ROLE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="시험평가팀만 접근할 수 있습니다")
    return current_user

def require_role(*roles: str):
    def _check(current_user=Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다")
        return current_user
    return _check
