import io

from PIL import Image
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse

router = APIRouter()


@router.post("/sam-mask")
async def sam_mask(
    request: Request,
    image: UploadFile = File(...),
    x: int = Form(...),
    y: int = Form(...),
    w: int = Form(...),
    h: int = Form(...),
):
    image_bytes = await image.read()

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    if w <= 0 or h <= 0:
        raise HTTPException(status_code=400, detail="Invalid box size")

    if x < 0 or y < 0 or x + w > img.width or y + h > img.height:
        raise HTTPException(status_code=400, detail="Box out of image bounds")

    sam_service = request.app.state.sam_service
    mask_img = sam_service.segment_box(
        image_rgb=img,
        box=(x, y, x + w, y + h),
    )

    if mask_img.mode != "L":
        mask_img = mask_img.convert("L")

    if mask_img.size != img.size:
        raise HTTPException(status_code=500, detail="SAM mask size mismatch")

    buf = io.BytesIO()
    mask_img.save(buf, format="PNG")
    buf.seek(0)

    return StreamingResponse(buf, media_type="image/png")