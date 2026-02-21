import base64
import traceback
from PIL import Image
import io
import uuid
import asyncio
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.concurrency import run_in_threadpool
from typing import Optional, Callable, Tuple
import torch
import time

#local
# from app.services.diffusion import diffusion_service
from app.utils.resize import fit_to_image, prepare_image_and_mask
from app.utils.restore import restore_to_origin
from app.utils.roi import compute_roi_box, paste_with_feather
from app.state.jobs import JOBS, JobState

router = APIRouter()

TARGET_SIZE = 512

@router.post("/inpaint")
async def inpaint(
    request: Request,
    image: UploadFile = File(...),
    mask: UploadFile = File(...),
    prompt: str = Form("clean background"),
    steps: int = Form(20, ge=1, le=50),
    guidance: float = Form(6, ge=1.0, le=10.0),
    num_outputs: int = Form(1, ge=1, le=5),
    negative_prompt: Optional[str] = Form(None),
    is_cartoon: Optional[bool] = Form(False),
    think_longer: Optional[bool] = Form(False),
    seed: Optional[int] = Form(None, ge=0)
):
    
    print(negative_prompt)
    if is_cartoon:
            prompt = f"{prompt}, cartoon style, cel-shading, 2d, vibrant colors"
            if negative_prompt:
                negative_prompt = f"{negative_prompt}, photo-realistic, 3d, dull colors"

    job_id = uuid.uuid4().hex
    JOBS[job_id] = JobState(status="queued", progress=0, message="queued")

    diffusion_service = request.app.state.diffusion_service

    image_bytes = await image.read()
    mask_bytes = await mask.read()
    if think_longer:
        steps = 40

    async def runner():
        try:
            await run_in_threadpool(
                _do_job,
                diffusion_service,
                job_id,
                image_bytes,
                mask_bytes,
                prompt,
                steps,
                guidance,
                num_outputs,
                negative_prompt,
                is_cartoon,
                seed,
            )
        except Exception as e:
            print(f"Error in job {job_id}: {e}")
            traceback.print_exc()
            job = JOBS.get(job_id)
            if job:
                job.status = "error"
                job.error = str(e)
                job.updated_at = time.time()

    asyncio.create_task(runner())
    return {"job_id": job_id}

    
def _do_job(
    diffusion_service: any,
    job_id: str,
    image_bytes: bytes,
    mask_bytes: bytes,
    prompt: str,
    steps: int,
    guidance: float,
    num_outputs: int,
    negative_prompt: Optional[str],
    is_cartoon: bool,
    seed: Optional[int],
):
    job = JOBS.get(job_id)
    if not job:
        return
    t0 = time.time()
    job.status = "starting"
    job.progress = 1
    job.updated_at = time.time()

    try:
        
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        msk = Image.open(io.BytesIO(mask_bytes)).convert("L")

        if msk.size == (640, 420) and img.size != (640, 420):
            job.message = "resizing mask"
            job.updated_at = time.time()
            msk = fit_to_image(msk, img.width, img.height, 640, 420)

        base_seed = seed if seed is not None else int(time.time())
        seeds = [base_seed + i for i in range(num_outputs)]

        results_b64 = []

        total_steps = steps * num_outputs
        job.total_steps = total_steps
        job.global_step = 0
        job.step = 0
        job.idx = 0

        for idx, s in enumerate(seeds):
            step_offset = idx * steps

            def make_on_progress(job_ref, idx_ref, total_steps):
                def _cb(global_step: int, step: int, pct: int):
                    job_ref.status = 'running'
                    job_ref.idx = idx_ref
                    job_ref.step = step
                    job_ref.global_step = global_step
                    job_ref.total_steps = total_steps
                    job_ref.progress = pct
                    job_ref.updated_at = time.time()
                return _cb

            on_progress = make_on_progress(job, idx+1, total_steps)

            job.status = 'queued'
            job.updated_at = time.time()


            out_img = inpaint_roi_full(
                img, msk, prompt, diffusion_service,
                steps, guidance, s, negative_prompt=negative_prompt,
                target=TARGET_SIZE, margin=192, feather_px=16,
                on_progress=on_progress, step_offset=step_offset, total_steps=total_steps
            )

            buf = io.BytesIO()
            out_img.save(buf, format="PNG")
            results_b64.append(base64.b64encode(buf.getvalue()).decode("utf-8"))

            job.updated_at = time.time()

        latency = round(time.time() - t0, 2)

        job.status = "done"
        job.progress = 100
        job.message = "done"
        job.images = results_b64
        job.seeds = seeds
        job.latency = latency
        job.updated_at = time.time()

    except torch.cuda.OutOfMemoryError:
        job.status = "error"
        job.error = "CUDA out of memory"
        job.message = "error"
        job.updated_at = time.time()
    except Exception as e:
        job.status = "error"
        job.error = str(e)
        job.message = "error"
        job.updated_at = time.time()

    
def inpaint_roi_full(image_rgb: Image.Image, mask_l: Image.Image, prompt: str, diffusion_service, steps: int = 20, guidance: float=7.5, seed: Optional[int]=None, negative_prompt: Optional[str]=None, target : int = 512, margin: int = 192, feather_px: int = 16, on_progress: Optional[Callable[[int, str], None]] = None, step_offset: int = 0, total_steps: int = 0):
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
        negative_prompt=negative_prompt,
        steps=steps, 
        guidance=guidance, 
        seed=seed, 
        target_size=target,
        on_progress=on_progress,
        step_offset=step_offset,
        total_steps=total_steps,
    )

    roi_out = restore_to_origin(roi_out_sq, meta)

    out = paste_with_feather(image_rgb, roi_out, roi_msk, box, feather_px=feather_px)

    return out


@router.get("/progress/{job_id}")
def get_progress(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "job not found")
    return {
        "job_id": job_id,
        "status": job.status,
        "pct": job.progress,
        "message": job.message,
        "error": job.error,
        "global_step": job.global_step,
        "total_steps": job.total_steps,
        "step": job.step,
        "idx": job.idx
    }

@router.get("/result/{job_id}")
def get_result(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "job not found")
    if job.status != "done":
        return {"status": job.status}
    return {
        "status": "done",
        "images": job.images,
        "seeds": job.seeds,
        "latency": job.latency,
    }