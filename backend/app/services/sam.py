import os
import threading
from abc import ABC, abstractmethod
from typing import Literal, Tuple

import cv2
import numpy as np
import torch
from PIL import Image


BoxXYXY = Tuple[int, int, int, int]
SamBackendName = Literal["mobilesam", "segment_anything", "sam2"]


class BaseSamBackend(ABC):
    @abstractmethod
    def segment_box(self, image_rgb: Image.Image, box: BoxXYXY) -> Image.Image:
        """
        Return:
            PIL.Image(mode='L'), same size as image_rgb
            255 = masked region, 0 = background
        """
        raise NotImplementedError


class MobileSamBackend(BaseSamBackend):
    def __init__(
        self,
        checkpoint_path: str,
        model_type: str = "vit_t",
        device: str | None = None,
    ):
        from mobile_sam import SamPredictor, sam_model_registry

        if not os.path.exists(checkpoint_path):
            raise FileNotFoundError(
                f"MobileSAM checkpoint not found: {checkpoint_path}"
            )

        file_size = os.path.getsize(checkpoint_path)
        if file_size == 0:
            raise RuntimeError(
                f"MobileSAM checkpoint is empty: {checkpoint_path}"
            )

        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model_type = model_type
        self.checkpoint_path = checkpoint_path

        # mask dilation params
        # kernel size should be odd: 1, 3, 5, 7, 9...
        self.dilate_kernel_size = int(os.getenv("SAM_DILATE_KERNEL", "9"))
        self.dilate_iterations = int(os.getenv("SAM_DILATE_ITERATIONS", "1"))

        if self.dilate_kernel_size < 1:
            self.dilate_kernel_size = 1
        if self.dilate_kernel_size % 2 == 0:
            self.dilate_kernel_size += 1
        if self.dilate_iterations < 0:
            self.dilate_iterations = 0

        model = sam_model_registry[self.model_type](checkpoint=self.checkpoint_path)
        model.to(device=self.device)
        model.eval()

        self.predictor = SamPredictor(model)
        self._lock = threading.Lock()

    def _expand_mask(self, mask: np.ndarray) -> np.ndarray:
        if self.dilate_iterations == 0 or self.dilate_kernel_size == 1:
            return mask

        kernel = cv2.getStructuringElement(
            cv2.MORPH_ELLIPSE,
            (self.dilate_kernel_size, self.dilate_kernel_size),
        )
        return cv2.dilate(mask, kernel, iterations=self.dilate_iterations)

    def segment_box(self, image_rgb: Image.Image, box: BoxXYXY) -> Image.Image:
        x0, y0, x1, y1 = box

        rgb_np = np.array(image_rgb, dtype=np.uint8)
        box_np = np.array([x0, y0, x1, y1], dtype=np.float32)

        with self._lock:
            self.predictor.set_image(rgb_np)
            masks, scores, _ = self.predictor.predict(
                point_coords=None,
                point_labels=None,
                box=box_np,
                multimask_output=True,
            )

        if masks is None or len(masks) == 0:
            raise RuntimeError("MobileSAM returned no masks")

        best_idx = int(np.argmax(scores))
        best_mask = masks[best_idx].astype(np.uint8) * 255

        # Expand mask slightly beyond the object boundary
        best_mask = self._expand_mask(best_mask)

        return Image.fromarray(best_mask, mode="L")


class SegmentAnythingBackend(BaseSamBackend):
    def __init__(
        self,
        checkpoint_path: str,
        model_type: str = "vit_b",
        device: str | None = None,
    ):
        raise NotImplementedError(
            "SegmentAnythingBackend not implemented yet. "
            "Keep the same segment_box(image_rgb, box) interface."
        )

    def segment_box(self, image_rgb: Image.Image, box: BoxXYXY) -> Image.Image:
        raise NotImplementedError


class Sam2Backend(BaseSamBackend):
    def __init__(
        self,
        checkpoint_path: str,
        config_path: str | None = None,
        device: str | None = None,
    ):
        raise NotImplementedError(
            "Sam2Backend not implemented yet. "
            "Keep the same segment_box(image_rgb, box) interface."
        )

    def segment_box(self, image_rgb: Image.Image, box: BoxXYXY) -> Image.Image:
        raise NotImplementedError


class SamService:
    """
    Thin wrapper so routes never care which backend is being used.
    Switch backend later by changing env vars only.
    """

    def __init__(self):
        backend_name = os.getenv("SAM_BACKEND", "mobilesam").strip().lower()
        self.backend_name: SamBackendName = backend_name  # type: ignore[assignment]

        if self.backend_name == "mobilesam":
            checkpoint_path = os.getenv(
                "MOBILE_SAM_CHECKPOINT",
                os.path.join("weights", "mobile_sam.pt"),
            )
            model_type = os.getenv("MOBILE_SAM_MODEL_TYPE", "vit_t")
            device = os.getenv("SAM_DEVICE") or None

            self.backend: BaseSamBackend = MobileSamBackend(
                checkpoint_path=checkpoint_path,
                model_type=model_type,
                device=device,
            )

        elif self.backend_name == "segment_anything":
            checkpoint_path = os.getenv(
                "SAM_CHECKPOINT",
                os.path.join("weights", "sam_vit_b_01ec64.pth"),
            )
            model_type = os.getenv("SAM_MODEL_TYPE", "vit_b")
            device = os.getenv("SAM_DEVICE") or None

            self.backend = SegmentAnythingBackend(
                checkpoint_path=checkpoint_path,
                model_type=model_type,
                device=device,
            )

        elif self.backend_name == "sam2":
            checkpoint_path = os.getenv(
                "SAM2_CHECKPOINT",
                os.path.join("weights", "sam2.pt"),
            )
            config_path = os.getenv("SAM2_CONFIG")
            device = os.getenv("SAM_DEVICE") or None

            self.backend = Sam2Backend(
                checkpoint_path=checkpoint_path,
                config_path=config_path,
                device=device,
            )

        else:
            raise ValueError(f"Unsupported SAM_BACKEND: {backend_name}")

    def segment_box(self, image_rgb: Image.Image, box: BoxXYXY) -> Image.Image:
        return self.backend.segment_box(image_rgb=image_rgb, box=box)