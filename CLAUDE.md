# CLAUDE.md — AU Test System (au-test-system/)

This file provides guidance to Claude Code when working in the `au-test-system/` directory.
For PM Agent domain context, see the parent `../CLAUDE.md`.

---

## 1. 스택 & 실행

### Backend (FastAPI + SQLite)
```
venv:    backend/venv/Scripts/python.exe
실행:    python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
           (backend/ 디렉터리에서 실행)
DB:      backend/au_test_system.db  (절대 경로 필수 — CWD 상대경로 오류 주의)
포트:    8000 (이미 실행 중인지 확인: netstat -ano | findstr ":8000")
```

### Frontend (React + Vite)
```
실행:    npm run dev  (frontend/ 디렉터리에서 실행)
포트:    5173 (Claude Code 프리뷰), 5174 (사용자 브라우저 — 5173 점유 시)
CORS:    backend/main.py → allow_origins 에 5173, 5174, 4173 포함
```

### Auth
- JWT 방식, 만료 60분
- localStorage 키: `au_token`
- Zustand authStore: `token: localStorage.getItem('au_token')` — 페이지 로드 시 초기화

---

## 2. 아키텍처 원칙

| 계층 | 위치 | 규칙 |
|---|---|---|
| Router | `backend/routers/` | **thin** — 서비스 함수만 호출, 로직 금지 |
| Service | `backend/services/` | 비즈니스 로직 전담 |
| Schema | `backend/schemas/` | Pydantic 요청/응답 정의 |
| Model | `backend/models/` | SQLAlchemy ORM (엔티티당 1파일) |
| API client | `frontend/src/api/` | axios 래퍼 (엔티티당 1파일) |
| Page | `frontend/src/pages/` | 페이지 컴포넌트 |
| Store | `frontend/src/stores/` | Zustand (authStore, uiStore) |

---

## 3. 핵심 규칙 & 과거 버그 방지

### 네비게이션
```tsx
// ❌ 잘못된 방법: Zustand 상태 타이밍 미스로 PrivateRoute가 token=null 을 봄
navigate('/dashboard')

// ✅ 올바른 방법: 전체 페이지 리로드로 Zustand가 localStorage에서 재초기화
window.location.href = '/dashboard'
```

### SQLite DB 경로
```python
# ❌ CWD 상대경로 — 스크립트 실행 위치에 따라 엉뚱한 DB 생성됨
engine = create_engine("sqlite:///./au_test_system.db")

# ✅ 직접 조작 시 절대경로 사용
import sqlite3
conn = sqlite3.connect(r'E:\03. Job\00. Claude Code\au-test-system\backend\au_test_system.db')
```

### CORS
- 사용자 브라우저가 포트 5174를 쓸 수 있음 (5173이 Claude Code 점유 시)
- `backend/main.py`의 `allow_origins`에 5173, 5174 **둘 다** 있어야 함

---

## 4. 엔드포인트 구조

| 모듈 | 라우터 | 주요 엔드포인트 |
|---|---|---|
| Auth | `/auth` | `POST /auth/login` |
| Dashboard | `/dashboard` | `GET /dashboard/summary?year=YYYY` |
| 규격 매트릭스 | `/standards` | CRUD + `GET /standards/template` (xlsx) + `POST /standards/import-excel` |
| 고객사 | `/customers` | CRUD + 연락처 + 첨부파일 |
| 프로젝트 | `/projects` | CRUD + 규격 항목 연결 (`PUT /projects/{id}/standard-items`) |
| 시험 일정 | `/schedules` | CRUD + `GET /schedules/gantt` (활성 프로젝트별 Gantt 데이터) |
| NCR | `/ncr` | CRUD + 8D 필드 + 댓글 + 첨부 |
| 장비 | `/equipment` | CRUD + 교정이력 + 규격 Capability 매핑 + 투자계획 |
| 외주 시험소 | `/vendors` | CRUD + 단가표 |
| SOP | `/sop` | CRUD + 버전이력 |
| 임원 보고 | `/reports` | `GET /reports/gap-analysis` (규칙 기반 Gap 판정) + `GET /reports/quarterly-kpi?year=YYYY` (분기별 활동 지표) |
| 데이터 내보내기 | `/export` | `GET /export/excel` (전 모듈 8시트 워크북) |

---

## 5. 주요 파일 경로 빠른 참조

```
backend/
├── main.py                    ← FastAPI 앱 진입점, CORS, 라우터 등록
├── database.py                ← SQLAlchemy engine, SessionLocal, Base
├── models/
│   ├── user.py                ← User (admin 계정 초기화)
│   ├── standard.py            ← StandardItem, StandardCategory, StandardHistory
│   ├── equipment.py           ← Equipment, Calibration, EsMapping, Investment
│   ├── ncr.py                 ← NCRReport, Attachment, Comment
│   ├── project.py             ← Project, project_standard_items(M2M)
│   ├── schedule.py            ← TestSchedule
│   ├── vendor.py              ← VendorLab, VendorPriceItem
│   └── sop.py                 ← SOP, SOPVersion
├── services/
│   ├── dashboard_service.py   ← get_summary() — 집계 로직 전담
│   ├── report_service.py      ← generate_gap_analysis(), generate_quarterly_kpi() — 임원 보고 집계 로직
│   └── export_service.py      ← generate_full_export() — 전 모듈 8시트 Excel 워크북
frontend/
├── src/
│   ├── api/dashboard.ts       ← DashboardSummary 타입 정의
│   ├── api/reports.ts         ← GapAnalysisReport, QuarterlyKpiReport 타입 정의
│   ├── api/export.ts          ← exportApi.downloadAll()
│   ├── pages/Dashboard.tsx    ← DonutGauge, NcrBarChart 인라인 컴포넌트 + PDF 인쇄 버튼
│   ├── pages/GapReport.tsx    ← 임원 보고 Gap Analysis 1-pager, window.print() 기반 PDF 출력
│   ├── pages/QuarterlyKPI.tsx ← 임원 보고 분기별 KPI, 동일 인쇄 패턴
│   ├── pages/DataExport.tsx   ← 데이터 내보내기 허브 (Excel 다운로드 + PDF 보고서 바로가기)
│   ├── pages/GanttChart.tsx   ← 시험 일정 Gantt 뷰, SVG 타임라인 (Schedule.tsx 뷰 토글에서 렌더)
│   └── stores/authStore.ts    ← login(), logout(), token 관리
```

---

## 6. P2 기능 구현 현황

상세 현황: `../docs/P2_feature_status.md`

| 모듈 | 이름 | 상태 |
|---|---|---|
| M01 | 장비 관리 | ✅ 완료 |
| M02 | 외주 시험소 | ✅ 완료 |
| M03 | SOP 관리 | ✅ 완료 |
| M04 | 대시보드 고도화 | ✅ 완료 |
| M05 | NCR 관리 | ✅ 완료 |
| M06 | 프로젝트×일정 연동 | ✅ 완료 |
| M07 | 보고서 자동화 | ✅ 완료 |
| M08 | 데이터 내보내기 | ✅ 완료 |

P2 개발 기능 정의서(M01~M08) 전 항목 완료.
