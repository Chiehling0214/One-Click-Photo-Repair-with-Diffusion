import torch
from diffusers import StableDiffusionInpaintPipeline

class DiffusionService:
    def __init__(self):

        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        print("Using device:", self.device)

        # CUDA 用 fp16，CPU 一定要用 float32
        dtype = torch.float16 if self.device == "cuda" else torch.float32

        self.pipe = StableDiffusionInpaintPipeline.from_pretrained(
            "runwayml/stable-diffusion-inpainting",
            torch_dtype=dtype,
            safety_checker=None,
        )

        self.pipe.to(self.device)

        if self.device == "cuda":
            self.pipe.enable_attention_slicing()
    
    def inpaint(
        self, 
        image, 
        mask, 
        prompt,
        negative_prompt=None, 
        steps=20, 
        guidance=7.5, 
        seed=None, 
        target_size=512, 
        *,
        on_progress=None,
        step_offset=0,
        total_steps=None
        ):
        if seed is not None:
            generator = torch.manual_seed(seed)
        else:
            generator = None
        
        def on_step_end(pipe, step: int, timestep: int, callback_kwargs):
            if not on_progress:
                return
            
            step_in_img = step + 1
            global_step = step_offset + step_in_img

            pct = int(global_step / total_steps * 100)
            pct = max(0, min(100, pct))
            
            on_progress(global_step, step_in_img, pct)
            return callback_kwargs
                
        result = self.pipe(
            prompt=prompt,
            negative_prompt=negative_prompt if negative_prompt else None,
            image=image,
            mask_image=mask,
            num_inference_steps=steps,
            guidance_scale=guidance,
            generator=generator,
            height=target_size,
            width=target_size,
            callback_on_step_end=on_step_end,
        ).images[0]

        return result

