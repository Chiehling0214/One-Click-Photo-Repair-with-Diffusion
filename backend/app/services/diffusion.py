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
        )

        self.pipe.to(self.device)

        if self.device == "cuda":
            self.pipe.enable_attention_slicing()
    
    def inpaint(self, image, mask, prompt, steps=20, guidance=7.5, seed=None, target_size=512):
        if seed is not None:
            generator = torch.manual_seed(seed)
        else:
            generator = None
        
        result = self.pipe(
            prompt=prompt,
            image=image,
            mask_image=mask,
            num_inference_steps=steps,
            guidance_scale=guidance,
            generator=generator,
            height=target_size,
            width=target_size
        ).images[0]

        return result

