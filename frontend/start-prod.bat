@echo off
cd /d "%~dp0"

echo.
echo  ===================================
echo   AU Inc. 시험평가팀 시스템 — 프런트엔드 운영(PRODUCTION)
echo   http://localhost:4173
echo  ===================================
echo.

call npm run build
if errorlevel 1 (
    echo [오류] 빌드 실패
    pause
    exit /b 1
)

call npm run preview -- --port 4173
pause
