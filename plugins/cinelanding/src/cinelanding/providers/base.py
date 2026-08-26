from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from ..models import GenerationJob, VideoRequest


class VideoProvider(ABC):
    name: str

    @abstractmethod
    def submit(self, request: VideoRequest) -> GenerationJob:
        raise NotImplementedError

    @abstractmethod
    def status(self, job: GenerationJob) -> GenerationJob:
        raise NotImplementedError

    def credits(self) -> Optional[float]:
        return None
