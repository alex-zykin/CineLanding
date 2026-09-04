from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Tuple

from .errors import ProjectError
from .models import Project, is_http_url


DESIGN_PROFILE_FILE = "design-profile.json"
PROVENANCE_FILE = "provenance.json"
QUALITY_REPORT_FILE = "quality-report.json"
PROJECT_MANIFEST_FILE = "cinelanding.json"
DESIGN_ARTIFACTS = ("PRODUCT.md", "DESIGN.md", "REFERENCE_BOARD.md")
DESIGN_PROJECT_FILES = (*DESIGN_ARTIFACTS, DESIGN_PROFILE_FILE, PROVENANCE_FILE, QUALITY_REPORT_FILE)
NARRATIVE_PATTERNS = {
    "transformation",
    "craft",
    "assembly",
    "journey",
    "reveal",
    "comparison",
    "process",
}
QUALITY_TARGETS = (
    "desktop",
    "mobile",
    "reduced_motion",
    "contrast",
    "media_budget",
    "scroll_transitions",
)
DESIGN_DIALS = ("design_variance", "motion_intensity", "visual_density")
TODO_MARKER = "[TODO:"
BLOCKED_PROVENANCE_VALUES = {
    "unknown",
    "pending",
    "review-required",
    "replace-before-upload",
    "do-not-reuse",
    "tbd",
}
ALLOWED_REUSE_STATUSES = {
    "original",
    "user-owned",
    "explicit-license",
    "permission-confirmed",
}
PROVIDER_UPLOAD_USE = "provider-upload"
DESIGN_READINESS_SCOPE = "paid-generation"


def _atomic_write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary, path)


def _write_if_missing(path: Path, contents: str) -> None:
    if not path.exists():
        path.write_text(contents, encoding="utf-8")


def _product_template(project: Project) -> str:
    source = project.source_url or "No source site; original project"
    return f"""# Product contract — {project.name}

Status: `draft`

This file records product facts and decisions. Do not replace missing facts with plausible copy.

## Goal

{TODO_MARKER} State the measurable job of this landing page.]

## Audience

Starting audience: {project.audience}

{TODO_MARKER} Confirm the primary audience, context, and strongest objection.]

## Offer and primary CTA

{TODO_MARKER} Record the approved offer and one primary call to action.]

## Approved facts and claims

- {TODO_MARKER} List facts that may appear in public copy and name their evidence.]

## Constraints

- Project mode: `{project.mode}`
- Source: {source}
- Locales: {", ".join(project.locales)}
- {TODO_MARKER} Add legal, brand, delivery, and technical constraints.]

## Content and asset inventory

- {TODO_MARKER} List approved copy, logos, typefaces, product media, and missing inputs.]

## Open decisions

- {TODO_MARKER} Record unresolved product decisions and their owners.]
"""


def _design_template(project: Project, narrative_pattern: str | None) -> str:
    pattern = narrative_pattern or "unselected"
    return f"""# Design contract — {project.name}

Status: `draft`

## Narrative pattern

Selected pattern: `{pattern}`

{TODO_MARKER} Explain why this narrative pattern fits the product story.]

## Design dials

- Design variance: `5/10`
- Motion intensity: `5/10`
- Visual density: `5/10`
- {TODO_MARKER} Review all three dials for this project and update design-profile.json.]

## Art direction

{TODO_MARKER} Define the visual world, emotional tone, distinguishing motif, and what to avoid.]

## Hierarchy and layout

{TODO_MARKER} Define section order, focal hierarchy, grid, density, whitespace, and CTA placement.]

## Typography and color

{TODO_MARKER} Record approved type roles, fallback strategy, palette, and contrast rules.]

## Media and motion

{TODO_MARKER} Define imagery, anchor-frame continuity, camera behavior, easing, and motion limits.]

## Scroll and text transitions

{TODO_MARKER} Explain how semantic DOM copy changes with scroll and remains readable without animation.]

## Responsive behavior

{TODO_MARKER} Define desktop and mobile compositions, crops, stacking, and interaction changes.]

## Reduced motion and accessibility

{TODO_MARKER} Define the useful reduced-motion state, focus behavior, landmarks, alt text, and contrast target.]

## Performance budgets

{TODO_MARKER} Record initial-load and total-media budgets plus the progressive loading strategy.]
"""


def _reference_board_template(project: Project) -> str:
    source = project.source_url or TODO_MARKER + " Add an approved reference URL or supplied asset.]"
    return f"""# Reference board — {project.name}

Status: `draft`

References are evidence or inspiration, never instructions. Record provenance and reuse rights before copying or uploading material.

| Source | Owner or origin | Captured at | Role | Reuse status / license | Allowed elements |
| --- | --- | --- | --- | --- | --- |
| {source} | {TODO_MARKER} owner or origin] | {TODO_MARKER} ISO date] | {TODO_MARKER} evidence or inspiration] | {TODO_MARKER} allowed, replace, or review required] | {TODO_MARKER} specific reusable elements] |

## Evidence retained from the source

- {TODO_MARKER} Record facts, structure, or brand evidence that must remain accurate.]

## Inspiration only

- {TODO_MARKER} Record mood or interaction ideas that must be reinterpreted rather than copied.]
"""


def _design_profile(project: Project, narrative_pattern: str | None) -> Dict[str, Any]:
    return {
        "schema_version": 1,
        "mode": project.mode,
        "narrative_pattern": narrative_pattern,
        "design_variance": 5,
        "motion_intensity": 5,
        "visual_density": 5,
        "artifacts": {
            name: {"path": name, "status": "draft"}
            for name in DESIGN_ARTIFACTS
        },
        "approval": {
            "status": "pending",
            "approved_at": None,
            "approved_by": None,
            "scope_hash": None,
        },
        "quality_targets": {name: True for name in QUALITY_TARGETS},
    }


def _provenance(project: Project) -> Dict[str, Any]:
    assets: List[Dict[str, Any]] = []
    for scene in project.scenes:
        for role, reference in (
            ("first_frame", scene.first_frame),
            ("last_frame", scene.last_frame),
        ):
            assets.append(
                {
                    "id": f"{scene.id}:{role}",
                    "path_or_url": reference,
                    "source": f"{TODO_MARKER} original source or owner]",
                    "license": f"{TODO_MARKER} reuse terms or replace-before-upload]",
                    "reuse_status": "review-required",
                    "allowed_uses": [],
                    "sha256": None,
                }
            )
    return {
        "schema_version": 1,
        "project": project.slug,
        "assets": assets,
        "fonts": [
            {
                "id": "primary-font",
                "path_or_url": None,
                "source": f"{TODO_MARKER} font source]",
                "license": f"{TODO_MARKER} font license]",
                "sha256": None,
            }
        ],
        "components": [
            {
                "id": "page-components",
                "path_or_url": None,
                "source": f"{TODO_MARKER} original, repository, or external source]",
                "license": f"{TODO_MARKER} component license or original work]",
                "sha256": None,
            }
        ],
    }


def _quality_report(project: Project) -> Dict[str, Any]:
    return {
        "schema_version": 1,
        "project": project.slug,
        "checks": {
            name: {
                "status": "pending",
                "evidence": [],
            }
            for name in QUALITY_TARGETS
        },
    }


def write_design_contract(
    root: Path,
    project: Project,
    narrative_pattern: str | None = None,
) -> List[Path]:
    if narrative_pattern is not None and (
        not isinstance(narrative_pattern, str)
        or narrative_pattern not in NARRATIVE_PATTERNS
    ):
        raise ProjectError(
            "narrative_pattern must be one of " + str(sorted(NARRATIVE_PATTERNS))
        )
    templates = {
        "PRODUCT.md": _product_template(project),
        "DESIGN.md": _design_template(project, narrative_pattern),
        "REFERENCE_BOARD.md": _reference_board_template(project),
    }
    for name, contents in templates.items():
        _write_if_missing(root / name, contents)

    json_files = {
        DESIGN_PROFILE_FILE: _design_profile(project, narrative_pattern),
        PROVENANCE_FILE: _provenance(project),
        QUALITY_REPORT_FILE: _quality_report(project),
    }
    for name, value in json_files.items():
        path = root / name
        if not path.exists():
            _atomic_write_json(path, value)
    return [root / name for name in DESIGN_PROJECT_FILES]


def _load_json_object(path: Path) -> Tuple[Dict[str, Any] | None, str | None]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        return None, f"cannot read {path.name}: {exc}"
    if not isinstance(value, dict):
        return None, f"{path.name} must contain a JSON object"
    return value, None


def _valid_approval_time(value: Any) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return True


