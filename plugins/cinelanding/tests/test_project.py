from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest


SRC = Path(__file__).resolve().parents[1] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from cinelanding.errors import ProjectError
from cinelanding.models import Scene
from cinelanding.project import create_project, load_project, resolve_media_reference


class ProjectManifestTests(unittest.TestCase):
    def test_bilingual_manifest_round_trips_with_visible_copy(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root, project = create_project(
                Path(temporary) / "demo",
                name="CineLanding Demo",
                source_url="https://example.com/product",
                locales=["en-US", "ru-RU"],
                default_locale="en-US",
                mode="journey",
                audience="design teams",
            )

            payload = json.loads((root / "cinelanding.json").read_text(encoding="utf-8"))
            self.assertEqual(payload["project"]["locales"], ["en-US", "ru-RU"])
            self.assertEqual(payload["project"]["default_locale"], "en-US")
            self.assertEqual(
                set(payload["scenes"][0]["copy"]),
                {"en-US", "ru-RU"},
            )
            self.assertTrue(payload["scenes"][0]["copy"]["en-US"]["headline"])
            self.assertTrue(payload["scenes"][0]["copy"]["ru-RU"]["headline"])

            loaded_root, loaded = load_project(root)
            self.assertEqual(loaded_root, root)
            self.assertEqual(loaded.to_dict(), project.to_dict())
            self.assertEqual(loaded.validate(require_scenes=True), [])

    def test_validation_requires_a_headline_for_every_locale(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            _, project = create_project(
                Path(temporary) / "demo",
                name="Demo",
                source_url=None,
                locales=["en-US", "ru-RU"],
                default_locale="en-US",
                mode="reveal",
                audience="general",
            )
            project.scenes[0].copy["ru-RU"]["headline"] = "  "

            self.assertIn(
                "scene 'scene-01' needs visible-copy headline for ru-RU",
                project.validate(),
            )

    def test_validation_reports_broken_scene_chain(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            _, project = create_project(
                Path(temporary) / "demo",
                name="Demo",
                source_url=None,
                locales=["en-US", "ru-RU"],
                default_locale="ru-RU",
                mode="journey",
                audience="general",
            )
            project.scenes.append(
                Scene(
                    id="scene-02",
                    title="Scene 2",
                    prompt="Continue the cinematic journey.",
                    first_frame="inputs/not-the-tail.png",
                    last_frame="inputs/scene-02-last.png",
                    copy={
                        "en-US": {"headline": "Second scene"},
                        "ru-RU": {"headline": "Вторая сцена"},
                    },
                )
            )

            issues = project.validate()
            self.assertTrue(
                any("scene chain is broken between 'scene-01' and 'scene-02'" in issue for issue in issues),
                issues,
            )

    def test_local_media_cannot_escape_project_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            temporary_root = Path(temporary)
            root = temporary_root / "demo"
            root.mkdir()
            outside = temporary_root / "outside.png"
            outside.write_bytes(b"not an image")

            with self.assertRaisesRegex(ProjectError, "must stay inside the project directory"):
                resolve_media_reference(root, "../outside.png")

    def test_http_media_reference_is_left_unchanged(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            url = "https://cdn.example.com/frames/start.png"
            self.assertEqual(resolve_media_reference(root, url), url)


if __name__ == "__main__":
    unittest.main()
