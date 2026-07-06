from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Date, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class NCRReport(Base):
    __tablename__ = "ncr_reports"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    ncr_number       = Column(String(20), unique=True, nullable=False, index=True)  # NCR-2026-001
    standard_item_id = Column(Integer, ForeignKey("standard_items.id"), nullable=True)
    test_schedule_id = Column(Integer, ForeignKey("test_schedules.id"), nullable=True)
    part_name        = Column(String(200), nullable=False)
    test_section     = Column(String(100))      # §6.1.1 단락보호
    issue_summary    = Column(String(300), nullable=False)
    issue_detail     = Column(Text)
    severity         = Column(String(5), nullable=False)   # High | Med | Low
    status           = Column(String(10), default="초기분석")  # 초기분석 | 8D진행 | 검토중 | 완료 | 취소
    assignee_id      = Column(Integer, ForeignKey("users.id"), nullable=True)
    detected_date    = Column(Date, nullable=False)
    due_date         = Column(Date, nullable=True)
    closed_date      = Column(Date, nullable=True)
    # 8D 필드
    d1_team              = Column(Text)   # JSON 배열
    d2_problem           = Column(Text)
    d3_containment       = Column(Text)
    d4_root_cause        = Column(Text)
    d5_permanent_action  = Column(Text)
    d6_verify_action     = Column(Text)
    d7_prevent_recurrence= Column(Text)
    d8_congratulate      = Column(Text)
    created_at  = Column(DateTime, server_default=func.now())
    updated_at  = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_by  = Column(Integer, ForeignKey("users.id"), nullable=True)

    attachments = relationship("NCRAttachment", back_populates="ncr", cascade="all, delete-orphan")
    comments    = relationship("NCRComment",    back_populates="ncr", cascade="all, delete-orphan")


class NCRAttachment(Base):
    __tablename__ = "ncr_attachments"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    ncr_id      = Column(Integer, ForeignKey("ncr_reports.id", ondelete="CASCADE"), nullable=False)
    file_name   = Column(String(255), nullable=False)
    file_path   = Column(String(500), nullable=False)
    file_size   = Column(Integer)
    file_type   = Column(String(50))
    uploaded_at = Column(DateTime, server_default=func.now())
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    ncr = relationship("NCRReport", back_populates="attachments")


class NCRComment(Base):
    __tablename__ = "ncr_comments"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    ncr_id     = Column(Integer, ForeignKey("ncr_reports.id", ondelete="CASCADE"), nullable=False)
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    ncr = relationship("NCRReport", back_populates="comments")
