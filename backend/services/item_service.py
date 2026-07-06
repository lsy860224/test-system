from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.item import Item
from schemas.item import ItemCreate, ItemUpdate

def list_items(db: Session, page: int, size: int, search: str | None) -> dict:
    q = db.query(Item).filter(Item.is_active == True)
    if search:
        q = q.filter(Item.name.ilike(f"%{search}%"))
    total = q.count()
    items = q.order_by(Item.name).offset((page - 1) * size).limit(size).all()
    return {"total": total, "items": items}

def get_item(db: Session, item_id: int) -> Item:
    item = db.query(Item).filter(Item.id == item_id, Item.is_active == True).first()
    if not item:
        raise HTTPException(status_code=404, detail="아이템을 찾을 수 없습니다")
    return item

def create_item(db: Session, body: ItemCreate) -> Item:
    item = Item(**body.model_dump(), is_active=True)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

def update_item(db: Session, item_id: int, body: ItemUpdate) -> Item:
    item = get_item(db, item_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item

def deactivate_item(db: Session, item_id: int):
    item = get_item(db, item_id)
    item.is_active = False
    db.commit()
