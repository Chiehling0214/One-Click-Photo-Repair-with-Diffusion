from dataclasses import dataclass, field
from typing import Optional, Dict, List
import time

@dataclass
class JobState:
    status: str = "queued"           # queued | running | done | error | starting
    progress: int = 0                # 0..100
    message: str = ""
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    images_b64: Optional[List[str]] = None
    error: Optional[str] = None
    global_step: int = 0
    total_steps: int = 0
    step: int = 0
    idx: int = 0

JOBS: Dict[str, JobState] = {}