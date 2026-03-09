@echo off
setlocal

echo ==============================
echo Setting up backend...
echo ==============================
echo.

REM Move to the folder where this bat file is located
cd /d "%~dp0"

REM 1. Check python exists
where python >nul 2>nul
if errorlevel 1 (
    echo ERROR: Python was not found on PATH.
    echo Please install Python and make sure "python" works in cmd.
    pause
    exit /b 1
)

echo Using Python:
python --version
echo.

REM 2. Create virtual environment if not exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment.
        pause
        exit /b 1
    )
) else (
    echo Existing venv found. Reusing it.
)
echo.

REM 3. Activate venv
call venv\Scripts\activate
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment.
    pause
    exit /b 1
)

echo Active Python:
python --version
where python
echo.

REM 4. Upgrade pip tooling
python -m pip install --upgrade pip setuptools wheel
if errorlevel 1 (
    echo ERROR: Failed to upgrade pip/setuptools/wheel.
    pause
    exit /b 1
)
echo.

REM 5. Install CUDA Torch
echo Installing torch / torchvision / torchaudio...
python -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
if errorlevel 1 (
    echo ERROR: Failed to install torch packages.
    pause
    exit /b 1
)
echo.

REM 6. Install requirements
echo Installing requirements...
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install requirements.txt
    pause
    exit /b 1
)
echo.

REM 7. Quick sanity checks
echo Running sanity checks...
python -c "import sys; print(sys.executable)"
if errorlevel 1 (
    echo ERROR: Python sanity check failed.
    pause
    exit /b 1
)

python -c "import cv2; print('cv2 =', cv2.__version__)"
if errorlevel 1 (
    echo ERROR: OpenCV import failed.
    pause
    exit /b 1
)

python -c "import torch; print('torch =', torch.__version__); print('cuda_available =', torch.cuda.is_available())"
if errorlevel 1 (
    echo ERROR: Torch import failed.
    pause
    exit /b 1
)

echo.
echo ==============================
echo Backend setup complete!
echo Run backend with:
echo     run.bat
echo ==============================

pause
endlocal