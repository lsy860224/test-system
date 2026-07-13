import os
import uuid
from fastapi import HTTPException, UploadFile
from config import settings

_READ_CHUNK_SIZE = 1024 * 1024  # 1MB

# 시험 데이터 파일(장비 고유 확장자 포함)은 폭넓게 허용하되, 실행/스크립트 계열만 차단한다.
# 다운로드는 Content-Disposition: attachment로 강제되어 브라우저 내 실행 위험은 낮지만,
# 파일시스템에 실행 파일이 쌓이는 것 자체를 막는다.
_BLOCKED_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".ps1", ".vbs", ".vbe",
    ".js", ".jse", ".wsf", ".wsh", ".dll", ".sh", ".html", ".htm", ".svg", ".jar",
}


def save_upload(subdir: str, entity_id: int, file: UploadFile) -> tuple[str, int]:
    """업로드 파일을 uploads/{subdir}/{entity_id}/ 에 저장하고 (file_path, file_size)를 반환한다.

    같은 엔티티에 동일 파일명이 재업로드돼도 기존 파일을 덮어쓰지 않도록,
    디스크 저장명에는 uuid 접두사를 붙인다. 원본 파일명은 DB의 file_name 컬럼에
    별도로 저장되어 다운로드 시 그대로 노출되므로 사용자에게 영향 없다.
    """
    safe_filename = os.path.basename(file.filename or "")
    ext = os.path.splitext(safe_filename)[1].lower()
    if ext in _BLOCKED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"허용되지 않는 파일 형식입니다: {ext}")

    dest_dir = os.path.join(settings.upload_dir, subdir, str(entity_id))
    os.makedirs(dest_dir, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}_{safe_filename}"
    dest_path = os.path.join(dest_dir, unique_name)

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    total = 0
    with open(dest_path, "wb") as f:
        while True:
            chunk = file.file.read(_READ_CHUNK_SIZE)
            if not chunk:
                break
            total += len(chunk)
            if total > max_bytes:
                break
            f.write(chunk)

    if total > max_bytes:
        os.remove(dest_path)
        raise HTTPException(status_code=413, detail=f"파일 크기는 {settings.max_upload_size_mb}MB를 초과할 수 없습니다")
    return dest_path, total


def delete_upload(file_path: str):
    if os.path.exists(file_path):
        os.remove(file_path)


def attachment_or_404(attachment):
    if not attachment:
        raise HTTPException(status_code=404, detail="첨부파일을 찾을 수 없습니다")
    return attachment
