@echo off
setlocal

cd /d "%~dp0"

if not exist "venv\Scripts\python.exe" (
    echo ERROR: venv not found. Please run setup.bat first.
    pause
    exit /b 1
)

echo Activating virtual environment...
call venv\Scripts\activate

echo Starting FastAPI server...
venv\Scripts\python.exe -m uvicorn app.main:app --reload

pause
endlocal