from sqlalchemy import Column, Integer, String, DateTime, Text, Date, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

# N:M 중간 테이블 — SOP ↔ 규격 항목
sop_standard_items = Table(
    "sop_standard_items", Base.metadata,
    Column("sop_id",           Integer, ForeignKey("sops.id",           ondelete="CASCADE"), primary_key=True),
    Column("standard_item_id", Integer, ForeignKey("standard_items.id", ondelete="CASCADE"), primary_key=True),
    Column("added_at",   DateTime, server_default=func.now()),
)


class SOP(Base):
    __tablename__ = "sops"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    sop_number   = Column(String(50),  nullable=False)   # SOP-ENV-001
    title        = Column(String(300), nullable=False)
    version      = Column(String(20),  default="v1.0")
    category     = Column(String(100), nullable=True)
    status       = Column(String(50),  default="초안")   # 초안/검토중/승인/폐기
    owner        = Column(String(100), nullable=True)    # 작성자
    approved_by  = Column(String(100), nullable=True)    # 승인자
    issue_date   = Column(Date,        nullable=True)    # 최초 발행일
    revision_date = Column(Date,       nullable=True)    # 최근 개정일
    description  = Column(Text,        nullable=True)    # 적용 범위
    content      = Column(Text,        nullable=True)    # 절차 주요 내용
    notes        = Column(Text,        nullable=True)
    created_at   = Column(DateTime, server_default=func.now())
    updated_at   = Column(DateTime, server_default=func.now(), onupdate=func.now())

    revisions   = relationship("SOPRevision", back_populates="sop",
                             cascade="all, delete-orphan",
                             order_by="desc(SOPRevision.changed_at)")
    attachments    = relationship("SOPAttachment", back_populates="sop",
                             cascade="all, delete-orphan",
                             order_by="desc(SOPAttachment.uploaded_at)")
    standard_items = relationship("StandardItem", secondary=sop_standard_items)


class SOPRevision(Base):
    """SOP 개정 이력"""
    __tablename__ = "sop_revisions"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    sop_id         = Column(Integer, ForeignKey("sops.id", ondelete="CASCADE"), nullable=False)
    version        = Column(String(20),  nullable=False)
    change_summary = Column(Text,        nullable=True)  # 개정 내용 요약
    changed_by     = Column(String(100), nullable=True)
    changed_at     = Column(DateTime, server_default=func.now())

    sop = relationship("SOP", back_populates="revisions")


class SOPAttachment(Base):
    """SOP 첨부파일 (PDF/Word 등)"""
    __tablename__ = "sop_attachments"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    sop_id      = Column(Integer, ForeignKey("sops.id", ondelete="CASCADE"), nullable=False)
    file_name   = Column(String(255), nullable=False)
    file_path   = Column(String(500), nullable=False)
    file_size   = Column(Integer)
    uploaded_at = Column(DateTime, server_default=func.now())
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    sop = relationship("SOP", back_populates="attachments")
