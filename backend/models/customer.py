from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Customer(Base):
    __tablename__ = "customers"

    id                   = Column(Integer, primary_key=True, autoincrement=True)
    name                 = Column(String(200), nullable=False)
    short_name           = Column(String(50))
    company_type         = Column(String(30), nullable=False)  # 완성차 | 1차협력사 | 납품사_협력사
    business_reg_number  = Column(String(20), unique=True)
    homepage             = Column(String(300))
    address              = Column(Text)
    color_hex            = Column(String(7), default="#2B2F82")
    partner_code         = Column(String(50))
    notes                = Column(Text)
    is_active            = Column(Boolean, default=True)
    created_at           = Column(DateTime, server_default=func.now())
    updated_at           = Column(DateTime, server_default=func.now(), onupdate=func.now())

    contacts    = relationship("CustomerContact",    back_populates="customer", cascade="all, delete-orphan")
    attachments = relationship("CustomerAttachment", back_populates="customer", cascade="all, delete-orphan")
    projects    = relationship("Project",            back_populates="customer")


class CustomerContact(Base):
    __tablename__ = "customer_contacts"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    name        = Column(String(100), nullable=False)
    title       = Column(String(100))
    phone       = Column(String(20))
    email       = Column(String(200))
    is_primary  = Column(Boolean, default=False)
    created_at  = Column(DateTime, server_default=func.now())

    customer = relationship("Customer", back_populates="contacts")


class CustomerAttachment(Base):
    __tablename__ = "company_attachments"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    doc_type    = Column(String(50))   # 사업자등록증 | 인감증명서 | 협약서 | 기타
    file_name   = Column(String(255), nullable=False)
    file_path   = Column(String(500), nullable=False)
    file_size   = Column(Integer)
    uploaded_at = Column(DateTime, server_default=func.now())
    uploaded_by = Column(Integer, ForeignKey("users.id"))

    customer = relationship("Customer", back_populates="attachments")
