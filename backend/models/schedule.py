from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Date, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class TestSchedule(Base):
    __tablename__ = "test_schedules"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    project_id    = Column(Integer, ForeignKey("projects.id"), nullable=False)
    standard_item_id = Column(Integer, ForeignKey("standard_items.id"), nullable=False)
    test_type     = Column(String(10), nullable=False)   # DV | PV | 양산정기 | 특별
    equipment_id  = Column(Integer, ForeignKey("equipment.id"), nullable=True)
    vendor_id     = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    planned_start = Column(Date, nullable=False)
    planned_end   = Column(Date, nullable=False)
    actual_start  = Column(Date, nullable=True)
    actual_end    = Column(Date, nullable=True)
    status        = Column(String(10), default="계획")   # 계획 | 준비중 | 진행중 | 완료 | 지연 | 취소
    result        = Column(String(10), nullable=True)    # 합격 | 불합격 | 보류
    data_path     = Column(String(500), nullable=True)   # 시험 완료 시 데이터 저장 경로 (합/불 무관 필수)
    assignee_id   = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes         = Column(Text)
    created_at    = Column(DateTime, server_default=func.now())
    updated_at    = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_by    = Column(Integer, ForeignKey("users.id"), nullable=True)

    project  = relationship("Project",   back_populates="schedules")


class Vendor(Base):
    __tablename__ = "vendors"

    id                   = Column(Integer, primary_key=True, autoincrement=True)
    name                 = Column(String(200), nullable=False)
    location             = Column(String(200))
    contact_person       = Column(String(100))
    phone                = Column(String(20))
    email                = Column(String(200))
    accreditation_type   = Column(String(50))    # KOLAS | ILAC
    accreditation_number = Column(String(100))
    accreditation_scope  = Column(Text)           # JSON
    lead_time_days       = Column(Integer)
    notes                = Column(Text)
    is_active            = Column(Boolean, default=True)
    created_at           = Column(DateTime, server_default=func.now())
