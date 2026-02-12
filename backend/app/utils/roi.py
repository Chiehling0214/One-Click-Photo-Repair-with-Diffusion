import numpy as np
from PIL import Image, ImageFilter

def compute_roi_box(mask: Image.Image, margin: int = 192):
    m = np.array(mask)
    ys, xs = np.where(m > 127)
    if len(xs) == 0 or len(ys) == 0:
        return None
    
    x0, x1 = xs.min(), xs.max() + 1
    y0, y1 = ys.min(), ys.max() + 1

    W, H = mask.size
    x0 = max(x0 - margin, 0)
    y0 = max(y0 - margin, 0)    
    x1 = min(x1 + margin, W)
    y1 = min(y1 + margin, H)

    return (x0, y0, x1, y1)

def paste_with_feather(base_rgb: Image.Image, roi_out_rgb: Image.Image, roi_mask: Image.Image, box, feather_px: int = 16):
    """
    base_rgb: 原圖 RGB
    roi_out_rgb: ROI 修補後 RGB（尺寸=ROI）
    roi_mask_l: ROI mask L（白色=修補）
    box: (x0,y0,x1,y1)
    """

    x0, y0, x1, y1 = box
    base = base_rgb.copy()

    alpha = roi_mask
    if feather_px > 0:
        alpha = alpha.filter(ImageFilter.GaussianBlur(radius=feather_px))

    base_roi = base.crop((x0, y0, x1, y1))

    # output = alpha*roi_out + (1-alpha)*base_roi
    blended_roi = Image.composite(roi_out_rgb, base_roi, alpha)

    base.paste(blended_roi, (x0, y0))

    return base