from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class VehicleModelBase(BaseModel):
    code: str
    name: Optional[str] = None
    notes: Optional[str] = None

class VehicleModelCreate(VehicleModelBase):
    pass

class VehicleModelUpdate(VehicleModelBase):
    pass

class VehicleModelOut(VehicleModelBase):
    id: int
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class PaginatedVehicleModels(BaseModel):
    total: int
    items: list[VehicleModelOut]
