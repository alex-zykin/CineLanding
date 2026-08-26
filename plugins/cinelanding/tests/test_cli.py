from __future__ import annotations

from contextlib import redirect_stdout
from io import StringIO
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch


SRC = Path(__file__).resolve().parents[1] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from cinelanding.cli import main
from cinelanding.errors import SubmissionUnknownError
from cinelanding.project import create_project, load_jobs


def create_ready_project(parent: Path) -> Path:
    root, _ = create_project(
        parent / "demo",
        name="Demo",
        source_url="https://example.com",
        locales=["en-US", "ru-RU"],
        default_locale="en-US",
        mode="redesign",
        motion_style="journey",
        audience="general",
    )
    (root / "inputs" / "scene-01-first.png").write_bytes(b"first")
    (root / "inputs" / "scene-01-last.png").write_bytes(b"last")
    return root


def run_cli(*arguments: str) -> tuple[int, dict]:
    output = StringIO()
    with redirect_stdout(output):
        exit_code = main(list(arguments))
    return exit_code, json.loads(output.getvalue())


class CliSubmissionTests(unittest.TestCase):
    def test_new_defaults_to_english_only(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "demo"
            exit_code, output = run_cli(
                "new",
                str(destination),
                "--name",
                "Demo",
                "--mode",
                "from-scratch",
            )

            self.assertEqual(exit_code, 0)
            project = output["project"]["project"]
            self.assertEqual(project["locales"], ["en-US"])
            self.assertEqual(project["default_locale"], "en-US")
            self.assertEqual(project["mode"], "from-scratch")
            self.assertEqual(project["motion_style"], "journey")

    def test_new_supports_russian_as_an_additional_locale(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "demo"
            exit_code, output = run_cli(
                "new",
                str(destination),
                "--name",
                "Demo",
                "--mode",
                "from-scratch",
                "--locale",
                "en-US",
                "--locale",
                "ru-RU",
                "--motion-style",
                "reveal",
            )

            self.assertEqual(exit_code, 0)
            project = output["project"]["project"]
            self.assertEqual(project["locales"], ["en-US", "ru-RU"])
            self.assertEqual(project["motion_style"], "reveal")

    def test_new_requires_mode(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaises(SystemExit) as raised:
                run_cli("new", str(Path(temporary) / "demo"), "--name", "Demo")

            self.assertEqual(raised.exception.code, 2)

    def test_redesign_requires_url(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            exit_code, output = run_cli(
                "new",
                str(Path(temporary) / "demo"),
                "--name",
                "Demo",
                "--mode",
                "redesign",
            )

            self.assertEqual(exit_code, 2)
            self.assertIn("redesign mode requires source_url", output["error"])

    def test_from_scratch_rejects_url(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            exit_code, output = run_cli(
                "new",
                str(Path(temporary) / "demo"),
                "--name",
                "Demo",
                "--mode",
                "from-scratch",
                "--url",
                "https://example.com",
            )

            self.assertEqual(exit_code, 2)
            self.assertIn("from-scratch mode does not accept source_url", output["error"])

    def test_mock_submission_is_reused_by_request_fingerprint(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_project(Path(temporary))
            arguments = (
                "submit",
                str(root),
                "--scene",
                "scene-01",
                "--provider",
                "mock",
            )

            first_code, first = run_cli(*arguments)
            second_code, second = run_cli(*arguments)

            self.assertEqual(first_code, 0)
            self.assertFalse(first["reused"])
            self.assertEqual(second_code, 0)
            self.assertTrue(second["reused"])
            self.assertEqual(second["job"]["task_id"], first["job"]["task_id"])
            jobs = load_jobs(root)
            self.assertEqual(len(jobs), 1)
            self.assertEqual(jobs[0].credits_consumed, 0.0)

    def test_changed_local_frame_creates_a_new_request_fingerprint(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_project(Path(temporary))
            arguments = (
                "submit",
                str(root),
                "--scene",
                "scene-01",
                "--provider",
                "mock",
            )

            first_code, first = run_cli(*arguments)
            (root / "inputs" / "scene-01-first.png").write_bytes(b"changed-first")
            second_code, second = run_cli(*arguments)

            self.assertEqual(first_code, 0)
            self.assertEqual(second_code, 0)
            self.assertFalse(first["reused"])
            self.assertFalse(second["reused"])
            self.assertNotEqual(first["job"]["task_id"], second["job"]["task_id"])
            self.assertEqual(len(load_jobs(root)), 2)

    def test_kie_submission_requires_explicit_spend_confirmation(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_project(Path(temporary))
            with patch("cinelanding.cli.provider_for") as provider_for:
                exit_code, output = run_cli(
                    "submit",
                    str(root),
                    "--scene",
                    "scene-01",
                    "--provider",
                    "kie",
                )

            self.assertEqual(exit_code, 2)
            self.assertEqual(output["type"], "ProjectError")
            self.assertIn("requires --confirm-spend", output["error"])
            provider_for.assert_not_called()
            self.assertEqual(load_jobs(root), [])

    def test_unknown_submission_is_recorded_and_not_automatically_repeated(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_project(Path(temporary))
            provider = Mock()
            provider.submit.side_effect = SubmissionUnknownError("response was lost")
            arguments = (
                "submit",
                str(root),
                "--scene",
                "scene-01",
                "--provider",
                "kie",
                "--confirm-spend",
            )

            with patch("cinelanding.cli.provider_for", return_value=provider):
                first_code, first = run_cli(*arguments)
                second_code, second = run_cli(*arguments)

            self.assertEqual(first_code, 2)
            self.assertEqual(first["type"], "SubmissionUnknownError")
            self.assertEqual(second_code, 0)
            self.assertTrue(second["reused"])
            self.assertEqual(second["job"]["state"], "submission_unknown")
            provider.submit.assert_called_once()
            jobs = load_jobs(root)
            self.assertEqual(len(jobs), 1)
            self.assertTrue(jobs[0].task_id.startswith("unknown-"))


if __name__ == "__main__":
    unittest.main()
