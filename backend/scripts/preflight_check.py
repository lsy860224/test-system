"""운영(production) 기동 전 점검. start-prod.bat이 uvicorn 실행 전에 호출한다.
실패 시 exit code 1로 종료해 잘못된 상태로 운영 서버가 뜨는 것을 막는다.
"""
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")  # Windows cp949 콘솔에서 —, 특수문자 깨짐 방지
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import settings  # noqa: E402

DEV_DB_PATH = "E:/03. Job/00. Claude Code/au-test-system/backend/au_test_system.db"
DEFAULT_SECRET_KEY = "au-inc-secret-key-change-in-production-2026"

errors: list[str] = []
warnings: list[str] = []

if settings.environment != "production":
    errors.append(
        f"ENVIRONMENT='{settings.environment}' — 'production'이어야 한다. "
        "start-prod.bat이 환경변수를 제대로 넘기고 있는지 확인."
    )

if DEV_DB_PATH in settings.database_url:
    errors.append(
        "DATABASE_URL이 개발용 DB(au_test_system.db, seed/demo 데이터)를 가리키고 있다. "
        "운영 DB(예: au_test_system_prod.db)로 분리했는지 확인."
    )

if settings.secret_key == DEFAULT_SECRET_KEY:
    errors.append("SECRET_KEY가 기본값 그대로다. 운영 배포 전 반드시 변경.")

db_path_str = settings.database_url.replace("sqlite:///", "")
db_path = Path(db_path_str)
if not db_path.exists():
    warnings.append(f"운영 DB 파일이 아직 없다 — 최초 기동으로 새로 생성됨: {db_path}")
else:
    warnings.append(f"운영 DB 파일 확인됨: {db_path} — 스키마 변경 배포라면 백업을 먼저 떴는지 확인.")
    try:
        import bcrypt
        from sqlalchemy import create_engine, text
        # ORM(User 모델)로 조회하면 아직 마이그레이션되지 않은 신규 컬럼(예: token_version)까지
        # SELECT에 포함돼 "컬럼 없음" 에러로 이 검사 자체가 죽는다 — preflight는 init_db()의
        # 스키마 마이그레이션보다 먼저 실행되므로, 이 검사에 필요한 최소 컬럼만 raw SQL로 조회한다.
        engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
        with engine.connect() as conn:
            row = conn.execute(text("SELECT password_hash FROM users WHERE username = 'admin'")).fetchone()
        if row and bcrypt.checkpw(b"admin123", row[0].encode()):
            errors.append(
                "admin 계정 비밀번호가 기본값(admin123) 그대로다. "
                "즉시 로그인해 비밀번호를 변경한 뒤 재배포하라."
            )
    except Exception as e:
        # 이 검사 자체가 실패하면 보안 확인이 불가능한 상태이므로 경고로 넘기지 않고 배포를 막는다(fail-closed).
        errors.append(f"admin 기본 비밀번호 여부를 확인할 수 없어 배포를 막는다(원인: {e}).")

upload_dir = Path(settings.upload_dir)
if not upload_dir.is_absolute():
    upload_dir = Path(__file__).resolve().parent.parent / settings.upload_dir
upload_dir.mkdir(parents=True, exist_ok=True)

for w in warnings:
    print(f"[확인 필요] {w}")

if errors:
    print("\n[운영 기동 중단] 아래 항목을 해결한 뒤 다시 실행하라:")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)

print("\n[preflight] 통과 — 운영 서버를 기동한다.")
