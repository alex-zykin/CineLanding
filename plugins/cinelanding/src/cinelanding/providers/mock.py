from __future__ import annotations

from ..models import GenerationJob, VideoRequest, utc_now
from .base import VideoProvider


class MockProvider(VideoProvider):
    name = "mock"

    def submit(self, request: VideoRequest) -> GenerationJob:
        fingerprint = request.fingerprint()
        return GenerationJob(
            task_id=f"mock-{fingerprint[:16]}",
            provider=self.name,
            model=request.model,
            state="success",
            scene_id=request.scene_id,
            fingerprint=fingerprint,
            result_urls=[f"mock://{request.scene_id}/{fingerprint[:12]}.mp4"],
            progress=100,
            credits_consumed=0.0,
        )

    def status(self, job: GenerationJob) -> GenerationJob:
        job.state = "success"
        job.progress = 100
        job.updated_at = utc_now()
        return job

    def credits(self) -> float:
        return 0.0