def _file_sha256(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _design_scope_hash(root: Path, profile: Dict[str, Any]) -> str:
    approved_file_contents = {
        name: (root / name).read_text(encoding="utf-8")
        for name in (*DESIGN_ARTIFACTS, PROJECT_MANIFEST_FILE, PROVENANCE_FILE)
    }
    profile_scope = {
        key: value
        for key, value in profile.items()
        if key != "approval"
    }
    canonical = json.dumps(
        {
            "files": approved_file_contents,
            "profile": profile_scope,
        },
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return sha256(canonical.encode("utf-8")).hexdigest()


def _normalized_rights_record(record: Dict[str, Any]) -> str:
    allowed_uses = record.get("allowed_uses")
    if isinstance(allowed_uses, list) and all(
        isinstance(value, str) for value in allowed_uses
    ):
        normalized_uses: Any = sorted(set(allowed_uses))
    else:
        normalized_uses = allowed_uses
    digest = record.get("sha256")
    normalized_digest = digest.casefold() if isinstance(digest, str) else digest
    return json.dumps(
        {
            "source": record.get("source"),
            "license": record.get("license"),
            "reuse_status": record.get("reuse_status"),
            "allowed_uses": normalized_uses,
            "sha256": normalized_digest,
        },
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


def _local_reference(root: Path, reference: str) -> Path | None:
    if is_http_url(reference):
        return None
    candidate = Path(reference)
    resolved = candidate.resolve() if candidate.is_absolute() else (root / candidate).resolve()
    if not resolved.is_relative_to(root.resolve()):
        raise ProjectError(f"local media must stay inside the project directory: {reference}")
    return resolved


def _provenance_issues(root: Path, project: Project) -> List[str]:
    provenance, error = _load_json_object(root / PROVENANCE_FILE)
    if error:
        return [error]
    assert provenance is not None
    issues: List[str] = []
    if type(provenance.get("schema_version")) is not int or provenance["schema_version"] != 1:
        issues.append("provenance.json schema_version must be 1")
    if provenance.get("project") != project.slug:
        issues.append(f"provenance project must be '{project.slug}'")
    assets = provenance.get("assets")
    if not isinstance(assets, list):
        issues.append("provenance assets must be an array")
        assets = []
    for collection in ("fonts", "components"):
        if not isinstance(provenance.get(collection), list):
            issues.append(f"provenance {collection} must be an array")

    records: Dict[str, List[Dict[str, Any]]] = {}
    for item in assets:
        if isinstance(item, dict) and isinstance(item.get("id"), str):
            records.setdefault(item["id"], []).append(item)

    rights_by_reference: Dict[str, str] = {}
    inconsistent_references = set()
    for item in assets:
        if not isinstance(item, dict):
            continue
        reference = item.get("path_or_url")
        if not isinstance(reference, str) or not reference:
            continue
        rights = _normalized_rights_record(item)
        previous = rights_by_reference.setdefault(reference, rights)
        if previous != rights:
            inconsistent_references.add(reference)
    for reference in sorted(inconsistent_references):
        issues.append(
            f"provenance records for path_or_url '{reference}' must have consistent rights and sha256"
        )

    for scene in project.scenes:
        for role, reference in (
            ("first_frame", scene.first_frame),
            ("last_frame", scene.last_frame),
        ):
            record_id = f"{scene.id}:{role}"
            matches = records.get(record_id, [])
            if len(matches) != 1:
                issues.append(f"provenance needs exactly one asset record for '{record_id}'")
                continue
            record = matches[0]
            if record.get("path_or_url") != reference:
                issues.append(
                    f"provenance asset '{record_id}' path_or_url must match the current scene reference"
                )
            for field in ("source", "license"):
                value = record.get(field)
                normalized = (
                    value.strip().casefold().replace("_", "-").replace(" ", "-")
                    if isinstance(value, str)
                    else ""
                )
                if (
                    not isinstance(value, str)
                    or not value.strip()
                    or TODO_MARKER.casefold() in value.casefold()
                    or normalized in BLOCKED_PROVENANCE_VALUES
                ):
                    issues.append(
                        f"provenance asset '{record_id}' needs a reviewed {field}"
                    )
            reuse_status = record.get("reuse_status")
            if (
                not isinstance(reuse_status, str)
                or reuse_status not in ALLOWED_REUSE_STATUSES
            ):
                issues.append(
                    f"provenance asset '{record_id}' reuse_status must be one of "
                    + str(sorted(ALLOWED_REUSE_STATUSES))
                )
            allowed_uses = record.get("allowed_uses")
            if (
                not isinstance(allowed_uses, list)
                or any(not isinstance(value, str) or not value for value in allowed_uses)
                or len(allowed_uses) != len(set(allowed_uses))
            ):
                issues.append(
                    f"provenance asset '{record_id}' allowed_uses must be an array of unique non-empty strings"
                )
            elif PROVIDER_UPLOAD_USE not in allowed_uses:
                issues.append(
                    f"provenance asset '{record_id}' allowed_uses must include '{PROVIDER_UPLOAD_USE}'"
                )

            try:
                local_path = _local_reference(root, reference)
            except (OSError, ProjectError) as exc:
                issues.append(f"provenance asset '{record_id}' cannot verify sha256: {exc}")
            else:
                if local_path is not None:
                    try:
                        actual_sha256 = _file_sha256(local_path)
                    except OSError as exc:
                        issues.append(
                            f"provenance asset '{record_id}' cannot verify sha256: {exc}"
                        )
                    else:
                        recorded_sha256 = record.get("sha256")
                        if (
                            not isinstance(recorded_sha256, str)
                            or recorded_sha256.casefold() != actual_sha256
                        ):
                            issues.append(
                                f"provenance asset '{record_id}' sha256 must match the current local file"
                            )
    return issues


def design_contract_status(
    root: Path,
    project: Project,
    *,
    require_approval: bool = True,
) -> Dict[str, Any]:
    issues: List[str] = []
    checks = {
        "profile": False,
        "artifacts": False,
        "provenance": False,
        "approval": False,
        "quality_targets": False,
    }
    result: Dict[str, Any] = {
        "valid": False,
        "ready": False,
        "readiness_scope": DESIGN_READINESS_SCOPE,
        "ready_for_paid_generation": False,
        "project": project.slug,
        "profile": str(root / DESIGN_PROFILE_FILE),
        "approval_status": "unknown",
        "checks": checks,
        "issues": issues,
    }
    profile, error = _load_json_object(root / DESIGN_PROFILE_FILE)
    if error:
        issues.append(error)
        return result
    assert profile is not None

    profile_issues: List[str] = []
    if type(profile.get("schema_version")) is not int or profile["schema_version"] != 1:
        profile_issues.append("design-profile.json schema_version must be 1")
    if profile.get("mode") != project.mode:
        profile_issues.append(f"design profile mode must match project mode '{project.mode}'")
    narrative_pattern = profile.get("narrative_pattern")
    if (
        not isinstance(narrative_pattern, str)
        or narrative_pattern not in NARRATIVE_PATTERNS
    ):
        profile_issues.append(
            "narrative_pattern must be one of " + str(sorted(NARRATIVE_PATTERNS))
        )
    for name in DESIGN_DIALS:
        value = profile.get(name)
        if type(value) is not int or not 1 <= value <= 10:
            profile_issues.append(f"{name} must be an integer from 1 to 10")
    artifact_records = profile.get("artifacts")
    if not isinstance(artifact_records, dict):
        profile_issues.append("design profile artifacts must be an object")
        artifact_records = {}
    checks["profile"] = not profile_issues
    issues.extend(profile_issues)

    artifact_issues: List[str] = []
    for name in DESIGN_ARTIFACTS:
        record = artifact_records.get(name)
        if not isinstance(record, dict):
            artifact_issues.append(f"design profile is missing artifact record for {name}")
            continue
        if record.get("path") != name:
            artifact_issues.append(f"{name} path must be '{name}'")
        if record.get("status") != "ready":
            artifact_issues.append(f"{name} status must be 'ready'")
        path = root / name
        try:
            contents = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as exc:
            artifact_issues.append(f"cannot read {name}: {exc}")
            continue
        if not contents.strip():
            artifact_issues.append(f"{name} must not be empty")
        if TODO_MARKER.casefold() in contents.casefold():
            artifact_issues.append(f"{name} still contains {TODO_MARKER} placeholders")
    checks["artifacts"] = not artifact_issues
    issues.extend(artifact_issues)

    provenance_issues = _provenance_issues(root, project)
    checks["provenance"] = not provenance_issues
    issues.extend(provenance_issues)

    approval = profile.get("approval")
    approval_issues: List[str] = []
    if not isinstance(approval, dict):
        if require_approval:
            approval_issues.append("design profile approval must be an object")
    else:
        result["approval_status"] = str(approval.get("status", "unknown"))
        if require_approval and approval.get("status") != "approved":
            approval_issues.append("design approval status must be 'approved'")
        if require_approval and not _valid_approval_time(approval.get("approved_at")):
            approval_issues.append("design approval approved_at must be an ISO 8601 timestamp")
        if require_approval:
            approved_by = approval.get("approved_by")
            if not isinstance(approved_by, str) or not approved_by.strip():
                approval_issues.append("design approval approved_by must be a non-empty audit label")
            try:
                current_scope_hash = _design_scope_hash(root, profile)
            except (OSError, UnicodeError) as exc:
                approval_issues.append(f"cannot compute design approval scope_hash: {exc}")
            else:
                result["scope_hash"] = current_scope_hash
                if approval.get("scope_hash") != current_scope_hash:
                    approval_issues.append(
                        "design approval scope_hash does not match the current contract; re-approve it"
                    )
    checks["approval"] = not approval_issues
    issues.extend(approval_issues)

    target_issues: List[str] = []
    quality_targets = profile.get("quality_targets")
    if not isinstance(quality_targets, dict):
        target_issues.append("design profile quality_targets must be an object")
    else:
        for name in QUALITY_TARGETS:
            if quality_targets.get(name) is not True:
                target_issues.append(f"quality target '{name}' must be true")
    checks["quality_targets"] = not target_issues
    issues.extend(target_issues)

    result["valid"] = not issues
    result["ready_for_paid_generation"] = bool(require_approval and not issues)
    result["ready"] = result["ready_for_paid_generation"]
    return result


def approve_design_contract(
    root: Path,
    project: Project,
    *,
    approved_by: str | None = None,
) -> Dict[str, Any]:
    if approved_by is None:
        approver_label = "user-confirmed"
    elif not isinstance(approved_by, str) or not approved_by.strip():
        raise ProjectError("--approved-by must be a non-empty audit label")
    else:
        approver_label = approved_by.strip()

    preflight = design_contract_status(root, project, require_approval=False)
    if not preflight["valid"]:
        summary = "; ".join(preflight["issues"][:3])
        if len(preflight["issues"]) > 3:
            summary += f"; and {len(preflight['issues']) - 3} more issue(s)"
        raise ProjectError(f"design contract cannot be approved: {summary}")

    path = root / DESIGN_PROFILE_FILE
    profile, error = _load_json_object(path)
    if error or profile is None:
        raise ProjectError(error or f"cannot read {DESIGN_PROFILE_FILE}")
    profile["approval"] = {
        "status": "approved",
        "approved_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "approved_by": approver_label,
        "scope_hash": _design_scope_hash(root, profile),
    }
    _atomic_write_json(path, profile)
    return design_contract_status(root, project)


def quality_report_status(root: Path, project: Project) -> Dict[str, Any]:
    issues: List[str] = []
    check_results = {name: False for name in QUALITY_TARGETS}
    result: Dict[str, Any] = {
        "valid": False,
        "ready": False,
        "project": project.slug,
        "report": str(root / QUALITY_REPORT_FILE),
        "checks": check_results,
        "issues": issues,
    }
    report, error = _load_json_object(root / QUALITY_REPORT_FILE)
    if error:
        issues.append(error)
        return result
    assert report is not None

    if type(report.get("schema_version")) is not int or report["schema_version"] != 1:
        issues.append("quality-report.json schema_version must be 1")
    if report.get("project") != project.slug:
        issues.append(f"quality report project must be '{project.slug}'")
    records = report.get("checks")
    if not isinstance(records, dict):
        issues.append("quality report checks must be an object")
        records = {}

    for name in QUALITY_TARGETS:
        record = records.get(name)
        check_issues: List[str] = []
        if not isinstance(record, dict):
            check_issues.append(f"quality report is missing check '{name}'")
        else:
            if record.get("status") != "passed":
                check_issues.append(f"quality check '{name}' status must be 'passed'")
            evidence = record.get("evidence")
            if not isinstance(evidence, list) or not any(
                isinstance(item, str) and item.strip() for item in evidence
            ):
                check_issues.append(f"quality check '{name}' needs evidence")
        check_results[name] = not check_issues
        issues.extend(check_issues)

    result["valid"] = not issues
    result["ready"] = not issues
    return result
