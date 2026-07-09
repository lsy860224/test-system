from sqlalchemy import Column, Integer, String, DateTime, Text, Date, ForeignKey
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
    planned_start = Column(Date, nullable=False)
    planned_end   = Column(Date, nullable=False)
    actual_start  = Column(Date, nullable=True)
    actual_end    = Column(Date, nullable=True)
    status        = Column(String(10), default="계획")   # 계획 | 준비중 | 진행중 | 완료 | 지연 | 취소
    result        = Column(String(10), nullable=True)    # 합격 | 불합격 | 보류
    data_path     = Column(String(500), nullable=True)   # 시험 완료 시 데이터 저장 경로 (합/불 무관 필수)
    round_no      = Column(Integer, nullable=False, default=1)  # 시험 회차 (1=최초, 2 이상=재시험)
    assignee_id   = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes         = Column(Text)
    created_at    = Column(DateTime, server_default=func.now())
    updated_at    = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_by    = Column(Integer, ForeignKey("users.id"), nullable=True)

    project  = relationship("Project",   back_populates="schedules")
