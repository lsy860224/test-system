from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Date, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class VendorLab(Base):
    __tablename__ = "vendor_labs"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    name           = Column(String(200), nullable=False)
    short_name     = Column(String(50), nullable=True)   # KTL, KTR 등 약칭
    lab_type       = Column(String(100), nullable=True)  # 공인시험소 / 교정기관 / 인증기관
    kolas_certified = Column(Boolean, default=False)
    contact_name   = Column(String(100), nullable=True)
    contact_phone  = Column(String(50),  nullable=True)
    contact_email  = Column(String(100), nullable=True)
    address        = Column(String(300), nullable=True)
    website        = Column(String(200), nullable=True)
    notes          = Column(Text,        nullable=True)
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime, server_default=func.now())

    test_scopes = relationship("VendorTestScope", back_populates="vendor",
                               cascade="all, delete-orphan",
                               order_by="VendorTestScope.test_name")
    orders      = relationship("VendorOrder", back_populates="vendor",
                               cascade="all, delete-orphan",
                               order_by="desc(VendorOrder.order_date)")


class VendorTestScope(Base):
    """시험소별 수행 가능 시험 항목 + 단가 + 납기"""
    __tablename__ = "vendor_test_scopes"

    id                   = Column(Integer, primary_key=True, autoincrement=True)
    vendor_id            = Column(Integer, ForeignKey("vendor_labs.id", ondelete="CASCADE"), nullable=False)
    standard_item_id     = Column(Integer, ForeignKey("standard_items.id", ondelete="SET NULL"), nullable=True)
    test_name            = Column(String(200), nullable=False)
    standard_no          = Column(String(100), nullable=True)  # 적용 규격 번호
    unit_price           = Column(Integer,     nullable=True)  # 단가 (원)
    lead_days            = Column(Integer,     nullable=True)  # 납기 일수
    kolas_report         = Column(String(10),  nullable=True)  # KOLAS 공인 성적서 발급 가능 여부: 가능 / 불가능
    notes                = Column(Text,        nullable=True)
    created_at           = Column(DateTime, server_default=func.now())

    vendor = relationship("VendorLab", back_populates="test_scopes")


class VendorOrder(Base):
    """외주 발주 이력"""
    __tablename__ = "vendor_orders"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    vendor_id     = Column(Integer, ForeignKey("vendor_labs.id", ondelete="CASCADE"), nullable=False)
    project_id    = Column(Integer, ForeignKey("projects.id"), nullable=True)  # 등록된 프로젝트와 연계
    schedule_id   = Column(Integer, ForeignKey("test_schedules.id"), nullable=True)  # 시험 일정과 연계 (진행중/완료 자동 반영)
    single_test_request_id = Column(Integer, ForeignKey("single_test_requests.id"), nullable=True)  # 단건 시험 요청과 연계
    test_items    = Column(Text,   nullable=True)   # 시험 항목 목록 (자유 텍스트)
    order_date    = Column(Date,   nullable=True)
    due_date      = Column(Date,   nullable=True)
    status        = Column(String(50), default="견적의뢰")
    total_amount  = Column(Integer, nullable=True)
    notes         = Column(Text,   nullable=True)
    created_at    = Column(DateTime, server_default=func.now())

    vendor   = relationship("VendorLab", back_populates="orders")
    project  = relationship("Project")
    schedule = relationship("TestSchedule")
    single_test_request = relationship("SingleTestRequest", back_populates="vendor_orders")
