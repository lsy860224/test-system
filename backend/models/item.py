from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime
from sqlalchemy.sql import func
from database import Base


class Item(Base):
    """아이템(부품) 마스터 — 여러 프로젝트(차종)에서 재사용됨"""
    __tablename__ = "items"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    item_code  = Column(String(50), unique=True, nullable=True)
    name       = Column(String(200), nullable=False)
    category   = Column(String(100), nullable=True)
    spec       = Column(Text, nullable=True)
    notes      = Column(Text, nullable=True)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
