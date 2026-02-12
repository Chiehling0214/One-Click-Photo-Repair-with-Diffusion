# One-Click-Photo-Repair-with-Diffusion

## How to Setup for Backend

```bash
cd backend
```

```bash
python -m venv venv
```

```bash
venv\Scripts\activate
```

```bash
pip install -r requirements.txt
```

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

## How to Run Inpainting API Server

```bash
cd backend
```

```
run.bat
```

If you see
```bash
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```
it means the API is ready, you can repair photo.