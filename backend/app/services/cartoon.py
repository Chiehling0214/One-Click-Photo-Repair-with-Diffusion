# app/services/cartoon.py
from dataclasses import dataclass
import numpy as np
import cv2
from PIL import Image

@dataclass
class CartoonConfig:
    method: str = "telea"   # telea | ns
    radius: int = 5         # 3~9 常用

def _pil_to_bgr(img: Image.Image):
    arr = np.array(img.convert("RGB"))
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)

def _pil_mask_to_cv(mask_l: Image.Image):
    m = np.array(mask_l.convert("L"))
    # 你的 mask: 白=要修補, 黑=保留
    m = (m > 10).astype(np.uint8) * 255
    return m

def opencv_inpaint_fill(image_rgb: Image.Image, mask_l: Image.Image, cfg: CartoonConfig) -> Image.Image:
    bgr = _pil_to_bgr(image_rgb)
    m = _pil_mask_to_cv(mask_l)

    flag = cv2.INPAINT_TELEA if cfg.method.lower() == "telea" else cv2.INPAINT_NS
    out = cv2.inpaint(bgr, m, cfg.radius, flag)

    rgb = cv2.cvtColor(out, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)

def hybrid_prepare_image(image_rgb: Image.Image, mask_l: Image.Image, cfg: CartoonConfig) -> Image.Image:
    # 先補洞後，讓 diffusion 不會看到黑洞
    return opencv_inpaint_fill(image_rgb, mask_l, cfg)