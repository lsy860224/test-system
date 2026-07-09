from sqlalchemy import Column, Integer, String, DateTime, Text, Date, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class SingleTestRequest(Base):
    """타부서 의뢰 단건 시험 — 프로젝트/규격과 무관하게 발생하는 1회성 시험 요청"""
    __tablename__ = "single_test_requests"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    request_number    = Column(String(20), unique=True, nullable=False, index=True)  # STR-2026-001
    requesting_dept   = Column(String(100), nullable=False)   # 의뢰 부서 (자유 텍스트)
    requester_name    = Column(String(100), nullable=False)
    requester_contact = Column(String(100), nullable=True)
    requester_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # 의뢰자 본인이 등록한 경우 세팅
    test_name         = Column(String(300), nullable=False)   # 규격 무관 자유 시험명
    standard_item_id  = Column(Integer, ForeignKey("standard_items.id"), nullable=True)  # 해당 시 선택적 연결
    sample_info       = Column(String(300), nullable=True)    # 시료명/수량
    purpose           = Column(Text, nullable=True)
    desired_due_date  = Column(Date, nullable=True)
    status            = Column(String(10), default="접수")
    # 접수 | 검토중 | 승인 | 진행중 | 시험완료 | 보고서작성 | 검토 | 전달완료 | 반려 | 취소
    execution_type    = Column(String(10), nullable=True)     # 자체 | 외주
    equipment_id      = Column(Integer, ForeignKey("equipment.id"), nullable=True)
    assignee_id       = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by       = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at       = Column(DateTime, nullable=True)
    rejection_reason  = Column(Text, nullable=True)
    planned_start     = Column(Date, nullable=True)
    planned_end       = Column(Date, nullable=True)
    actual_start      = Column(Date, nullable=True)
    actual_end        = Column(Date, nullable=True)
    result            = Column(String(10), nullable=True)     # 합격 | 불합격 | 보류
    notes             = Column(Text, nullable=True)
    created_at        = Column(DateTime, server_default=func.now())
    updated_at        = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_by        = Column(Integer, ForeignKey("users.id"), nullable=True)

    attachments   = relationship("SingleTestAttachment", back_populates="request", cascade="all, delete-orphan")
    comments      = relationship("SingleTestComment", back_populates="request", cascade="all, delete-orphan")
    deliveries    = relationship("SingleTestDelivery", back_populates="request", cascade="all, delete-orphan")
    vendor_orders = relationship("VendorOrder", back_populates="single_test_request")


class SingleTestAttachment(Base):
    __tablename__ = "single_test_attachments"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    request_id      = Column(Integer, ForeignKey("single_test_requests.id", ondelete="CASCADE"), nullable=False)
    attachment_type = Column(String(10), default="기타")  # 의뢰자료 | 성적서 | 기타
    file_name       = Column(String(255), nullable=False)
    file_path       = Column(String(500), nullable=False)
    file_size       = Column(Integer)
    file_type       = Column(String(50))
    uploaded_at     = Column(DateTime, server_default=func.now())
    uploaded_by     = Column(Integer, ForeignKey("users.id"), nullable=True)

    request = relationship("SingleTestRequest", back_populates="attachments")


class SingleTestComment(Base):
    __tablename__ = "single_test_comments"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(Integer, ForeignKey("single_test_requests.id", ondelete="CASCADE"), nullable=False)
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    request = relationship("SingleTestRequest", back_populates="comments")


class SingleTestDelivery(Base):
    """성적서/결과 전달 이력"""
    __tablename__ = "single_test_deliveries"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    request_id    = Column(Integer, ForeignKey("single_test_requests.id", ondelete="CASCADE"), nullable=False)
    delivered_at  = Column(Date, nullable=False)
    delivered_to  = Column(String(100), nullable=False)
    method        = Column(String(10), nullable=False)  # 이메일 | 사내메신저 | 출력물 | 직접전달
    notes         = Column(Text, nullable=True)
    created_at    = Column(DateTime, server_default=func.now())
    created_by    = Column(Integer, ForeignKey("users.id"), nullable=True)

    request = relationship("SingleTestRequest", back_populates="deliveries")
