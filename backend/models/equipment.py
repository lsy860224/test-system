from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Date, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Equipment(Base):
    __tablename__ = "equipment"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    name             = Column(String(200), nullable=False)
    model            = Column(String(100), nullable=True)
    manufacturer     = Column(String(100), nullable=True)
    serial_number    = Column(String(100), unique=True, nullable=True)
    asset_number     = Column(String(100), nullable=True)
    category         = Column(String(100), nullable=True)   # 환경시험기/전기시험기/EMC/기계/신뢰성/측정기/기타
    manager          = Column(String(100), nullable=True)   # 담당자
    status           = Column(String(20), default="운용중")  # 운용중|교정중|수리중|대기중|폐기
    location         = Column(String(100), nullable=True)
    purchase_date    = Column(Date, nullable=True)
    notes            = Column(Text, nullable=True)
    created_at       = Column(DateTime, server_default=func.now())
    updated_at       = Column(DateTime, server_default=func.now(), onupdate=func.now())

    calibrations = relationship(
        "EquipmentCalibration", back_populates="equipment",
        cascade="all, delete-orphan", order_by="desc(EquipmentCalibration.calibration_date)"
    )
    standard_mappings = relationship("EquipmentStandardMapping", back_populates="equipment", cascade="all, delete-orphan")
    investments  = relationship("EquipmentInvestment", back_populates="equipment", cascade="all, delete-orphan")


class EquipmentCalibration(Base):
    __tablename__ = "equipment_calibrations"

    id                    = Column(Integer, primary_key=True, autoincrement=True)
    equipment_id          = Column(Integer, ForeignKey("equipment.id", ondelete="CASCADE"), nullable=False)
    calibration_type      = Column(String(20), default="정기교정")  # 정기교정|특별교정|기능점검
    calibration_date      = Column(Date, nullable=False)
    next_due_date         = Column(Date, nullable=True)    # 다음 교정 예정(만료)일
    result                = Column(String(20), default="합격")  # 합격|불합격|조건부합격
    calibration_body      = Column(String(200), nullable=True)  # 교정기관
    certificate_number    = Column(String(100), nullable=True)
    certificate_file_path = Column(String(500), nullable=True)
    notes                 = Column(Text, nullable=True)
    created_at            = Column(DateTime, server_default=func.now())
    created_by            = Column(Integer, ForeignKey("users.id"), nullable=True)

    equipment = relationship("Equipment", back_populates="calibrations")


class EquipmentStandardMapping(Base):
    """장비 ↔ 규격 항목 Capability 매핑"""
    __tablename__ = "equipment_standard_mappings"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    equipment_id      = Column(Integer, ForeignKey("equipment.id", ondelete="CASCADE"), nullable=False)
    standard_item_id  = Column(Integer, ForeignKey("standard_items.id", ondelete="CASCADE"), nullable=False)

    equipment = relationship("Equipment", back_populates="standard_mappings")


class EquipmentInvestment(Base):
    """장비 투자 계획 (신규 구입/유지보수/교정비/폐기 예산)"""
    __tablename__ = "equipment_investments"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id", ondelete="SET NULL"), nullable=True)
    year         = Column(Integer, nullable=False)
    invest_type  = Column(String(50), nullable=False)   # 신규구입|유지보수|교정비|수리|폐기
    item_name    = Column(String(200), nullable=True)   # 신규구입 시 예정 장비명
    amount_est   = Column(Integer, nullable=True)       # 금액 추정 (만원)
    notes        = Column(Text, nullable=True)
    created_at   = Column(DateTime, server_default=func.now())

    equipment = relationship("Equipment", back_populates="investments")
