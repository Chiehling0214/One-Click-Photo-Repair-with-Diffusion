import torch
from diffusers import StableDiffusionInpaintPipeline

class DiffusionService:
    def __init__(self):
        self.pipe = StableDiffusionInpaintPipeline.from_pretrained(
            "runwayml/stable-diffusion-inpainting",
            # revision="fp16",
            torch_dtype=torch.float16,
        )
        self.pipe.to("cuda")
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

