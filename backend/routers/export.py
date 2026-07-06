from datetime import date
from urllib.parse import quote
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from dependencies import get_db, get_current_user
from services import export_service

router = APIRouter(prefix="/export", tags=["데이터 내보내기"])

@router.get("/excel")
def export_excel(db: Session = Depends(get_db), _=Depends(get_current_user)):
    content = export_service.generate_full_export(db)
    filename = f"AU_전체데이터_{date.today().isoformat()}.xlsx"
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )
