from PIL import Image
def restore_to_origin(out: Image.Image, meta: dict) -> Image.Image:
    
    target = meta["target"]
    side = meta["side"]

    if out.size != (side, side):
        out = out.resize((side, side), resample=Image.LANCZOS)
    
    # remove padding
    left = meta["pad_left"]
    top = meta["pad_top"]
    right = left + meta["scaled_w"]
    bottom = top + meta["scaled_h"]

    out = out.crop((left, top, right, bottom))


    # restore
    orig_w, orig_h = meta["orig_w"], meta["orig_h"]
    if out.size != (orig_w, orig_h):
        out = out.resize((orig_w, orig_h), resample=Image.LANCZOS)

    return out
