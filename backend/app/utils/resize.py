from PIL import Image, ImageOps


def prepare_image_and_mask(image, mask, max_side=768, target=512):

    image = image.convert("RGB")
    mask = mask.convert("L")

    w, h = image.size
    scale = min(max_side / max(w, h), 1.0)
    new_w, new_h = max(1, int(round(w * scale))), max(1, int(round(h * scale)))

    if (new_w, new_h) != (w, h):
        image = image.resize((new_w, new_h), resample=Image.LANCZOS)
        mask = mask.resize((new_w, new_h), resample=Image.NEAREST)
    
    # pad to square
    side = max(new_w, new_h)
    pad_left = (side - new_w) // 2
    pad_right = side - new_w - pad_left
    pad_top = (side - new_h) // 2
    pad_bottom = side - new_h - pad_top

    image = ImageOps.expand(image, border=(pad_left, pad_top, pad_right, pad_bottom), fill=0)
    mask = ImageOps.expand(mask, border=(pad_left, pad_top, pad_right, pad_bottom), fill=0)

    # resize to target
    if side != target:
        image = image.resize((target, target), resample=Image.LANCZOS)
        mask = mask.resize((target, target), resample=Image.NEAREST)

    # binarize mask, make sure 0 or 255
    mask = mask.point(lambda p: 255 if p > 128 else 0)

    metadata = {
        "orig_w": w,
        "orig_h": h,
        "pad_left": pad_left,
        "pad_top": pad_top,
        "pad_right": pad_right,
        "pad_bottom": pad_bottom,
        "scaled_w": new_w,
        "scaled_h": new_h,
        "side": side,
        "target": target
    }

    return image, mask, metadata
