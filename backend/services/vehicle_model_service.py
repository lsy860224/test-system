from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from models.vehicle_model import VehicleModel
from schemas.vehicle_model import VehicleModelCreate, VehicleModelUpdate
from services import pagination_helper

def list_vehicle_models(db: Session, page: int, size: int, search: str | None) -> dict:
    q = db.query(VehicleModel).filter(VehicleModel.is_active == True)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(VehicleModel.code.ilike(like), VehicleModel.name.ilike(like)))
    return pagination_helper.paginate(q.order_by(VehicleModel.code), page, size)

def get_vehicle_model(db: Session, vehicle_model_id: int) -> VehicleModel:
    vm = db.query(VehicleModel).filter(VehicleModel.id == vehicle_model_id, VehicleModel.is_active == True).first()
    if not vm:
        raise HTTPException(status_code=404, detail="차종을 찾을 수 없습니다")
    return vm

def create_vehicle_model(db: Session, body: VehicleModelCreate) -> VehicleModel:
    existing = db.query(VehicleModel).filter(VehicleModel.code == body.code).first()
    if existing and existing.is_active:
        raise HTTPException(status_code=400, detail="이미 등록된 차종 코드입니다")
    if existing and not existing.is_active:
        # 소프트 삭제된 코드 재사용 — 새로 만들지 않고 재활성화한다
        existing.name = body.name
        existing.notes = body.notes
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return existing
    vm = VehicleModel(**body.model_dump(), is_active=True)
    db.add(vm)
    db.commit()
    db.refresh(vm)
    return vm

def update_vehicle_model(db: Session, vehicle_model_id: int, body: VehicleModelUpdate) -> VehicleModel:
    vm = get_vehicle_model(db, vehicle_model_id)
    if body.code != vm.code:
        existing = db.query(VehicleModel).filter(
            VehicleModel.code == body.code, VehicleModel.id != vehicle_model_id, VehicleModel.is_active == True,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="이미 등록된 차종 코드입니다")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(vm, field, value)
    db.commit()
    db.refresh(vm)
    return vm

def deactivate_vehicle_model(db: Session, vehicle_model_id: int):
    vm = get_vehicle_model(db, vehicle_model_id)
    vm.is_active = False
    db.commit()
