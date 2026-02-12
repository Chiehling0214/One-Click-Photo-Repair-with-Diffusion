from PIL import Image
import io
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import Optional
import torch
import time

#local
# from app.services.diffusion import diffusion_service
from app.utils.resize import fit_to_image, prepare_image_and_mask
from app.utils.restore import restore_to_origin
from app.utils.roi import compute_roi_box, paste_with_feather

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

        if msk.size == (640, 420) and img.size != (640, 420):
            msk = fit_to_image(msk, img.width, img.height, 640, 420)
        # save mask to local
        img.save("debug_image.png")
        msk.save("debug_mask.png")

        result_final = inpaint_roi_full(img, msk, prompt, diffusion_service, steps, guidance, seed, target=TARGET_SIZE, margin=192, feather_px=16)

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

    
def inpaint_roi_full(image_rgb: Image.Image, mask_l: Image.Image, prompt: str, diffusion_service, steps: int = 20, guidance: float=7.5, seed: Optional[int]=None, target : int = 512, margin: int = 192, feather_px: int = 16):
    box = compute_roi_box(mask_l, margin=margin)

    if box is None:
        return image_rgb
    
    x0, y0, x1, y1 = box

    roi_img = image_rgb.crop(box)
    roi_msk = mask_l.crop(box)

    roi_img_prepared, roi_msk_prepared, meta = prepare_image_and_mask(roi_img, roi_msk, max_side=768, target=target)

    roi_out_sq = diffusion_service.inpaint(
        image=roi_img_prepared, 
        mask=roi_msk_prepared, 
        prompt=prompt, 
        steps=steps, 
        guidance=guidance, 
        seed=seed, 
        target_size=target
    )

    roi_out = restore_to_origin(roi_out_sq, meta)

    out = paste_with_feather(image_rgb, roi_out, roi_msk, box, feather_px=feather_px)

    return out