from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.inpaint import router as inpaint_router
from app.routes.sam import router as sam_router
from app.services.diffusion import DiffusionService
from app.services.sam import SamService
import logging
import warnings

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning, module=r"mobile_sam\..*")
warnings.filterwarnings("ignore", category=UserWarning, module=r"timm\..*")

logging.getLogger("huggingface_hub").setLevel(logging.ERROR)
logging.getLogger("transformers").setLevel(logging.ERROR)
logging.getLogger("diffusers").setLevel(logging.ERROR)


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
    app.state.sam_service = SamService()

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(inpaint_router)
app.include_router(sam_router)