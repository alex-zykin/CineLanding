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
from cinelanding.models import Project, Scene
from cinelanding.project import (
    create_project,
    load_project,
    project_readiness,
    resolve_media_reference,
)


class ProjectManifestTests(unittest.TestCase):
    def test_manifest_v2_round_trips_with_workflow_and_motion_style(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root, project = create_project(
                Path(temporary) / "demo",
                name="CineLanding Demo",
                source_url="https://example.com/product",
                locales=["en-US", "ru-RU"],
                default_locale="en-US",
                mode="redesign",
                motion_style="reveal",
                audience="design teams",
                privacy_readiness=True,
                payment_gateway="prodamus",
            )

            payload = json.loads((root / "cinelanding.json").read_text(encoding="utf-8"))
            self.assertEqual(payload["schema_version"], 2)
            self.assertEqual(payload["project"]["mode"], "redesign")
            self.assertEqual(payload["project"]["motion_style"], "reveal")
            self.assertEqual(payload["project"]["locales"], ["en-US", "ru-RU"])
            self.assertEqual(payload["project"]["default_locale"], "en-US")
            self.assertEqual(
                payload["project"]["business"],
                {
                    "privacy_readiness": True,
                    "payment_gateway": "prodamus",
                },
            )
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

    def test_validation_rejects_unknown_payment_gateway(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            _, project = create_project(
                Path(temporary) / "demo",
                name="Demo",
                source_url=None,
                locales=["en-US"],
                default_locale="en-US",
                mode="from-scratch",
                motion_style="journey",
                audience="general",
            )
            project.payment_gateway = "mystery-pay"

            self.assertIn(
                "payment_gateway must be one of ['none', 'prodamus']",
                project.validate(),
            )

    def test_validation_requires_a_headline_for_every_locale(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            _, project = create_project(
                Path(temporary) / "demo",
                name="Demo",
                source_url=None,
                locales=["en-US", "ru-RU"],
                default_locale="en-US",
                mode="from-scratch",
                motion_style="reveal",
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
                mode="from-scratch",
                motion_style="journey",
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

    def test_redesign_requires_source_url(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaisesRegex(ProjectError, "redesign mode requires source_url"):
                create_project(
                    Path(temporary) / "demo",
                    name="Demo",
                    source_url=None,
                    locales=["en-US"],
                    default_locale="en-US",
                    mode="redesign",
                    motion_style="journey",
                    audience="general",
                )

    def test_from_scratch_forbids_source_url(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaisesRegex(ProjectError, "from-scratch mode does not accept source_url"):
                create_project(
                    Path(temporary) / "demo",
                    name="Demo",
                    source_url="https://example.com",
                    locales=["en-US"],
                    default_locale="en-US",
                    mode="from-scratch",
                    motion_style="journey",
                    audience="general",
                )

    def test_schema_v1_redesign_is_migrated_to_v2(self) -> None:
        legacy = {
            "schema_version": 1,
            "project": {
                "name": "Legacy redesign",
                "slug": "legacy-redesign",
                "locale": "en-US",
                "mode": "reveal",
                "source_url": "https://example.com",
                "audience": "general",
                "created_at": "2026-01-01T00:00:00+00:00",
            },
            "scenes": [],
        }

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "cinelanding.json").write_text(
                json.dumps(legacy),
                encoding="utf-8",
            )

            _, project = load_project(root)

        self.assertEqual(project.schema_version, 2)
        self.assertEqual(project.mode, "redesign")
        self.assertEqual(project.motion_style, "reveal")
        self.assertEqual(project.validate(), [])

    def test_schema_v1_from_scratch_is_migrated_to_v2(self) -> None:
        legacy = {
            "schema_version": 1,
            "project": {
                "name": "Legacy original",
                "slug": "legacy-original",
                "locale": "en-US",
                "mode": "journey",
                "source_url": None,
                "audience": "general",
                "created_at": "2026-01-01T00:00:00+00:00",
            },
            "scenes": [],
        }

        project = Project.from_dict(legacy)

        self.assertEqual(project.schema_version, 2)
        self.assertEqual(project.mode, "from-scratch")
        self.assertEqual(project.motion_style, "journey")
        self.assertEqual(project.validate(), [])

    def test_readiness_exposes_mode_and_motion_style(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root, project = create_project(
                Path(temporary) / "demo",
                name="Demo",
                source_url=None,
                locales=["en-US"],
                default_locale="en-US",
                mode="from-scratch",
                motion_style="reveal",
                audience="general",
            )

            readiness = project_readiness(root, project)

            self.assertEqual(readiness["mode"], "from-scratch")
            self.assertEqual(readiness["motion_style"], "reveal")
            self.assertEqual(
                readiness["business"],
                {
                    "privacy_readiness": False,
                    "payment_gateway": "none",
                },
            )


if __name__ == "__main__":
    unittest.main()
