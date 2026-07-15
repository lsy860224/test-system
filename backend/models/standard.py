from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Date, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class StandardCategory(Base):
    __tablename__ = "standard_categories"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    code          = Column(String(20), unique=True, nullable=False)  # elec | mech | climate | ip | chem
    name_ko       = Column(String(50), nullable=False)               # 전기적 시험
    display_order = Column(Integer, default=0)
    color_hex     = Column(String(7), default="#1565C0")

    items = relationship("StandardItem", back_populates="category")


class StandardItem(Base):
    __tablename__ = "standard_items"

    id                      = Column(Integer, primary_key=True, autoincrement=True)
    standard_no             = Column(String(50), nullable=True)    # ISO 16750-2, ES 60100-NE30
    standard_name           = Column(String(200), nullable=True)   # 자동차 전장부품 전기적 환경 하중 및 시험
    revision_no             = Column(String(20), nullable=True)    # Rev.3, 2022-01
    standard_code           = Column(String(20), nullable=False, index=True)   # 6.1.1
    name                    = Column(String(200), nullable=False)
    category_id             = Column(Integer, ForeignKey("standard_categories.id"))
    test_condition_summary  = Column(String(200))
    test_condition_detail   = Column(Text)                    # JSON
    source_type             = Column(String(10), default="외주")  # 자체 | 외주 | 검토중
    priority                = Column(String(5), default="Med")   # High | Med | Low
    priority_score          = Column(Integer, default=50)
    dv_target_date          = Column(Date, nullable=True)
    dv_actual_date          = Column(Date, nullable=True)
    pv_target_date          = Column(Date, nullable=True)
    pv_actual_date          = Column(Date, nullable=True)
    assignee_id             = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes                   = Column(Text)
    is_deleted              = Column(Boolean, default=False)
    created_at              = Column(DateTime, server_default=func.now())
    updated_at              = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_by              = Column(Integer, ForeignKey("users.id"), nullable=True)

    category = relationship("StandardCategory", back_populates="items")
    history  = relationship("StandardHistory",  back_populates="standard_item", cascade="all, delete-orphan")


class StandardHistory(Base):
    __tablename__ = "standard_history"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    standard_item_id = Column(Integer, ForeignKey("standard_items.id", ondelete="CASCADE"), nullable=False)
    field_name       = Column(String(50))
    old_value        = Column(Text)
    new_value        = Column(Text)
    changed_by       = Column(Integer, ForeignKey("users.id"), nullable=True)
    changed_at       = Column(DateTime, server_default=func.now())

    standard_item = relationship("StandardItem", back_populates="history")
