# 서버 기동 가이드 — 개발/운영 동시 운영

`DEPLOY_CHECKLIST.md`가 "배포 전에 뭘 확인해야 하는가"를 다루는 체크리스트라면, 이 문서는 "실제로 어떻게 켜고 끄고 확인하는가"를 다루는 실행 가이드다. 2026-07-10부터 개발 서버와 운영 서버가 DB·포트 모두 분리되어 있어 **둘을 동시에 켜놓고** 개발은 계속하면서 운영은 실 데이터를 입력할 수 있다.

## 1. 전체 구성

| | 백엔드 | 프런트엔드 | 데이터 |
|---|---|---|---|
| 개발(dev) | `:8000` | `:5173` | `backend/au_test_system.db` (seed/demo) |
| 운영(prod) | `:8001` | `:4173` | `backend/au_test_system_prod.db` (실데이터) |

프런트 운영 빌드(`frontend/.env.production`의 `VITE_API_URL=http://localhost:8001`)가 빌드 시점에 번들에 박히기 때문에, 운영 프런트(4173)는 항상 운영 백엔드(8001)만 바라본다. 개발 프런트(5173)는 이 파일을 읽지 않고 기본값(8000)을 그대로 쓴다. CORS(`backend/main.py`의 `allow_origins`)는 5173·5174·4173을 이미 다 허용하고 있어 추가 설정이 필요 없다.

## 2. 개발 서버 기동

```
backend/start.bat          → uvicorn --reload, :8000, au_test_system.db
frontend에서: npm run dev  → vite dev, :5173
```

Claude Code 세션에서는 `.claude/launch.json`에 등록된 "AU Backend"/"AU Frontend"를 `preview_start`로 띄우는 게 기본이다. 사람이 직접 띄울 땐 `backend/start.bat`을 더블클릭하거나, `frontend/` 디렉터리에서 `npm run dev`를 실행한다.

## 3. 운영 서버 기동

```
backend/start-prod.bat            → uvicorn (--reload 없음), :8001, au_test_system_prod.db
frontend/start-prod.bat           → tsc && vite build 후 vite preview, :4173
```

운영 백엔드는 기동 전에 `backend/scripts/preflight_check.py`가 `ENVIRONMENT`/`DATABASE_URL`/`SECRET_KEY` 세 가지를 자동 검증하고, 하나라도 걸리면 서버를 아예 띄우지 않는다. 운영 프런트는 매번 `tsc` 타입체크부터 다시 하므로(개발 서버는 esbuild라 타입체크를 건너뜀), 개발에서 멀쩡해 보여도 운영 빌드에서 처음 드러나는 타입 오류가 있을 수 있다 — 실제로 2026-07-10에 14건이 이렇게 발견됐다.

**최초 1회, SECRET_KEY 등록이 안 돼 있다면 §4부터 먼저 처리한다.** 이미 등록돼 있다면 두 `start-prod.bat`을 각각 실행하면 된다.

## 4. SECRET_KEY — 최초 1회 등록 (상세)

### 왜 필요한가
`backend/config.py`의 `SECRET_KEY` 기본값은 `"au-inc-secret-key-change-in-production-2026"`이라는 플레이스홀더다. 이 값은 JWT 토큰 서명에 쓰이므로, 운영에서 이 값 그대로 두면 누구나 기본값을 알고 있는 키로 토큰을 위조할 수 있다. `preflight_check.py`가 이 값이 그대로면 운영 기동을 강제로 막는 이유다.

