from __future__ import annotations

from contextlib import redirect_stdout
from hashlib import sha256
from io import StringIO
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch


SRC = Path(__file__).resolve().parents[1] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from cinelanding.cli import main
from cinelanding.project import create_project


DESIGN_ARTIFACTS = ("PRODUCT.md", "DESIGN.md", "REFERENCE_BOARD.md")
MACHINE_ARTIFACTS = ("provenance.json", "quality-report.json")
QUALITY_TARGETS = (
    "desktop",
    "mobile",
    "reduced_motion",
    "contrast",
    "media_budget",
    "scroll_transitions",
)


def run_cli(*arguments: str) -> tuple[int, dict]:
    output = StringIO()
    with redirect_stdout(output):
        exit_code = main(list(arguments))
    return exit_code, json.loads(output.getvalue())


def create_ready_media_project(parent: Path) -> Path:
    root, _ = create_project(
        parent / "demo",
        name="Demo",
        source_url=None,
        locales=["en-US"],
        default_locale="en-US",
        mode="from-scratch",
        motion_style="journey",
        audience="creative teams",
    )
    (root / "inputs" / "scene-01-first.png").write_bytes(b"first")
    (root / "inputs" / "scene-01-last.png").write_bytes(b"last")
    return root


def complete_design_contract(root: Path) -> None:
    for artifact in DESIGN_ARTIFACTS:
        (root / artifact).write_text(
            f"# {artifact.removesuffix('.md')}\n\nReviewed project decision record.\n",
            encoding="utf-8",
        )
    profile_path = root / "design-profile.json"
    profile = json.loads(profile_path.read_text(encoding="utf-8"))
    profile["narrative_pattern"] = "journey"
    for artifact in DESIGN_ARTIFACTS:
        profile["artifacts"][artifact]["status"] = "ready"
    profile["quality_targets"] = {name: True for name in QUALITY_TARGETS}
    profile_path.write_text(
        json.dumps(profile, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    provenance_path = root / "provenance.json"
    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    for asset in provenance["assets"]:
        asset["source"] = "Supplied by project owner"
        asset["license"] = "Approved for this project"
        asset["reuse_status"] = "user-owned"
        asset["allowed_uses"] = ["provider-upload"]
        asset_path = root / asset["path_or_url"]
        asset["sha256"] = sha256(asset_path.read_bytes()).hexdigest()
    provenance_path.write_text(
        json.dumps(provenance, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def approve_design_contract(root: Path) -> None:
    complete_design_contract(root)
    exit_code, output = run_cli(
        "design-approve",
        str(root),
        "--confirm",
        "--approved-by",
        "project-owner",
    )
    if exit_code != 0:
        raise AssertionError(output)


class DesignContractTests(unittest.TestCase):
    def test_new_creates_a_draft_design_contract(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "demo"
            exit_code, output = run_cli(
                "new",
                str(destination),
                "--name",
                "Demo",
                "--mode",
                "from-scratch",
                "--motion-style",
                "reveal",
                "--narrative-pattern",
                "craft",
            )

            self.assertEqual(exit_code, 0)
            self.assertEqual(
                set(output["design_contract"]),
                {*DESIGN_ARTIFACTS, *MACHINE_ARTIFACTS, "design-profile.json"},
            )
            for artifact in DESIGN_ARTIFACTS:
                contents = (destination / artifact).read_text(encoding="utf-8")
                self.assertIn("[TODO:", contents)

            profile = json.loads(
                (destination / "design-profile.json").read_text(encoding="utf-8")
            )
            self.assertEqual(profile["schema_version"], 1)
            self.assertEqual(profile["mode"], "from-scratch")
            self.assertEqual(profile["narrative_pattern"], "craft")
            self.assertEqual(output["project"]["project"]["motion_style"], "reveal")
            self.assertEqual(profile["design_variance"], 5)
            self.assertEqual(profile["motion_intensity"], 5)
            self.assertEqual(profile["visual_density"], 5)
            self.assertEqual(profile["approval"]["status"], "pending")
            self.assertTrue(all(profile["quality_targets"].values()))
            self.assertEqual(
                set(profile["artifacts"]),
                set(DESIGN_ARTIFACTS),
            )
            provenance = json.loads(
                (destination / "provenance.json").read_text(encoding="utf-8")
            )
            self.assertEqual(provenance["schema_version"], 1)
            self.assertEqual(set(provenance), {"schema_version", "project", "assets", "fonts", "components"})
            self.assertEqual(len(provenance["assets"]), 2)
            self.assertTrue(
                all(
                    "source" in item
                    and "license" in item
                    and item["reuse_status"] == "review-required"
                    and item["allowed_uses"] == []
                    and "sha256" in item
                    for item in provenance["assets"]
                )
            )
            quality_report = json.loads(
                (destination / "quality-report.json").read_text(encoding="utf-8")
            )
            self.assertEqual(quality_report["schema_version"], 1)
            self.assertEqual(set(quality_report["checks"]), set(QUALITY_TARGETS))
            self.assertTrue(
                all(item["status"] == "pending" for item in quality_report["checks"].values())
            )

    def test_new_leaves_narrative_pattern_unselected_when_omitted(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "demo"

            exit_code, _ = run_cli(
                "new",
                str(destination),
                "--name",
                "Demo",
                "--mode",
                "from-scratch",
                "--motion-style",
                "journey",
            )

            self.assertEqual(exit_code, 0)
            profile = json.loads(
                (destination / "design-profile.json").read_text(encoding="utf-8")
            )
            self.assertIsNone(profile["narrative_pattern"])

    def test_design_validate_reports_draft_contract_as_not_ready(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_media_project(Path(temporary))

            exit_code, output = run_cli("design-validate", str(root))

            self.assertEqual(exit_code, 1)
            self.assertFalse(output["valid"])
            self.assertFalse(output["ready"])
            self.assertEqual(output["readiness_scope"], "paid-generation")
            self.assertFalse(output["ready_for_paid_generation"])
            self.assertEqual(output["project"], "demo")
            self.assertEqual(output["approval_status"], "pending")
            self.assertTrue(output["issues"])
            self.assertFalse(output["checks"]["artifacts"])
            self.assertFalse(output["checks"]["provenance"])
            self.assertFalse(output["checks"]["approval"])
            self.assertTrue(output["checks"]["quality_targets"])

    def test_design_validate_accepts_a_completed_approved_contract(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_media_project(Path(temporary))
            approve_design_contract(root)

            exit_code, output = run_cli("design-validate", str(root))

            self.assertEqual(exit_code, 0)
            self.assertTrue(output["valid"])
            self.assertTrue(output["ready"])
            self.assertEqual(output["readiness_scope"], "paid-generation")
            self.assertTrue(output["ready_for_paid_generation"])
            self.assertEqual(output["approval_status"], "approved")
            self.assertEqual(output["issues"], [])
            self.assertEqual(
                output["checks"],
                {
                    "profile": True,
                    "artifacts": True,
                    "provenance": True,
                    "approval": True,
                    "quality_targets": True,
                },
            )

    def test_design_validate_returns_structured_issues_for_invalid_profile_json(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_media_project(Path(temporary))
            (root / "design-profile.json").write_text("{", encoding="utf-8")

            exit_code, output = run_cli("design-validate", str(root))

            self.assertEqual(exit_code, 1)
            self.assertFalse(output["ready"])
            self.assertFalse(output["checks"]["profile"])
            self.assertTrue(any("cannot read design-profile.json" in issue for issue in output["issues"]))

    def test_pending_contract_does_not_block_mock_submission(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_media_project(Path(temporary))

            exit_code, output = run_cli(
                "submit",
                str(root),
                "--scene",
                "scene-01",
                "--provider",
                "mock",
            )

            self.assertEqual(exit_code, 0)
            self.assertFalse(output["reused"])
            self.assertEqual(output["job"]["provider"], "mock")

    def test_legacy_project_without_design_sidecars_keeps_free_commands_working(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_media_project(Path(temporary))
            for artifact in (*DESIGN_ARTIFACTS, *MACHINE_ARTIFACTS, "design-profile.json"):
                (root / artifact).unlink()

            validate_code, validation = run_cli("validate", str(root), "--ready")
            mock_code, mock = run_cli(
                "submit",
                str(root),
                "--scene",
                "scene-01",
                "--provider",
                "mock",
            )
            plan_code, plan = run_cli("plan", str(root))

            self.assertEqual(validate_code, 0)
            self.assertTrue(validation["valid"])
            self.assertEqual(mock_code, 0)
            self.assertEqual(mock["job"]["provider"], "mock")
            self.assertEqual(plan_code, 0)
            self.assertEqual(plan["design"]["readiness_scope"], "paid-generation")
            self.assertFalse(plan["design"]["ready_for_paid_generation"])

    def test_design_init_upgrades_legacy_project_and_is_idempotent(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_media_project(Path(temporary))
            contract_files = (*DESIGN_ARTIFACTS, *MACHINE_ARTIFACTS, "design-profile.json")
            for artifact in contract_files:
                (root / artifact).unlink()

            first_code, first = run_cli(
                "design-init",
                str(root),
                "--narrative-pattern",
                "craft",
            )
            product_path = root / "PRODUCT.md"
            original = product_path.read_text(encoding="utf-8")
            product_path.write_text(original + "\nKeep this edit.\n", encoding="utf-8")
            second_code, second = run_cli(
                "design-init",
                str(root),
                "--narrative-pattern",
                "reveal",
            )

            self.assertEqual(first_code, 0)
            self.assertEqual(set(first["created"]), set(contract_files))
            self.assertEqual(first["existing"], [])
            profile = json.loads(
                (root / "design-profile.json").read_text(encoding="utf-8")
            )
            self.assertEqual(profile["narrative_pattern"], "craft")
            self.assertEqual(second_code, 0)
            self.assertEqual(second["created"], [])
            self.assertEqual(set(second["existing"]), set(contract_files))
            self.assertTrue(product_path.read_text(encoding="utf-8").endswith("Keep this edit.\n"))
            profile = json.loads(
                (root / "design-profile.json").read_text(encoding="utf-8")
            )
            self.assertEqual(profile["narrative_pattern"], "craft")

    def test_pending_contract_blocks_kie_before_provider_access(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_media_project(Path(temporary))

            with patch("cinelanding.cli.provider_for") as provider_for:
                exit_code, output = run_cli(
                    "submit",
                    str(root),
                    "--scene",
                    "scene-01",
                    "--provider",
                    "kie",
                    "--confirm-spend",
                )

            self.assertEqual(exit_code, 2)
            self.assertEqual(output["type"], "ProjectError")
            self.assertIn("design contract is not ready", output["error"])
            self.assertIn("design-validate", output["error"])
            provider_for.assert_not_called()

    def test_plan_reports_design_gate_without_changing_media_readiness(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_media_project(Path(temporary))

            exit_code, output = run_cli("plan", str(root))

            self.assertEqual(exit_code, 0)
            self.assertTrue(output["ready"])
            self.assertEqual(output["design"]["approval_status"], "pending")
            self.assertEqual(output["design"]["readiness_scope"], "paid-generation")
            self.assertFalse(output["design"]["ready_for_paid_generation"])
            self.assertGreater(output["design"]["issue_count"], 0)
            self.assertIn("design-validate", output["next"])

    def test_design_approve_requires_confirmation_and_records_it_atomically(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_media_project(Path(temporary))
            complete_design_contract(root)
            profile_path = root / "design-profile.json"

            rejected_code, rejected = run_cli("design-approve", str(root))
            approved_code, approved = run_cli(
                "design-approve",
                str(root),
                "--confirm",
                "--approved-by",
                "owner",
            )

            self.assertEqual(rejected_code, 2)
            self.assertIn("requires --confirm", rejected["error"])
            self.assertEqual(approved_code, 0)
            self.assertTrue(approved["ready"])
            self.assertTrue(approved["ready_for_paid_generation"])
            saved = json.loads(profile_path.read_text(encoding="utf-8"))
            self.assertEqual(saved["approval"]["status"], "approved")
            self.assertEqual(saved["approval"]["approved_by"], "owner")
            self.assertTrue(saved["approval"]["approved_at"])
            self.assertRegex(saved["approval"]["scope_hash"], r"^[0-9a-f]{64}$")

    def test_design_approve_rejects_a_blank_approver_label(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_media_project(Path(temporary))
            complete_design_contract(root)

            exit_code, output = run_cli(
                "design-approve",
                str(root),
                "--confirm",
                "--approved-by",
                "   ",
            )

            self.assertEqual(exit_code, 2)
            self.assertEqual(output["type"], "ProjectError")
            self.assertIn("approved-by", output["error"])
            saved = json.loads((root / "design-profile.json").read_text(encoding="utf-8"))
            self.assertEqual(saved["approval"]["status"], "pending")

    def test_design_approve_requires_provider_upload_permission(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_media_project(Path(temporary))
            complete_design_contract(root)
            provenance_path = root / "provenance.json"
            provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
            provenance["assets"][0]["allowed_uses"] = ["site-publication"]
            provenance_path.write_text(
                json.dumps(provenance, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

            exit_code, output = run_cli(
                "design-approve",
                str(root),
                "--confirm",
            )

            self.assertEqual(exit_code, 2)
            self.assertIn("provider-upload", output["error"])

    def test_design_validate_requires_actual_local_anchor_sha256(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_media_project(Path(temporary))
            complete_design_contract(root)
            provenance_path = root / "provenance.json"
            provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
            provenance["assets"][0]["sha256"] = "0" * 64
            provenance_path.write_text(
                json.dumps(provenance, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

            exit_code, output = run_cli("design-validate", str(root))

            self.assertEqual(exit_code, 1)
            self.assertFalse(output["checks"]["provenance"])
            self.assertTrue(any("sha256" in issue for issue in output["issues"]))

    def test_duplicate_anchor_path_requires_consistent_rights_and_hash(self) -> None:
        for conflict in ("rights", "sha256"):
            with self.subTest(conflict=conflict), tempfile.TemporaryDirectory() as temporary:
                root = create_ready_media_project(Path(temporary))
                complete_design_contract(root)
                manifest_path = root / "cinelanding.json"
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                shared_path = manifest["scenes"][0]["first_frame"]
                manifest["scenes"][0]["last_frame"] = shared_path
                manifest_path.write_text(
                    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
                provenance_path = root / "provenance.json"
                provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
                provenance["assets"][1]["path_or_url"] = shared_path
                provenance["assets"][1]["sha256"] = provenance["assets"][0]["sha256"]
                if conflict == "rights":
                    provenance["assets"][1]["license"] = (
                        "Different reviewed rights statement"
                    )
                else:
                    provenance["assets"][1]["sha256"] = "0" * 64
                provenance_path.write_text(
                    json.dumps(provenance, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )

                exit_code, output = run_cli("design-validate", str(root))

                self.assertEqual(exit_code, 1)
                self.assertFalse(output["checks"]["provenance"])
                self.assertTrue(
                    any("consistent rights" in issue for issue in output["issues"])
                )

    def test_duplicate_anchor_path_accepts_identical_rights_and_hash(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_media_project(Path(temporary))
            complete_design_contract(root)
            manifest_path = root / "cinelanding.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            shared_path = manifest["scenes"][0]["first_frame"]
            manifest["scenes"][0]["last_frame"] = shared_path
            manifest_path.write_text(
                json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            provenance_path = root / "provenance.json"
            provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
            first = provenance["assets"][0]
            second = provenance["assets"][1]
            second.update(
                {
                    "path_or_url": shared_path,
                    "source": first["source"],
                    "license": first["license"],
                    "reuse_status": first["reuse_status"],
                    "allowed_uses": list(reversed(first["allowed_uses"])),
                    "sha256": first["sha256"].upper(),
                }
            )
            provenance_path.write_text(
                json.dumps(provenance, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

            exit_code, output = run_cli(
                "design-approve",
                str(root),
                "--confirm",
            )

            self.assertEqual(exit_code, 0)
            self.assertTrue(output["ready_for_paid_generation"])

    def test_edit_after_approval_invalidates_design_and_blocks_kie(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_media_project(Path(temporary))
            approve_design_contract(root)
            with (root / "DESIGN.md").open("a", encoding="utf-8") as design:
                design.write("\nChanged after approval.\n")

            validate_code, validation = run_cli("design-validate", str(root))
            with patch("cinelanding.cli.provider_for") as provider_for:
                submit_code, submission = run_cli(
                    "submit",
                    str(root),
                    "--scene",
                    "scene-01",
                    "--provider",
                    "kie",
                    "--confirm-spend",
                )

            self.assertEqual(validate_code, 1)
            self.assertTrue(any("scope_hash" in issue for issue in validation["issues"]))
            self.assertEqual(submit_code, 2)
            self.assertIn("design contract is not ready", submission["error"])
            provider_for.assert_not_called()

    def test_manifest_prompt_or_copy_edit_invalidates_approval(self) -> None:
        mutations = (
            ("prompt", lambda scene: scene.__setitem__("prompt", scene["prompt"] + " Slow push-in.")),
            (
                "copy",
                lambda scene: scene["copy"]["en-US"].__setitem__(
                    "headline",
                    "A revised approved headline",
                ),
            ),
        )
        for label, mutate in mutations:
            with self.subTest(label=label), tempfile.TemporaryDirectory() as temporary:
                root = create_ready_media_project(Path(temporary))
                approve_design_contract(root)
                manifest_path = root / "cinelanding.json"
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                mutate(manifest["scenes"][0])
                manifest_path.write_text(
                    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )

                exit_code, output = run_cli("design-validate", str(root))

                self.assertEqual(exit_code, 1)
                self.assertFalse(output["ready_for_paid_generation"])
                self.assertTrue(any("scope_hash" in issue for issue in output["issues"]))

    def test_anchor_and_provenance_edits_invalidate_approval(self) -> None:
        for mutation in ("anchor", "rights"):
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as temporary:
                root = create_ready_media_project(Path(temporary))
                approve_design_contract(root)
                provenance_path = root / "provenance.json"
                provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
                if mutation == "anchor":
                    replacement = root / "inputs" / "replacement.png"
                    replacement.write_bytes(b"replacement")
                    manifest_path = root / "cinelanding.json"
                    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                    manifest["scenes"][0]["last_frame"] = "inputs/replacement.png"
                    manifest_path.write_text(
                        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
                        encoding="utf-8",
                    )
                    provenance["assets"][1]["path_or_url"] = "inputs/replacement.png"
                    provenance["assets"][1]["sha256"] = sha256(
                        replacement.read_bytes()
                    ).hexdigest()
                else:
                    provenance["assets"][0]["license"] = (
                        "Revised reviewed rights for provider upload"
                    )
                provenance_path.write_text(
                    json.dumps(provenance, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )

                exit_code, output = run_cli("design-validate", str(root))

                self.assertEqual(exit_code, 1)
                self.assertFalse(output["ready_for_paid_generation"])
                self.assertTrue(any("scope_hash" in issue for issue in output["issues"]))

    def test_design_validate_requires_current_anchor_provenance(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_media_project(Path(temporary))
            approve_design_contract(root)
            provenance_path = root / "provenance.json"
            provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
            provenance["assets"][0]["source"] = "[TODO: source]"
            provenance["assets"][0]["license"] = "unknown"
            provenance["assets"][0]["reuse_status"] = "review-required"
            provenance_path.write_text(
                json.dumps(provenance, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

            exit_code, output = run_cli("design-validate", str(root))
            with patch("cinelanding.cli.provider_for") as provider_for:
                submit_code, submission = run_cli(
                    "submit",
                    str(root),
                    "--scene",
                    "scene-01",
                    "--provider",
                    "kie",
                    "--confirm-spend",
                )

            self.assertEqual(exit_code, 1)
            self.assertFalse(output["checks"]["provenance"])
            self.assertTrue(any("reviewed source" in issue for issue in output["issues"]))
            self.assertTrue(any("reviewed license" in issue for issue in output["issues"]))
            self.assertTrue(any("reuse_status" in issue for issue in output["issues"]))
            self.assertEqual(submit_code, 2)
            self.assertIn("design contract is not ready", submission["error"])
            provider_for.assert_not_called()

    def test_design_validate_rejects_out_of_range_design_dial(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_media_project(Path(temporary))
            complete_design_contract(root)
            profile_path = root / "design-profile.json"
            profile = json.loads(profile_path.read_text(encoding="utf-8"))
            profile["motion_intensity"] = 11
            profile_path.write_text(
                json.dumps(profile, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

            exit_code, output = run_cli("design-validate", str(root))

            self.assertEqual(exit_code, 1)
            self.assertFalse(output["checks"]["profile"])
            self.assertTrue(any("motion_intensity" in issue for issue in output["issues"]))

    def test_design_validate_rejects_non_scalar_narrative_pattern_without_crashing(self) -> None:
        for invalid_value in (["journey"], {"name": "journey"}):
            with self.subTest(invalid_value=invalid_value), tempfile.TemporaryDirectory() as temporary:
                root = create_ready_media_project(Path(temporary))
                complete_design_contract(root)
                profile_path = root / "design-profile.json"
                profile = json.loads(profile_path.read_text(encoding="utf-8"))
                profile["narrative_pattern"] = invalid_value
                profile_path.write_text(
                    json.dumps(profile, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )

                exit_code, output = run_cli("design-validate", str(root))

                self.assertEqual(exit_code, 1)
                self.assertFalse(output["valid"])
                self.assertTrue(any("narrative_pattern" in issue for issue in output["issues"]))

    def test_design_validate_rejects_non_scalar_reuse_status_without_crashing(self) -> None:
        for invalid_value in (["user-owned"], {"status": "user-owned"}):
            with self.subTest(invalid_value=invalid_value), tempfile.TemporaryDirectory() as temporary:
                root = create_ready_media_project(Path(temporary))
                complete_design_contract(root)
                provenance_path = root / "provenance.json"
                provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
                provenance["assets"][0]["reuse_status"] = invalid_value
                provenance_path.write_text(
                    json.dumps(provenance, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )

                exit_code, output = run_cli("design-validate", str(root))

                self.assertEqual(exit_code, 1)
                self.assertFalse(output["valid"])
                self.assertTrue(any("reuse_status" in issue for issue in output["issues"]))

    def test_quality_validate_reports_pending_skeleton_as_not_ready(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_media_project(Path(temporary))

            exit_code, output = run_cli("quality-validate", str(root))

            self.assertEqual(exit_code, 1)
            self.assertFalse(output["valid"])
            self.assertFalse(output["ready"])
            self.assertEqual(set(output["checks"]), set(QUALITY_TARGETS))
            self.assertTrue(all(not passed for passed in output["checks"].values()))
            self.assertTrue(output["issues"])

    def test_quality_validate_accepts_passed_checks_with_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = create_ready_media_project(Path(temporary))
            report_path = root / "quality-report.json"
            report = json.loads(report_path.read_text(encoding="utf-8"))
            report["checks"] = {
                name: {
                    "status": "passed",
                    "evidence": [f"Verified {name} in the target route."],
                }
                for name in QUALITY_TARGETS
            }
            report_path.write_text(
                json.dumps(report, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

            exit_code, output = run_cli("quality-validate", str(root))

            self.assertEqual(exit_code, 0)
            self.assertTrue(output["valid"])
            self.assertTrue(output["ready"])
            self.assertEqual(output["issues"], [])
            self.assertTrue(all(output["checks"].values()))


if __name__ == "__main__":
    unittest.main()
