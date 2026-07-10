@echo off
cd /d "%~dp0"

set ENVIRONMENT=production
set DATABASE_URL=sqlite:///E:/03. Job/00. Claude Code/au-test-system/backend/au_test_system_prod.db

if not exist "venv\Scripts\python.exe" (
    echo [오류] venv가 없다. start.bat을 먼저 한 번 실행해 개발 환경을 세팅하라.
    pause
    exit /b 1
)

venv\Scripts\python scripts\preflight_check.py
if errorlevel 1 (
    pause
    exit /b 1
)

echo.
echo  ===================================
echo   AU Inc. 시험평가팀 시스템 — 운영(PRODUCTION)
echo   http://localhost:8001
echo  ===================================
echo.

REM 운영 서버는 --reload 사용 금지 — 코드 변경이 재기동 없이 실시간 반영되면 안 됨
REM dev(8000)와 동시 기동을 위해 운영은 8001 사용 (프런트 운영 빌드는 frontend/.env.production의 VITE_API_URL로 이 포트를 가리킴)
venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8001
pause
