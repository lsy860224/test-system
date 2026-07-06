import os
import shutil
from fastapi import HTTPException, UploadFile
from config import settings


def save_upload(subdir: str, entity_id: int, file: UploadFile) -> tuple[str, int]:
    """업로드 파일을 uploads/{subdir}/{entity_id}/ 에 저장하고 (file_path, file_size)를 반환한다."""
    dest_dir = os.path.join(settings.upload_dir, subdir, str(entity_id))
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, file.filename)
    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return dest_path, os.path.getsize(dest_path)


def delete_upload(file_path: str):
    if os.path.exists(file_path):
        os.remove(file_path)


def attachment_or_404(attachment):
    if not attachment:
        raise HTTPException(status_code=404, detail="첨부파일을 찾을 수 없습니다")
    return attachment
