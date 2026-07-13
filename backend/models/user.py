from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    username      = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name          = Column(String(100), nullable=False)
    role          = Column(String(10), default="팀원")   # admin | 임원 | 팀장 | 팀원
    is_active     = Column(Boolean, default=True)
    last_login    = Column(DateTime, nullable=True)
    created_at    = Column(DateTime, server_default=func.now())
    token_version = Column(Integer, default=0)  # 비밀번호 변경 시 증가 — 이전에 발급된 JWT를 무효화
