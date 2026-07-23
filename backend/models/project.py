from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Date, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

# N:M 중간 테이블 — 프로젝트 ↔ 규격 항목
project_standard_items = Table(
    "project_standard_items", Base.metadata,
    Column("project_id",       Integer, ForeignKey("projects.id",       ondelete="CASCADE"), primary_key=True),
    Column("standard_item_id", Integer, ForeignKey("standard_items.id", ondelete="CASCADE"), primary_key=True),
    Column("is_required", Boolean, default=True),
    Column("added_at",    DateTime, server_default=func.now()),
    Column("added_by",    Integer, ForeignKey("users.id"), nullable=True),
    Column("is_carry_over",         Boolean, default=False),    # C/O 여부 — 타 차종 성적서로 대체
    Column("co_source_schedule_id", Integer, ForeignKey("test_schedules.id", ondelete="SET NULL"), nullable=True),  # C/O 근거가 되는 실제 시험 일정
)

# 프로젝트 ↔ 규격(standard_no) 단위 비고 — 항목별이 아니라 규격 전체에 대한 적용 조건/비고 1건
project_standard_notes = Table(
    "project_standard_notes", Base.metadata,
    Column("project_id",  Integer, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("standard_no", String(50), primary_key=True),
    Column("notes",       Text, nullable=True),
    Column("updated_at",  DateTime, server_default=func.now(), onupdate=func.now()),
)


class Project(Base):
    __tablename__ = "projects"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    customer_id  = Column(Integer, ForeignKey("customers.id"), nullable=False)
    item_id      = Column(Integer, ForeignKey("items.id"), nullable=True)
    name         = Column(String(200), nullable=False)
    project_code = Column(String(50), index=True)       # PRJ-2026-001
    vehicle_model = Column(String(100), nullable=True)  # 차종 — 규격 항목 C/O 판단 기준(다른 차종 성적서 대체)
    phase        = Column(String(10), default="개발")   # RFQ | 개발 | DV | PV | 양산준비 | 양산
    status       = Column(String(10), default="활성")   # 활성 | 완료 | 보류 | 지연 | 취소
    start_date   = Column(Date, nullable=True)
    target_date  = Column(Date, nullable=True)
    actual_date  = Column(Date, nullable=True)
    progress_pct = Column(Integer, default=0)           # 자동 계산
    notes        = Column(Text)
    assignee_id  = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at   = Column(DateTime, server_default=func.now())
    updated_at   = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_by   = Column(Integer, ForeignKey("users.id"), nullable=True)

    customer       = relationship("Customer",   back_populates="projects")
    milestones     = relationship("ProjectMilestone", back_populates="project", cascade="all, delete-orphan")
    standard_items = relationship("StandardItem", secondary=project_standard_items)
    schedules      = relationship("TestSchedule", back_populates="project")


class ProjectMilestone(Base):
    __tablename__ = "project_milestones"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    project_id     = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name           = Column(String(200), nullable=False)
    milestone_type = Column(String(10), default="시험")   # 설계 | 시험 | 승인 | 납품 | 기타
    planned_date   = Column(Date, nullable=False)
    actual_date    = Column(Date, nullable=True)
    status         = Column(String(10), default="예정")   # 예정 | 진행중 | 완료 | 지연 | 취소
    is_critical    = Column(Boolean, default=False)
    delay_days     = Column(Integer, default=0)           # 자동 계산
    notes          = Column(Text)

    project = relationship("Project", back_populates="milestones")
