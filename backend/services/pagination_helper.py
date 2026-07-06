from sqlalchemy.orm import Query


def paginate(query: Query, page: int, size: int) -> dict:
    """count() 후 offset/limit 적용. query에는 order_by까지 적용해서 전달한다."""
    total = query.count()
    items = query.offset((page - 1) * size).limit(size).all()
    return {"total": total, "items": items}
