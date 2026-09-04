from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch


SRC = Path(__file__).resolve().parents[1] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from cinelanding.errors import ProjectError
from cinelanding.media import create_mock_video
from cinelanding.project import create_project


def create_anchor_project(parent: Path) -> Path:
    root, _ = create_project(
        parent / "demo",
        name="Demo",
        source_url=None,
        locales=["en-US"],
        default_locale="en-US",
        mode="from-scratch",
        motion_style="journey",
        audience="general",
    )
    (root / "inputs" / "scene-01-first.png").write_bytes(b"first-anchor")
    (root / "inputs" / "scene-01-last.png").write_bytes(b"last-anchor")
    return root


class MockVideoTests(unittest.TestCase):
    def test_mock_video_builds_a_crossfade_from_the_selected_scene_anchors(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_anchor_project(Path(temporary))
            with (
                patch("cinelanding.media.tool_path", return_value="ffmpeg"),
                patch("cinelanding.media._run") as run,
            ):
                output = create_mock_video(root, "scene-01", duration=1.0)

            command = run.call_args.args[0]
            first = str((root / "inputs" / "scene-01-first.png").resolve())
            last = str((root / "inputs" / "scene-01-last.png").resolve())
            self.assertIn(first, command)
            self.assertIn(last, command)
            self.assertEqual(command.count("-i"), 2)
            self.assertNotIn("lavfi", command)
            self.assertFalse(any("testsrc" in part for part in command))
            filter_graph = command[command.index("-filter_complex") + 1]
            self.assertIn("xfade=transition=fade", filter_graph)
            self.assertIn("scale=1280:720:force_original_aspect_ratio=decrease", filter_graph)
            self.assertEqual(output, root / "artifacts" / "scene-01" / "mock.mp4")

    def test_mock_video_uses_the_actual_shared_anchor_for_a_connected_scene(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_anchor_project(Path(temporary))
            manifest_path = root / "cinelanding.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["scenes"].append(
                {
                    "id": "scene-02",
                    "title": "Second scene",
                    "prompt": "Continue the product story.",
                    "first_frame": "inputs/scene-01-last.png",
                    "last_frame": "inputs/scene-02-last.png",
                    "duration": 5,
                    "resolution": "720p",
                    "aspect_ratio": "9:16",
                    "negative_prompt": "flicker",
                    "copy": {"en-US": {"headline": "Second scene"}},
                }
            )
            manifest_path.write_text(
                json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            (root / "inputs" / "scene-02-last.png").write_bytes(b"scene-two-last")

            with (
                patch("cinelanding.media.tool_path", return_value="ffmpeg"),
                patch("cinelanding.media._run") as run,
            ):
                create_mock_video(root, "scene-02", duration=1.0)

            command = run.call_args.args[0]
            shared_anchor = str((root / "inputs" / "scene-01-last.png").resolve())
            self.assertEqual(command[command.index("-i") + 1], shared_anchor)
            filter_graph = command[command.index("-filter_complex") + 1]
            self.assertIn("scale=720:1280:force_original_aspect_ratio=decrease", filter_graph)

    def test_mock_video_rejects_remote_anchors_without_invoking_ffmpeg(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_anchor_project(Path(temporary))
            manifest_path = root / "cinelanding.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["scenes"][0]["first_frame"] = "https://cdn.example.com/start.png"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            with (
                patch("cinelanding.media.tool_path", return_value="ffmpeg"),
                patch("cinelanding.media._run") as run,
                self.assertRaisesRegex(ProjectError, "local first_frame"),
            ):
                create_mock_video(root, "scene-01")

            run.assert_not_called()

    def test_mock_video_rejects_a_duration_too_short_to_preview(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_anchor_project(Path(temporary))
            with (
                patch("cinelanding.media.tool_path", return_value="ffmpeg"),
                patch("cinelanding.media._run") as run,
                self.assertRaisesRegex(ProjectError, "duration must be between"),
            ):
                create_mock_video(root, "scene-01", duration=0.1)

            run.assert_not_called()


if __name__ == "__main__":
    unittest.main()
