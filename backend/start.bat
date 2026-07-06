@echo off
cd /d "%~dp0"

REM venv가 없으면 Python 3.12로 생성 및 패키지 설치
if not exist "venv\Scripts\python.exe" (
    echo [AU] Python 3.12 가상환경 생성 중...
    py -3.12 -m venv venv
    if errorlevel 1 (
        echo [오류] Python 3.12가 설치되어 있지 않습니다.
        echo        https://www.python.org 에서 Python 3.12 를 설치 후 재실행하세요.
        pause
        exit /b 1
    )
    echo [AU] 패키지 설치 중 (최초 1회)...
    venv\Scripts\pip install -r requirements.txt
)

echo.
echo  ===================================
echo   AU Inc. 시험평가팀 시스템 백엔드
echo   http://localhost:8000
echo   http://localhost:8000/docs  (Swagger)
echo  ===================================
echo.

venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
