from fastapi import FastAPI
from app.routes.inpaint import router as inpaint_router
from app.services.diffusion import DiffusionService

app = FastAPI()

@app.on_event("startup")
def startup():
    app.state.diffusion_service = DiffusionService()

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(inpaint_router)