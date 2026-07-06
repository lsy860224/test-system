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
    from models import user, customer, standard, ncr, project, schedule, equipment, vendor, sop, item  # noqa
    Base.metadata.create_all(bind=engine)
    _migrate_db()

def _migrate_db():
    """기존 DB에 새 컬럼 안전하게 추가 (SQLite ALTER TABLE)"""
    from sqlalchemy import text
    migrations = [
        # standard_items
        "ALTER TABLE standard_items ADD COLUMN standard_name VARCHAR(200)",
        "ALTER TABLE standard_items ADD COLUMN standard_no VARCHAR(50)",
        "ALTER TABLE standard_items ADD COLUMN revision_no VARCHAR(20)",
        # equipment
        "ALTER TABLE equipment ADD COLUMN category VARCHAR(100)",
        "ALTER TABLE equipment ADD COLUMN manager VARCHAR(100)",
        "ALTER TABLE equipment ADD COLUMN updated_at DATETIME",
        # projects
        "ALTER TABLE projects ADD COLUMN item_id INTEGER REFERENCES items(id)",
        "ALTER TABLE projects ADD COLUMN assignee_id INTEGER REFERENCES users(id)",
        # test_schedules
        "ALTER TABLE test_schedules ADD COLUMN data_path VARCHAR(500)",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # 컬럼이 이미 존재하면 무시
