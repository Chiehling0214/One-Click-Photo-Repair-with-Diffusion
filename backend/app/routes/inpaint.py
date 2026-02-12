from PIL import Image
import io
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import Optional
import torch
import time

#local
# from app.services.diffusion import diffusion_service
from app.utils.resize import prepare_image_and_mask
from app.utils.restore import restore_to_origin

router = APIRouter()

TARGET_SIZE = 512

@router.post("/inpaint")
async def inpaint(
    request: Request,
    image: UploadFile = File(...),
    mask: UploadFile = File(...),
    prompt: str = Form("clean background"),
    steps: int = Form(20, ge=1, le=30),
    guidance: float = Form(7.5, ge=1.0, le=10.0),
    seed: Optional[int] = Form(None, ge=0)
):
    try:
        t0 = time.time()
        diffusion_service = request.app.state.diffusion_service
        image_bytes = await image.read()
        mask_bytes = await mask.read()

        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        msk = Image.open(io.BytesIO(mask_bytes)).convert("L")

    
        img, msk, meta = prepare_image_and_mask(img, msk, max_side=768, target=TARGET_SIZE)

        result = diffusion_service.inpaint(img, msk, prompt, steps, guidance, seed, TARGET_SIZE)

        result_final = restore_to_origin(result, meta)

        latency = time.time() - t0

        buf = io.BytesIO()
        result_final.save(buf, format="PNG")
        buf.seek(0)

        response = StreamingResponse(buf, media_type="image/png")
        response.headers["X-Target-Size"] =  str(TARGET_SIZE)
        response.headers["X-Steps"] = str(steps)
        response.headers["X-Guidance"] = str(guidance)
        response.headers["X-Seed"] = "" if seed is None else str(seed)
        response.headers["X-Latency"] = f"{latency:.2f}"

        return response
    except torch.cuda.OutOfMemoryError:
        raise HTTPException(status_code=507, detail="CUDA out of memory. Try reducing the image size or steps.")

    