"""
초기 데이터 입력 스크립트 — 최초 1회만 실행
규격 카테고리 기본 데이터를 DB에 넣습니다.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, init_db
from models.standard import StandardCategory

def seed_standard_categories(db):
    if db.query(StandardCategory).count() > 0:
        print("  [SKIP] 규격 카테고리 이미 존재")
        return

    categories = [
        StandardCategory(code="ENV",  name_ko="환경내구",   display_order=1, color_hex="#3182CE"),
        StandardCategory(code="ELEC", name_ko="전기/전자",  display_order=2, color_hex="#D69E2E"),
        StandardCategory(code="EMC",  name_ko="EMC/EMI",    display_order=3, color_hex="#9B2C2C"),
        StandardCategory(code="MECH", name_ko="기계/물리",  display_order=4, color_hex="#2C7A7B"),
        StandardCategory(code="REL",  name_ko="신뢰성",     display_order=5, color_hex="#553C9A"),
        StandardCategory(code="SAFE", name_ko="기능안전",   display_order=6, color_hex="#C05621"),
        StandardCategory(code="PERF", name_ko="성능/기능",  display_order=7, color_hex="#276749"),
        StandardCategory(code="ETC",  name_ko="기타",       display_order=8, color_hex="#718096"),
    ]
    db.add_all(categories)
    db.commit()
    print(f"  [OK] 규격 카테고리 {len(categories)}개 추가")

if __name__ == "__main__":
    print("=== AU Inc. 초기 데이터 입력 ===")
    init_db()
    db = SessionLocal()
    try:
        seed_standard_categories(db)
        print("완료!")
    finally:
        db.close()
