from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime
from sqlalchemy.sql import func
from database import Base


class VehicleModel(Base):
    """차종 마스터 — 프로젝트 등록 시 드롭다운으로 선택, C/O 매칭 기준이 되므로 표기를 통일한다"""
    __tablename__ = "vehicle_models"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    code       = Column(String(50), unique=True, nullable=False)   # 차종 코드 (예: JG1)
    name       = Column(String(200), nullable=True)                # 차종명(선택, 예: 디 올 뉴 아반떼)
    notes      = Column(Text, nullable=True)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