### 등록 절차 (최초 1회만)
PowerShell에서:
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```
출력된 64자리 16진수 문자열을 그대로:
```powershell
setx SECRET_KEY "여기에_위에서_나온_값_붙여넣기"
```
`SUCCESS: Specified value was saved.`가 뜨면 등록된 것이다.

### `setx`의 함정 — "새 터미널"이 진짜로 새 터미널이어야 하는 이유
`setx`는 **레지스트리**(`HKCU\Environment`)에만 값을 쓴다. Windows에서 프로세스는 자신을 생성한 부모 프로세스로부터 환경변수 블록을 통째로 물려받을 뿐, 실행 중에 레지스트리를 다시 읽지 않는다. 그래서:

- `setx` 실행 **이전에 이미 열려 있던** PowerShell·cmd·Claude Code 세션의 백그라운드 셸은 값이 등록된 걸 절대 못 본다 — 그 프로세스를 재사용해서 자식 프로세스(`cmd /c ...`, `start-prod.bat` 등)를 아무리 새로 띄워도 부모의 옛날 환경변수를 그대로 물려받는다.
- 이 상태에서 `start-prod.bat`을 돌리면 `preflight_check.py`가 "SECRET_KEY가 기본값 그대로다"라며 FAIL을 내는데, **이건 값이 실제로 미등록이라서가 아니라 그 셸이 낡은 환경을 보고 있어서** 나는 거짓 FAIL일 수 있다. 실제로 이 프로젝트에서 여러 번 재현된 패턴이다.
- 진짜로 새로 연 터미널(예: 새 Windows Terminal 창, 새 cmd 창)은 자신을 띄운 explorer.exe 등이 그 시점의 최신 레지스트리 값을 읽어 넘겨주므로 정상적으로 값을 본다.

**결론**: `setx` 등록 후에는 반드시 **그 등록 이후에 새로 연** 터미널에서 `start-prod.bat`을 실행해야 한다. 기존에 열려 있던 세션에서 계속 FAIL이 나도 당황하지 말고, 새 터미널을 여는 것부터 시도한다.

### 값을 노출하지 않고 등록 여부만 확인하는 방법
시크릿 값을 화면에 출력하는 건(전체든 일부든) 보안상 피해야 한다. 존재 여부·길이·기본값 일치 여부만 boolean으로 확인한다:
```powershell
$v = [Environment]::GetEnvironmentVariable("SECRET_KEY", "User")
$isDefault = $v -eq "au-inc-secret-key-change-in-production-2026"
$hasValue = -not [string]::IsNullOrEmpty($v)
Write-Output "registry_has_value=$hasValue length=$($v.Length) is_default_placeholder=$isDefault"
```
이건 프로세스 계보와 무관하게 **레지스트리 자체**를 직접 조회하는 것이라, 어떤 셸에서 돌려도 정확한 등록 상태를 알려준다(단, 이 값 자체가 실제 운영 서버가 새 터미널에서 볼 값과 같다는 뜻이지, 지금 이 셸이 그 값을 "쓸 수 있다"는 뜻은 아니다 — §정확한 반영 여부는 여전히 새 터미널에서 `start-prod.bat`을 실제로 돌려봐야 확인된다).

### 자동화 도구(Claude Code 등)가 지켜야 할 것
- `SECRET_KEY` 값을 로그·채팅·보고서에 전체든 일부든 출력하지 않는다.
- 권한 시스템이 값 조회 시도를 막으면 우회하지 말고 그대로 보고하고 멈춘다 — 대신 위의 boolean 확인 방식을 쓴다.
- `start-prod.bat`을 백그라운드로 재기동할 때는 매번 `$env:SECRET_KEY = [Environment]::GetEnvironmentVariable("SECRET_KEY", "User")`로 그 프로세스 안에서만 명시적으로 새로고침한 뒤 실행한다 — 이러면 스크립트를 실행하는 셸이 오래된 것이어도 진짜 새 터미널과 동일한 결과를 얻는다(레지스트리 값을 그 자리에서 직접 읽어와 주입하는 것이므로).

## 5. 지금 뭐가 떠 있는지 확인하는 법

`preview_list`(Claude Code 프리뷰 도구)는 **개발 서버만** 추적한다 — 운영 서버는 백그라운드 셸 프로세스로 띄우기 때문에 `preview_list`가 비어 있어도 운영이 죽었다는 뜻이 아니고, 반대로 운영이 떠 있어도 `preview_list`엔 안 잡힌다. 정확히 확인하려면 4개 포트를 직접 찔러본다:

```bash
curl -s -o /dev/null -w "status=%{http_code}\n" http://localhost:8000/docs   # 개발 백엔드
curl -s -o /dev/null -w "status=%{http_code}\n" http://localhost:8001/docs   # 운영 백엔드
curl -s -o /dev/null -w "status=%{http_code}\n" http://localhost:5173/      # 개발 프런트
curl -s -o /dev/null -w "status=%{http_code}\n" http://localhost:4173/      # 운영 프런트
```
백엔드는 `/`(루트)가 아니라 `/docs`로 확인한다 — FastAPI는 루트 경로 핸들러가 없어서 `/`는 정상 상태에서도 404가 뜬다.

## 6. 알려진 이슈 / 트러블슈팅

- **운영 서버가 예기치 않게 죽는 경우가 있었다** (2026-07-10, 원인 미특정). 백그라운드 셸 프로세스로 띄우는 구조라 이런 게 또 발생할 수 있다 — 계속 안정적으로 운영할 계획이면 Windows 서비스나 작업 스케줄러처럼 죽으면 자동으로 재시작하는 방식으로 옮기는 걸 고려한다.
- **`.bat` 파일을 편집한 뒤에는 실제 실행으로 재검증할 것.** 코드 에디터/AI 도구로 저장하면 CRLF+BOM이 깨져 cmd.exe 파싱이 통째로 무너지는 사고가 실제로 있었다 — 상세 재발방지 절차는 `DEPLOY_CHECKLIST.md`의 "⚠️ .bat 파일을 다시 편집할 때 반드시 지킬 것" 참조.
- **배포 전 최종 확인은 `deploy-readiness` Agent**(`.claude/agents/deploy-readiness.md`)로 한다 — "배포해도 되는지 확인해줘"라고 요청하면 preflight 자동검증 + 수동 체크리스트 + 잔재 코드 + 포트 구성을 감사해서 PASS/FAIL/BLOCK으로 보고한다. 코드 수정이나 실제 배포는 하지 않는다.

## 7. 관련 문서

- `DEPLOY_CHECKLIST.md` — 배포 전 체크리스트, DB 쓰기 대상 판단 기준(개발/운영 어디에 데이터를 반영할지)
- `CLAUDE.md` §1·§3·§8 — 스택/실행법 요약, `.bat` 파일 인코딩 규칙, 배포 게이트 Agent 설명
- `../CLAUDE.md` §4 — PM Agent 관점에서의 Tester Agent·배포 게이트 Agent 위치
