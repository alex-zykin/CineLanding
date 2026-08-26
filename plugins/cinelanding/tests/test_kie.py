from __future__ import annotations

from pathlib import Path
import sys
import unittest


SRC = Path(__file__).resolve().parents[1] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from cinelanding.errors import ProviderError, SubmissionUnknownError
from cinelanding.models import GenerationJob, VideoRequest
from cinelanding.providers.kie import KieProvider


class FakeHttpClient:
    def __init__(self, *responses):
        self.responses = list(responses)
        self.calls = []

    def request(self, method, url, payload=None, headers=None, submission=False):
        self.calls.append(
            {
                "method": method,
                "url": url,
                "payload": payload,
                "headers": headers,
                "submission": submission,
            }
        )
        if not self.responses:
            raise AssertionError("unexpected HTTP request")
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


def request(**overrides) -> VideoRequest:
    values = {
        "scene_id": "scene-01",
        "prompt": "A smooth cinematic transition between two product frames.",
        "first_frame": "https://cdn.example.com/first.png",
        "last_frame": "https://cdn.example.com/last.png",
        "duration": 5,
        "resolution": "720p",
        "aspect_ratio": "16:9",
        "negative_prompt": "flicker",
        "model": "bytedance/seedance-2-fast",
    }
    values.update(overrides)
    return VideoRequest(**values)


def job(**overrides) -> GenerationJob:
    values = {
        "task_id": "task/with space",
        "provider": "kie",
        "model": "bytedance/seedance-2-fast",
        "state": "generating",
        "scene_id": "scene-01",
        "fingerprint": "abc123",
    }
    values.update(overrides)
    return GenerationJob(**values)


class KieProviderTests(unittest.TestCase):
    def test_payload_uses_first_and_last_frames_without_audio(self) -> None:
        provider = KieProvider(api_key="test-key", http=FakeHttpClient())

        payload = provider.build_payload(
            request(callback_url="https://example.com/hooks/kie")
        )

        self.assertEqual(payload["model"], "bytedance/seedance-2-fast")
        self.assertEqual(payload["callBackUrl"], "https://example.com/hooks/kie")
        self.assertEqual(
            payload["input"],
            {
                "prompt": (
                    "A smooth cinematic transition between two product frames.\n"
                    "Avoid: flicker."
                ),
                "first_frame_url": "https://cdn.example.com/first.png",
                "last_frame_url": "https://cdn.example.com/last.png",
                "generate_audio": False,
                "resolution": "720p",
                "aspect_ratio": "16:9",
                "duration": 5,
            },
        )
        self.assertNotIn("return_last_frame", payload["input"])

    def test_submit_makes_one_non_retrying_paid_request(self) -> None:
        http = FakeHttpClient(SubmissionUnknownError("timed out after send"))
        provider = KieProvider(api_key="test-key", http=http)

        with self.assertRaises(SubmissionUnknownError):
            provider.submit(request())

        self.assertEqual(len(http.calls), 1)
        call = http.calls[0]
        self.assertEqual(call["method"], "POST")
        self.assertTrue(call["url"].endswith("/api/v1/jobs/createTask"))
        self.assertTrue(call["submission"])

    def test_success_status_parses_result_json_and_metrics(self) -> None:
        http = FakeHttpClient(
            {
                "code": 200,
                "data": {
                    "state": "success",
                    "model": "bytedance/seedance-2",
                    "resultJson": '{"resultUrls":["https://cdn.example.com/result.mp4"]}',
                    "progress": 100,
                    "creditsConsumed": 42,
                },
            }
        )
        provider = KieProvider(api_key="test-key", http=http)

        updated = provider.status(job())

        self.assertEqual(updated.state, "success")
        self.assertEqual(updated.model, "bytedance/seedance-2")
        self.assertEqual(updated.result_urls, ["https://cdn.example.com/result.mp4"])
        self.assertEqual(updated.progress, 100)
        self.assertEqual(updated.credits_consumed, 42.0)
        self.assertIsNone(updated.error_code)
        self.assertIsNone(updated.error_message)
        self.assertIn("taskId=task%2Fwith%20space", http.calls[0]["url"])

    def test_failure_status_preserves_provider_error_details(self) -> None:
        http = FakeHttpClient(
            {
                "code": 200,
                "data": {
                    "state": "fail",
                    "failCode": "CONTENT_POLICY",
                    "failMsg": "Rejected input",
                },
            }
        )
        provider = KieProvider(api_key="test-key", http=http)

        updated = provider.status(job())

        self.assertEqual(updated.state, "fail")
        self.assertEqual(updated.error_code, "CONTENT_POLICY")
        self.assertEqual(updated.error_message, "Rejected input")
        self.assertEqual(updated.result_urls, [])

    def test_invalid_result_json_is_rejected(self) -> None:
        provider = KieProvider(
            api_key="test-key",
            http=FakeHttpClient(
                {"code": 200, "data": {"state": "success", "resultJson": "not-json"}}
            ),
        )

        with self.assertRaisesRegex(ProviderError, "invalid resultJson"):
            provider.status(job())

    def test_payload_rejects_insecure_callback_url(self) -> None:
        provider = KieProvider(api_key="test-key", http=FakeHttpClient())

        with self.assertRaisesRegex(ProviderError, "callback_url must use HTTPS"):
            provider.build_payload(request(callback_url="http://example.com/hook"))


if __name__ == "__main__":
    unittest.main()
