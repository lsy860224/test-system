from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    username: str
    password: str = Field(min_length=8)
    name: str
    role: str = "팀원"   # admin | 팀장 | 팀원

class UserUpdate(BaseModel):
    name: str
    role: str
    password: Optional[str] = Field(default=None, min_length=8)   # 값이 있으면 비밀번호 변경

class UserListOut(BaseModel):
    id: int
    username: str
    name: str
    role: str
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    model_config = {"from_attributes": True}
