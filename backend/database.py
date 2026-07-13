from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # SQLite 전용
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def init_db():
    from models import user, customer, standard, ncr, project, schedule, equipment, vendor, sop, item, notification, single_test  # noqa
    Base.metadata.create_all(bind=engine)
    _migrate_db()

def _drop_fk_column(model, table_name: str, column: str):
    """SQLite는 FK 제약이 걸린 컬럼을 ALTER TABLE DROP COLUMN으로 지울 수 없다.
    테이블을 모델 최신 정의로 재생성하고 데이터를 옮겨서 제거한다."""
    from sqlalchemy import text, inspect as sa_inspect
    insp = sa_inspect(engine)
    if table_name not in insp.get_table_names():
        return
    existing_cols = [c["name"] for c in insp.get_columns(table_name)]
    if column not in existing_cols:
        return  # 이미 정리됨
    keep_cols = [c for c in existing_cols if c != column]
    cols_csv = ", ".join(keep_cols)
    tmp_name = f"{table_name}_legacy_tmp"
    with engine.connect() as conn:
        conn.execute(text(f"DROP TABLE IF EXISTS {tmp_name}"))
        conn.execute(text(f"ALTER TABLE {table_name} RENAME TO {tmp_name}"))
        conn.commit()
    model.__table__.create(bind=engine)
    with engine.connect() as conn:
        conn.execute(text(f"INSERT INTO {table_name} ({cols_csv}) SELECT {cols_csv} FROM {tmp_name}"))
        conn.execute(text(f"DROP TABLE {tmp_name}"))
        conn.commit()

def _migrate_db():
    """기존 DB에 새 컬럼 안전하게 추가 (SQLite ALTER TABLE)"""
    from sqlalchemy import text
    migrations = [
        # standard_items
        "ALTER TABLE standard_items ADD COLUMN standard_name VARCHAR(200)",
        "ALTER TABLE standard_items ADD COLUMN standard_no VARCHAR(50)",
        "ALTER TABLE standard_items ADD COLUMN revision_no VARCHAR(20)",
        "ALTER TABLE standard_items DROP COLUMN status",  # 정의 없이 방치된 필드 제거 (2026-07-07)
        # equipment
        "ALTER TABLE equipment ADD COLUMN category VARCHAR(100)",
        "ALTER TABLE equipment ADD COLUMN manager VARCHAR(100)",
        "ALTER TABLE equipment ADD COLUMN updated_at DATETIME",
        # projects
        "ALTER TABLE projects ADD COLUMN item_id INTEGER REFERENCES items(id)",
        "ALTER TABLE projects ADD COLUMN assignee_id INTEGER REFERENCES users(id)",
        "ALTER TABLE projects DROP COLUMN part_name",  # item_id로 완전 대체 (2026-07-07)
        # test_schedules
        "ALTER TABLE test_schedules ADD COLUMN data_path VARCHAR(500)",
        "ALTER TABLE test_schedules ADD COLUMN round_no INTEGER DEFAULT 1",
        # vendor_test_scopes: KOLAS 인정 범위(자유서술) → KOLAS 공인 성적서 가능/불가능 드롭다운 (2026-07-07)
        "ALTER TABLE vendor_test_scopes ADD COLUMN kolas_report VARCHAR(10)",
        "UPDATE vendor_test_scopes SET kolas_report = '가능' WHERE accreditation_scope IS NOT NULL AND kolas_report IS NULL",
        "ALTER TABLE vendor_test_scopes DROP COLUMN accreditation_scope",
        # vendor_orders: 프로젝트명 자유입력 → 등록된 프로젝트 연계(project_id), 상태값 개편 (2026-07-07)
        "ALTER TABLE vendor_orders ADD COLUMN project_id INTEGER REFERENCES projects(id)",
        "ALTER TABLE vendor_orders DROP COLUMN project_name",
        "UPDATE vendor_orders SET status = '견적의뢰' WHERE status = '발주전'",
        # vendor_orders: 시험 일정과 연계(schedule_id) — 진행중/완료 상태 자동 반영 (2026-07-07)
        "ALTER TABLE vendor_orders ADD COLUMN schedule_id INTEGER REFERENCES test_schedules(id)",
        # vendor_orders: 단건 시험 요청과 연계 (2026-07-08)
        "ALTER TABLE vendor_orders ADD COLUMN single_test_request_id INTEGER REFERENCES single_test_requests(id)",
        # 옛 vendors 테이블(M02 시험소 모듈 재구축 전 잔재, VendorLab과 무관) 정리 (2026-07-07)
        "DROP TABLE IF EXISTS vendors",
        # sops: 문서 종류(시험/장비) 구분 추가, 승인자 자유텍스트 → 사용자 참조(approver_id) (2026-07-07)
        "ALTER TABLE sops ADD COLUMN doc_type VARCHAR(20) DEFAULT '시험절차서'",
        "ALTER TABLE sops ADD COLUMN approver_id INTEGER REFERENCES users(id)",
        "ALTER TABLE sops DROP COLUMN approved_by",
        # project_standard_items: 항목별 비고는 가독성이 떨어져 규격 단위 비고(project_standard_notes)로 대체 (2026-07-10)
        "ALTER TABLE project_standard_items DROP COLUMN notes",
        # notifications: 사용자가 알림을 수동 제거해도 재생성 방지 판정에 쓰도록 소프트 삭제 플래그 추가 (2026-07-13)
        "ALTER TABLE notifications ADD COLUMN is_removed BOOLEAN DEFAULT 0",
        # notifications: 완료예정일 동기화가 짧은 시간 내 동시 요청될 때(예: 폴링 겹침) 같은 사용자에게
        # 같은 프로젝트·같은 D-day 알림이 중복 생성되는 경합을 DB 레벨에서 차단 (2026-07-13, 실제 중복 발생 확인 후 추가)
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_deadline_dedup ON notifications(user_id, related_type, related_id) WHERE related_type LIKE 'project_deadline_%'",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # 컬럼이 이미 존재하면 무시

    # vendor_id는 FK 제약이 걸려 있어 위 단순 ALTER로 못 지운다 — 테이블 재생성으로 처리
    from models.schedule import TestSchedule
    from models.standard import StandardItem
    _drop_fk_column(TestSchedule, "test_schedules", "vendor_id")
    _drop_fk_column(StandardItem, "standard_items", "vendor_id")
