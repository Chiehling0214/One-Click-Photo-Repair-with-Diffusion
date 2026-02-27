import numpy as np
import cv2
from PIL import Image

def _pil_to_bgr(img: Image.Image) -> np.ndarray:
    rgb = np.array(img.convert("RGB"))
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

def _pil_to_mask255(mask: Image.Image) -> np.ndarray:
    m = np.array(mask.convert("L"))
    return (m > 10).astype(np.uint8) * 255

def _bgr_to_pil(bgr: np.ndarray) -> Image.Image:
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)

def _clean(mask255: np.ndarray) -> np.ndarray:
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    m = cv2.morphologyEx(mask255, cv2.MORPH_CLOSE, k, iterations=2)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN,  k, iterations=1)
    return m

def _dilate(mask255: np.ndarray, dilate_px: int) -> np.ndarray:
    if dilate_px <= 0:
        return mask255
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilate_px * 2 + 1, dilate_px * 2 + 1))
    return cv2.dilate(mask255, k, iterations=1)

def _estimate_bg_color_ring_mode(bgr: np.ndarray, mask255: np.ndarray, ring: int = 18) -> np.ndarray:
    """
    用 ring（mask 外圍一圈）去估背景色。
    改用「量化後的 mode」比 median 更不容易被 logo/雜色污染。
    """
    m = (mask255 > 0).astype(np.uint8)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ring * 2 + 1, ring * 2 + 1))
    dil = cv2.dilate(m, k, iterations=1)
    ring_mask = (dil - m).astype(bool)

    ys, xs = np.where(ring_mask)
    if len(xs) < 50:
        non = bgr[m == 0]
        if len(non) == 0:
            return np.array([128, 128, 128], dtype=np.uint8)
        return np.median(non, axis=0).astype(np.uint8)

    samples = bgr[ys, xs].astype(np.uint8)  # Nx3

    # 量化到 32 levels，做 mode
    q = (samples // 8).astype(np.uint8)  # 0..31
    key = (q[:, 0].astype(np.int32) << 10) | (q[:, 1].astype(np.int32) << 5) | q[:, 2].astype(np.int32)
    keys, counts = np.unique(key, return_counts=True)
    best = keys[np.argmax(counts)]
    b = ((best >> 10) & 31) * 8 + 4
    g = ((best >> 5) & 31) * 8 + 4
    r = (best & 31) * 8 + 4
    return np.array([b, g, r], dtype=np.uint8)

def _alpha_hard_inside_soft_edge(mask_orig255: np.ndarray, mask_dil255: np.ndarray, feather_px: int) -> np.ndarray:
    """
    alpha:
      - orig mask 內部：1.0（硬蓋，避免「只變淡」）
      - orig 外到 dilated：soft feather
      - dilated 外：0
    """
    m_orig = (mask_orig255 > 0).astype(np.float32)
    m_dil  = (mask_dil255 > 0).astype(np.float32)

    # feather 不要太大，不然小 mask 會整塊都變半透明
    feather_px = int(max(1, feather_px))
    # 這個 soft alpha 是針對 dilated mask 做 blur
    soft = cv2.GaussianBlur(m_dil, (0, 0), feather_px)
    soft = np.clip(soft, 0.0, 1.0)

    # orig mask 內部強制 1
    soft[m_orig > 0] = 1.0
    # dilated 外面強制 0（避免 blur 漏出去）
    soft[m_dil <= 0] = 0.0

    return soft[..., None]  # H,W,1

def ui_solid_fill(
    img_pil: Image.Image,
    mask_pil: Image.Image,
    *,
    dilate_px: int = 18,
    feather_px: int = 6,
    ring: int = 25,
) -> Image.Image:

    bgr = _pil_to_bgr(img_pil)
    mask_orig = _clean(_pil_to_mask255(mask_pil))
    mask_dil  = _dilate(mask_orig, dilate_px=dilate_px)

    bg = _estimate_bg_color_ring_mode(bgr, mask_dil, ring=ring)  # (3,)
    filled = bgr.copy()
    filled[mask_dil > 0] = bg

    alpha = _alpha_hard_inside_soft_edge(mask_orig, mask_dil, feather_px=feather_px)
    out = (filled.astype(np.float32) * alpha + bgr.astype(np.float32) * (1.0 - alpha)).astype(np.uint8)
    return _bgr_to_pil(out)

def ui_telea_fill(
    roi_img: Image.Image,
    roi_msk: Image.Image,
    *,
    radius: int = 5,
    dilate_px: int = 2,
    feather_px: int = 10,
):
    """
    Telea inpaint, then blend back ONLY on original mask with feathering.
    - radius: Telea inpaint radius (3~9 常用)
    - dilate_px: 擴張用來吃掉邊緣殘影 (1~3 推薦)
    - feather_px: 合成羽化，越大越柔 (8~16 推薦)
    """
    img_rgb = np.array(roi_img.convert("RGB"))
    m = np.array(roi_msk.convert("L"))

    # 原始 mask (只用來「最後合成」)
    mask0 = (m > 10).astype(np.uint8) * 255

    # 擴張後 mask (只用來「做 inpaint」)
    mask_inp = mask0.copy()
    if dilate_px and dilate_px > 0:
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilate_px*2+1, dilate_px*2+1))
        mask_inp = cv2.dilate(mask_inp, k, iterations=1)

    # Telea inpaint (OpenCV 用 BGR)
    bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    out_bgr = cv2.inpaint(bgr, mask_inp, radius, cv2.INPAINT_TELEA)
    out_rgb = cv2.cvtColor(out_bgr, cv2.COLOR_BGR2RGB)

    # Feather alpha：只在「原始 mask」區域做融合（避免擴張造成吃太多）
    if feather_px and feather_px > 0:
        alpha = cv2.GaussianBlur(mask0.astype(np.float32) / 255.0,
                                 (feather_px*2+1, feather_px*2+1), 0)
        alpha = np.clip(alpha, 0.0, 1.0)[..., None]  # H W 1
    else:
        alpha = (mask0.astype(np.float32) / 255.0)[..., None]

    blended = (out_rgb.astype(np.float32) * alpha + img_rgb.astype(np.float32) * (1 - alpha))
    blended = np.clip(blended, 0, 255).astype(np.uint8)

    return Image.fromarray(blended)