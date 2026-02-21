@echo off
echo ==============================
echo Setting up backend...
echo ==============================


REM 1. Create virtual environment if not exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM 2. Activate venv
call venv\Scripts\activate

REM 3. Upgrade pip
python -m pip install --upgrade pip

REM 4. Install CUDA Torch
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

REM 5. Install requirements
pip install -r requirements.txt


echo ==============================
echo Backend setup complete!
echo Run backend with:
echo     run.bat
echo ==============================

pause
