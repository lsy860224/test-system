from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from dependencies import get_db, require_staff
from schemas.vehicle_model import VehicleModelCreate, VehicleModelUpdate, VehicleModelOut, PaginatedVehicleModels
from services import vehicle_model_service

router = APIRouter(prefix="/vehicle-models", tags=["차종 관리"])

@router.get("/", response_model=PaginatedVehicleModels)
def list_vehicle_models(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=1000),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    return vehicle_model_service.list_vehicle_models(db, page, size, search)

@router.post("/", response_model=VehicleModelOut, status_code=201)
def create_vehicle_model(body: VehicleModelCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return vehicle_model_service.create_vehicle_model(db, body)

@router.get("/{vehicle_model_id}", response_model=VehicleModelOut)
def get_vehicle_model(vehicle_model_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    return vehicle_model_service.get_vehicle_model(db, vehicle_model_id)

@router.put("/{vehicle_model_id}", response_model=VehicleModelOut)
def update_vehicle_model(vehicle_model_id: int, body: VehicleModelUpdate, db: Session = Depends(get_db), _=Depends(require_staff)):
    return vehicle_model_service.update_vehicle_model(db, vehicle_model_id, body)

@router.delete("/{vehicle_model_id}", status_code=204)
def deactivate_vehicle_model(vehicle_model_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    vehicle_model_service.deactivate_vehicle_model(db, vehicle_model_id)
