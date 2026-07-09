from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)  # 수신자
    title        = Column(String(200), nullable=False)
    message      = Column(String(500), nullable=True)
    link_path    = Column(String(200), nullable=True)
    related_type = Column(String(50),  nullable=True)   # sop 등
    related_id   = Column(Integer,     nullable=True)
    is_read      = Column(Boolean, default=False)
    created_at   = Column(DateTime, server_default=func.now())
