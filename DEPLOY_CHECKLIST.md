# 배포 체크리스트 — 개발/운영 서버 분리

`backend/start.bat`(개발)과 `backend/start-prod.bat`(운영)이 서로 다른 SQLite 파일을 가리키도록 분리했다. `au_test_system.db`(seed/demo 데이터, 개발 전용)와 `au_test_system_prod.db`(실데이터, 운영 전용)가 물리적으로 다른 파일이라 개발 중 실험이 운영 데이터를 건드릴 수 없다.

> 이 문서는 "배포 전에 뭘 확인해야 하는가" 체크리스트다. "실제로 어떻게 켜고 끄고 확인하는가"는 `SERVER_GUIDE.md` 참조 (SECRET_KEY `setx` 상세 절차 포함).

**2026-07-10부터 dev/prod가 포트까지 완전히 분리되어 동시 기동된다** (개발은 계속하면서 운영은 실 데이터 입력을 바로 시작할 수 있음):

| | 백엔드 | 프런트엔드 |
|---|---|---|
| 개발 | `backend/start.bat` → :8110 (`--reload`) | `npm run dev` → :5173 |
| 운영 | `backend/start-prod.bat` → :8111 (`--reload` 없음) | `frontend/start-prod.bat` → :4173 (`tsc && vite build` 후 `vite preview`) |

프런트 운영 빌드는 `frontend/.env.production`의 `VITE_API_URL=http://localhost:8111`이 `npm run build` 시점에 번들에 박히므로, 운영 프런트(4173)는 자동으로 운영 백엔드(8111)만 바라본다 — dev 프런트(5173)는 이 파일을 읽지 않고 기존처럼 8110을 본다. CORS(`main.py`의 `allow_origins`)는 이미 4173을 포함하고 있어 추가 변경이 필요 없었다.

**백엔드 포트가 8000/8001이 아니라 8110/8111인 이유 (2026-07-21)**: 이 PC에서 다른 프로젝트의 Docker 컨테이너(`devcontainer-frappe-1`, Frappe 프레임워크)가 포트 8000~8005·9000~9005를 전부 점유하고 있다는 게 실사용 중 발견됐다. 브라우저가 `localhost`를 IPv6(`::1`)로 해석해 요청을 보내면 au-test-system 백엔드가 아니라 그 컨테이너(Werkzeug/Flask)로 요청이 잘못 라우팅돼, 로그인 전 CORS preflight(OPTIONS)가 404를 받고 브라우저가 실제 요청을 차단 — 서버는 멀쩡히 떠 있는데 로그인만 되지 않는 증상으로 나타났다. 프런트 포트(5173/4173)는 그 범위 밖이라 안전하다. 이 컨테이너를 내릴 수 없는 상황(다른 작업 중)이라 백엔드 포트를 8000/8001 → 8110/8111로 이동해 충돌 자체를 피하는 쪽을 택했다.

## 최초 1회만: SECRET_KEY 운영값 등록

