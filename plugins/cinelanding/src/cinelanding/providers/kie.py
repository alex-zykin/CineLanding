from __future__ import annotations

import base64
from hashlib import sha256
import json
import mimetypes
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import quote

from .. import __version__
from ..errors import ConfigurationError, ProviderError
from ..models import GenerationJob, VideoRequest, is_http_url, utc_now
from .base import VideoProvider
from .http import JsonHttpClient


DEFAULT_MODEL = "bytedance/seedance-2-fast"
SUPPORTED_MODELS = {
    "bytedance/seedance-2-fast": {"resolutions": {"480p", "720p"}},
    "bytedance/seedance-2": {"resolutions": {"480p", "720p", "1080p", "4k"}},
}
MAX_BASE64_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


class KieProvider(VideoProvider):
    name = "kie"

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_base_url: Optional[str] = None,
        upload_base_url: Optional[str] = None,
        http: Optional[JsonHttpClient] = None,
    ) -> None:
        self.api_key = api_key or os.environ.get("KIE_API_KEY", "")
        if not self.api_key:
            raise ConfigurationError("KIE_API_KEY is not set")
        self.api_base_url = (api_base_url or os.environ.get("KIE_API_BASE_URL") or "https://api.kie.ai").rstrip("/")
        self.upload_base_url = (
            upload_base_url
            or os.environ.get("KIE_UPLOAD_BASE_URL")
            or "https://kieai.redpandaai.co"
        ).rstrip("/")
        self.http = http or JsonHttpClient()

    @property
    def headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": f"CineLanding/{__version__} (https://cinelanding.ru)",
        }

    def credits(self) -> float:
        payload = self.http.request(
            "GET",
            f"{self.api_base_url}/api/v1/chat/credit",
            headers=self.headers,
        )
        if payload.get("code") != 200 or not isinstance(payload.get("data"), (int, float)):
            raise ProviderError(f"KIE credits response was not successful: {payload.get('msg', 'unknown error')}")
        return float(payload["data"])

    def upload_image(self, path: Path) -> str:
        resolved = path.resolve()
        if not resolved.is_file():
            raise ProviderError(f"image does not exist: {resolved}")
        size = resolved.stat().st_size
        if size > MAX_BASE64_UPLOAD_BYTES:
            raise ProviderError(
                f"image is {size} bytes; local base64 uploads are limited to {MAX_BASE64_UPLOAD_BYTES} bytes"
            )
        mime_type, _ = mimetypes.guess_type(resolved.name)
        if mime_type not in ALLOWED_IMAGE_TYPES:
            raise ProviderError(f"unsupported image type '{mime_type or 'unknown'}' for {resolved.name}")
        contents = resolved.read_bytes()
        encoded = base64.b64encode(contents).decode("ascii")
        digest = sha256(contents).hexdigest()[:12]
        unique_name = f"{resolved.stem}-{digest}{resolved.suffix.lower()}"
        payload = self.http.request(
            "POST",
            f"{self.upload_base_url}/api/file-base64-upload",
            payload={
                "base64Data": f"data:{mime_type};base64,{encoded}",
                "uploadPath": "cinelanding/inputs",
                "fileName": unique_name,
            },
            headers=self.headers,
        )
        data = payload.get("data")
        if payload.get("code") != 200 or not isinstance(data, dict) or not data.get("downloadUrl"):
            raise ProviderError(f"KIE upload failed: {payload.get('msg', 'unknown error')}")
        return str(data["downloadUrl"])

    def _frame_url(self, reference: str) -> str:
        if is_http_url(reference):
            return reference
        return self.upload_image(Path(reference))

    def build_payload(self, request: VideoRequest) -> Dict[str, Any]:
        if request.model not in SUPPORTED_MODELS:
            raise ProviderError(f"unsupported KIE model '{request.model}'")
        if not 4 <= request.duration <= 15:
            raise ProviderError("Seedance duration must be between 4 and 15 seconds")
        if request.resolution not in SUPPORTED_MODELS[request.model]["resolutions"]:
            allowed = sorted(SUPPORTED_MODELS[request.model]["resolutions"])
            raise ProviderError(f"resolution for {request.model} must be one of {allowed}")
        prompt = request.prompt.strip()
        if request.negative_prompt.strip():
            prompt = f"{prompt}\nAvoid: {request.negative_prompt.strip()}."
        if not 3 <= len(prompt) <= 20_000:
            raise ProviderError("Seedance prompt must contain 3 to 20,000 characters")
        if request.callback_url and not request.callback_url.startswith("https://"):
            raise ProviderError("callback_url must use HTTPS")

        payload: Dict[str, Any] = {
            "model": request.model,
            "input": {
                "prompt": prompt,
                "first_frame_url": self._frame_url(request.first_frame),
                "last_frame_url": self._frame_url(request.last_frame),
                "generate_audio": False,
                "resolution": request.resolution,
                "aspect_ratio": request.aspect_ratio,
                "duration": request.duration,
            },
        }
        if request.callback_url:
            payload["callBackUrl"] = request.callback_url
        return payload

    def submit(self, request: VideoRequest) -> GenerationJob:
        payload = self.build_payload(request)
        response = self.http.request(
            "POST",
            f"{self.api_base_url}/api/v1/jobs/createTask",
            payload=payload,
            headers=self.headers,
            submission=True,
        )
        data = response.get("data")
        task_id = data.get("taskId") if isinstance(data, dict) else None
        if response.get("code") != 200 or not task_id:
            raise ProviderError(f"KIE rejected generation: {response.get('msg', 'unknown error')}")
        return GenerationJob(
            task_id=str(task_id),
            provider=self.name,
            model=request.model,
            state="waiting",
            scene_id=request.scene_id,
            fingerprint=request.fingerprint(),
        )

    def status(self, job: GenerationJob) -> GenerationJob:
        url = f"{self.api_base_url}/api/v1/jobs/recordInfo?taskId={quote(job.task_id, safe='')}"
        response = self.http.request("GET", url, headers=self.headers)
        data = response.get("data")
        if response.get("code") != 200 or not isinstance(data, dict):
            raise ProviderError(f"KIE task query failed: {response.get('msg', 'unknown error')}")

        result_urls: List[str] = []
        result_json = data.get("resultJson")
        if isinstance(result_json, str) and result_json:
            try:
                result_json = json.loads(result_json)
            except json.JSONDecodeError as exc:
                raise ProviderError("KIE returned invalid resultJson") from exc
        if isinstance(result_json, dict):
            result_urls = [str(item) for item in result_json.get("resultUrls", [])]

        job.state = str(data.get("state", job.state))
        job.model = str(data.get("model", job.model))
        job.result_urls = result_urls
        progress = data.get("progress")
        job.progress = int(progress) if isinstance(progress, (int, float)) else job.progress
        credits = data.get("creditsConsumed")
        job.credits_consumed = float(credits) if isinstance(credits, (int, float)) else job.credits_consumed
        job.error_code = str(data.get("failCode")) if data.get("failCode") else None
        job.error_message = str(data.get("failMsg")) if data.get("failMsg") else None
        job.updated_at = utc_now()
        return job
