from __future__ import annotations

import json
import socket
from typing import Any, Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from ..errors import ProviderError, SubmissionUnknownError


class JsonHttpClient:
    def __init__(self, timeout: float = 60.0) -> None:
        self.timeout = timeout

    def request(
        self,
        method: str,
        url: str,
        payload: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        submission: bool = False,
    ) -> Dict[str, Any]:
        body = None
        request_headers = {"Accept": "application/json", **(headers or {})}
        if payload is not None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            request_headers.setdefault("Content-Type", "application/json")
        request = Request(url=url, data=body, method=method, headers=request_headers)
        try:
            with urlopen(request, timeout=self.timeout) as response:
                raw = response.read()
        except HTTPError as exc:
            detail = exc.read(4096).decode("utf-8", "replace").strip()
            raise ProviderError(f"provider HTTP {exc.code}: {detail or exc.reason}") from exc
        except (socket.timeout, TimeoutError) as exc:
            if submission:
                raise SubmissionUnknownError(
                    "generation submission timed out; it may have been accepted, so it was not retried"
                ) from exc
            raise ProviderError("provider request timed out") from exc
        except URLError as exc:
            if submission and isinstance(exc.reason, (socket.timeout, TimeoutError)):
                raise SubmissionUnknownError(
                    "generation submission timed out; it may have been accepted, so it was not retried"
                ) from exc
            raise ProviderError(f"provider connection failed: {exc.reason}") from exc
        try:
            value = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ProviderError("provider returned a non-JSON response") from exc
        if not isinstance(value, dict):
            raise ProviderError("provider returned an unexpected response shape")
        return value