`config.py`의 기본 `SECRET_KEY`는 플레이스홀더다. `start-prod.bat`은 이 값이 바뀌지 않았으면 기동을 막는다(`scripts/preflight_check.py`가 자동 검사). PowerShell에서 한 번만:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
setx SECRET_KEY "위에서_나온_값"
```

`setx`는 OS 사용자 환경변수로 영구 등록되므로, 이후 새로 여는 터미널마다 `start-prod.bat`이 이 값을 자동으로 읽는다.

## 배포(운영 서버 기동)마다 확인

`start-prod.bat` 실행 시 `preflight_check.py`가 아래를 **자동으로** 검사하고, 실패하면 서버를 띄우지 않는다:

- [ ] `ENVIRONMENT=production`으로 설정돼 있는가
- [ ] `DATABASE_URL`이 개발용 `au_test_system.db`가 아니라 운영용 DB를 가리키는가
- [ ] `SECRET_KEY`가 기본 플레이스홀더에서 바뀌었는가

아래는 **수동으로** 확인해야 한다 (자동화 대상 아님):

- [ ] 스키마를 바꾸는 배포(모델 변경, `database.py`의 `_migrate_db()` 목록에 새 마이그레이션 추가)라면, `au_test_system_prod.db` 파일을 배포 전에 복사해 백업했는가
      ```powershell
      copy au_test_system_prod.db "au_test_system_prod_backup_YYYYMMDD.db"
      ```
- [ ] `main.py`의 `allow_origins`가 실제 운영 접속 도메인/IP를 포함하는가 (현재는 `localhost:5173/5174/4173`만 허용 — 사내망 외부 IP로 접속한다면 추가 필요)
- [ ] 프런트엔드를 재배포하는 경우, `npm run build`(=`tsc && vite build`)가 타입 오류 없이 통과하는가 — dev는 esbuild 기반이라 타입체크를 건너뛰므로, 운영 빌드에서만 드러나는 타입 오류가 있을 수 있다(2026-07-10에 실제로 14건 발견·수정된 전례 있음). `frontend/start-prod.bat`을 실제로 돌려서 확인하기 전엔 "될 것"이라고 가정하지 말 것.

## DB 쓰기 대상 판단 기준 (Claude Code가 데이터를 직접 반영할 때)

Claude Code가 규격/SOP/일정/장비 등 어떤 모듈이든 DB에 데이터를 쓰는 작업을 수행할 때, 개발 DB(`au_test_system.db`, :8110)와 운영 DB(`au_test_system_prod.db`, :8111) 중 어디에 적용할지는 아래 3단 기준을 따른다(2026-07-10 확정).

| 작업 유형 | 예시 | 적용 대상 |
|---|---|---|
| ① 콘텐츠 데이터 추가/수정 | 규격 항목, SOP, 시험 일정, 장비, NCR 등 실 업무 데이터 자체 | **운영 DB에만** (별도 언급 없을 시 기본값) |
| ② 구조 변경 | 스키마 변경, 테이블/컬럼 추가, `models/` 변경을 요구하는 마이그레이션 | **개발 DB에 우선 반영.** 운영 DB는 사용자와의 대화로 검토를 거친 뒤에만 적용 — 개발에 반영했다고 자동으로 운영까지 진행하지 않는다 |
| ③ 상태/분류값 추가 | 카테고리 신설, enum 값 추가, 상태 코드 확장 등 마스터 데이터 "옵션" 확장 | **운영·개발 DB 모두** |

어느 유형에 해당하는지 애매하면 임의로 진행하지 않고 사용자에게 먼저 확인한다.

**실제 사례(2026-07-10)**: ES95400-10 규격 항목 42건 신규 등록은 ①(콘텐츠)이라 운영 DB에만 반영했고, `standard_categories`에 '화학'·'기밀' 카테고리를 신설한 것은 ③(상태/분류값 확장)이라 운영·개발 DB 둘 다에 반영했다. `StandardCategory`처럼 생성 API가 없는 테이블은 SQLite 직접 INSERT로 처리하되, 항목 자체의 필드 변경은 가능하면 기존 API(`PUT /standards/{id}` 등)를 사용해 변경 이력이 정상적으로 남게 한다.

## 알려진 잔여 이슈

- 롤백 절차는 별도로 없다 — 문제 발생 시 위 백업 파일로 `au_test_system_prod.db`를 교체하고 서버를 재기동하는 수동 절차만 존재한다.
- 개발/운영 동시 기동은 백엔드 포트(8110/8111)까지는 해결됐지만, DB 파일 자체는 여전히 로컬 단일 머신 위 SQLite라 여러 사람이 동시에 운영 서버에 접속해 쓰는 시나리오(사내망 외부 접속)까지는 검증되지 않았다 — 그 경우 CORS(`allow_origins`)에 실제 접속 도메인/IP 추가가 먼저 필요하다.
- 백엔드 포트(8110/8111)는 이 PC에 떠 있는 다른 프로젝트의 Docker 컨테이너와의 충돌을 피하려고 고른 값이다 — 그 컨테이너가 없는 다른 PC로 옮기면 다시 8000/8001로 되돌려도 무방하지만, 굳이 되돌릴 이유는 없다.

## ⚠️ `.bat` 파일을 다시 편집할 때 반드시 지킬 것

`start-prod.bat`을 텍스트 편집(특히 코드 에디터/AI 도구로 저장)하면 **줄바꿈이 LF로, 인코딩이 BOM 없는 UTF-8로 바뀔 수 있다.** 이 상태에서는 `set DATABASE_URL=...`처럼 안전 검증에 쓰이는 줄이 cmd.exe 파서에서 깨져 **`preflight_check.py`가 아예 실행되지 않은 채 uvicorn이 떠버리는 사고**가 실제로 재현된 적 있다(2026-07-10, dev DB를 물고 "운영"이라는 이름으로 기동됨 — 배포 전 스모크 테스트로 잡음). `.bat` 파일을 고친 뒤에는:
1. 파일이 CRLF + UTF-8 BOM인지 확인 (`xxd start-prod.bat | head -1`로 첫 바이트가 `ef bb bf`인지 확인)
2. 실제로 `cmd /c start-prod.bat`을 새 터미널에서 돌려 `[preflight] 통과` 메시지가 뜨는지, `au_test_system_prod.db`가 아니라 엉뚱한 DB를 물지 않는지 재확인하기 전에는 "고쳤다"고 간주하지 말 것.
3. `if (...)` 블록 안에 새 `echo` 줄을 추가한다면 텍스트에 괄호 `(` `)`를 그대로 쓰지 말 것 — cmd.exe가 블록의 닫는 괄호로 오인해 파싱이 깨진다(`... was unexpected at this time.`). 같은 날 `start.bat`의 중첩 `if` 블록 안 `echo [AU] 패키지 설치 중 (최초 1회)...`에서 실제로 이 문제가 나서 `^(`·`^)`로 이스케이프해 고쳤다. `start-prod.bat`은 2026-07-10 기준 `if` 블록이 중첩되지 않고(두 `if`가 순차적인 별개 블록), 괄호가 있는 echo(`...운영(PRODUCTION)`)도 블록 밖 최상위 코드라 이 문제에서 안전하다는 것을 실제 실행으로 확인했다 — 이 구조가 바뀌면(특히 `if` 블록 안에 괄호 포함 텍스트가 들어가면) 다시 검증할 것.
