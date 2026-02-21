from fastapi import FastAPI
from app.routes.inpaint import router as inpaint_router
from app.services.diffusion import DiffusionService
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Latency", "X-Target-Size", "X-Steps", "X-Guidance", "X-Seed"],
)

@app.on_event("startup")
def startup():
    app.state.diffusion_service = DiffusionService()

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(inpaint_router)