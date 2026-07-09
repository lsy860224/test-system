from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ItemBase(BaseModel):
    name: str
    category: Optional[str] = None
    spec: Optional[str] = None
    notes: Optional[str] = None

class ItemCreate(ItemBase):
    pass

class ItemUpdate(ItemBase):
    pass

class ItemOut(ItemBase):
    id: int
    item_code: Optional[str] = None
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class PaginatedItems(BaseModel):
    total: int
    items: list[ItemOut]
