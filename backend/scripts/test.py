import os
import time
import requests

API_URL = "http://127.0.0.1:8000/inpaint"

IMAGE_PATH = os.path.join("inputs", "test.jpg")
MASK_PATH  = os.path.join("inputs", "mask.png")

OUT_DIR = "outputs"
os.makedirs(OUT_DIR, exist_ok=True)

def run_once(seed: int, steps: int = 20, guidance: float = 7.5, prompt: str = "clean background"):
    with open(IMAGE_PATH, "rb") as f_img, open(MASK_PATH, "rb") as f_mask:
        files = {
            "image": ("test.jpg", f_img, "image/jpeg"),
            "mask": ("mask.png", f_mask, "image/png"),
        }
        data = {
            "prompt": prompt,
            "steps": str(steps),
            "guidance": str(guidance),
            "seed": str(seed),
        }

        t0 = time.time()
        resp = requests.post(API_URL, files=files, data=data, timeout=600)
        dt = time.time() - t0

    if resp.status_code != 200:
        print(f"[FAIL] seed={seed} status={resp.status_code} body={resp.text[:300]}")
        return False

    out_path = os.path.join(OUT_DIR, f"result_seed{seed}_s{steps}_g{guidance}.png")
    with open(out_path, "wb") as f:
        f.write(resp.content)

    print(f"[OK] seed={seed} saved={out_path} time={dt:.2f}s")
    return True

if __name__ == "__main__":
    seeds = [i for i in range(1, 6)]

    print(f"Testing API: {API_URL}")
    print(f"Image: {IMAGE_PATH}")
    print(f"Mask : {MASK_PATH}")

    all_ok = True
    for s in seeds:
        ok = run_once(seed=s)
        all_ok = all_ok and ok

    if all_ok:
        print("Smoke test passed (all seeds OK).")
    else:
        print("Smoke test failed (some seeds failed).")
