from __future__ import annotations

import argparse
from dataclasses import asdict
import json
import os
from pathlib import Path
import sys
import time
from typing import Any, Dict, Optional, Sequence

from . import __version__
from .design import (
    DESIGN_PROJECT_FILES,
    NARRATIVE_PATTERNS,
    approve_design_contract,
    design_contract_status,
    quality_report_status,
    write_design_contract,
)
from .errors import CineLandingError, ProjectError, SubmissionUnknownError
from .media import create_mock_video, doctor, download_results, extract_frames
from .models import GenerationJob, VideoRequest, utc_now
from .project import (
    create_project,
    find_job,
    find_job_by_fingerprint,
    get_scene,
    load_jobs,
    load_project,
    project_readiness,
    resolve_media_reference,
    upsert_job,
)
from .providers import KieProvider, MockProvider
from .providers.kie import DEFAULT_MODEL


TERMINAL_STATES = {"success", "fail"}


class CliUsageError(CineLandingError):
    """Command-line arguments are missing or invalid."""


class JsonArgumentParser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        raise CliUsageError(message)


def emit(value: Any) -> None:
    print(json.dumps(value, ensure_ascii=False, indent=2))


def provider_for(name: str):
    if name == "mock":
        return MockProvider()
    if name == "kie":
        return KieProvider()
    raise ProjectError(f"unknown provider '{name}'")


def request_for(root: Path, project, scene_id: str, model: str, callback_url: Optional[str]) -> VideoRequest:
    scene = get_scene(project, scene_id)
    issues = scene.validate(project.locales)
    if issues:
        raise ProjectError("invalid scene: " + "; ".join(issues))
    return VideoRequest(
        scene_id=scene.id,
        prompt=scene.prompt,
        first_frame=resolve_media_reference(root, scene.first_frame),
        last_frame=resolve_media_reference(root, scene.last_frame),
        duration=scene.duration,
        resolution=scene.resolution,
        aspect_ratio=scene.aspect_ratio,
        negative_prompt=scene.negative_prompt,
        callback_url=callback_url,
        model=model,
    )


def cmd_doctor(_: argparse.Namespace) -> int:
    result = doctor()
    result["ok"] = bool(result["python"]["supported"] and result["ffmpeg"]["available"])
    emit(result)
    return 0 if result["ok"] else 1


def cmd_new(args: argparse.Namespace) -> int:
    locales = args.locale or ["en-US"]
    default_locale = args.default_locale or locales[0]
    privacy_readiness = bool(args.business_ready or args.privacy_readiness)
    payment_gateway = args.payment_gateway or ("prodamus" if args.business_ready else "none")
    root, project = create_project(
        destination=args.path,
        name=args.name,
        source_url=args.url,
        locales=locales,
        default_locale=default_locale,
        mode=args.mode,
        motion_style=args.motion_style,
        audience=args.audience,
        narrative_pattern=args.narrative_pattern,
        privacy_readiness=privacy_readiness,
        payment_gateway=payment_gateway,
        force=args.force,
    )
    emit(
        {
            "created": str(root),
            "manifest": str(root / "cinelanding.json"),
            "design_contract": list(DESIGN_PROJECT_FILES),
            "project": project.to_dict(),
        }
    )
    return 0


def cmd_plan(args: argparse.Namespace) -> int:
    root, project = load_project(args.path)
    result = project_readiness(root, project)
    design_status = design_contract_status(root, project)
    result["design"] = {
        "readiness_scope": design_status["readiness_scope"],
        "ready_for_paid_generation": design_status["ready_for_paid_generation"],
        "approval_status": design_status["approval_status"],
        "issue_count": len(design_status["issues"]),
    }
    result["cost_note"] = "Provider pricing is not hard-coded. Check KIE credits before paid generation."
    result["next"] = (
        "Run design-validate and resolve its issues before paid KIE generation. "
        "Use mock first; KIE submission also requires --confirm-spend."
    )
    emit(result)
    return 0 if result["ready"] else 1


def cmd_validate(args: argparse.Namespace) -> int:
    root, project = load_project(args.path)
    issues = project.validate(require_scenes=args.ready)
    readiness = project_readiness(root, project) if args.ready else None
    if readiness and not readiness["ready"]:
        for item in readiness["scenes"]:
            issues.extend(item["missing"])
    emit({"valid": not issues, "issues": issues, "project": project.slug})
    return 0 if not issues else 1


def cmd_design_validate(args: argparse.Namespace) -> int:
    root, project = load_project(args.path)
    result = design_contract_status(root, project)
    emit(result)
    return 0 if result["ready_for_paid_generation"] else 1


def cmd_design_init(args: argparse.Namespace) -> int:
    root, project = load_project(args.path)
    existing = {
        name
        for name in DESIGN_PROJECT_FILES
        if (root / name).exists()
    }
    write_design_contract(
        root,
        project,
        narrative_pattern=args.narrative_pattern,
    )
    emit(
        {
            "project": project.slug,
            "created": [name for name in DESIGN_PROJECT_FILES if name not in existing],
            "existing": [name for name in DESIGN_PROJECT_FILES if name in existing],
            "files": list(DESIGN_PROJECT_FILES),
        }
    )
    return 0


def cmd_design_approve(args: argparse.Namespace) -> int:
    if not args.confirm:
        raise ProjectError(
            "design approval requires --confirm after the project owner explicitly approves the contract"
        )
    root, project = load_project(args.path)
    result = approve_design_contract(root, project, approved_by=args.approved_by)
    emit(result)
    return 0


def cmd_quality_validate(args: argparse.Namespace) -> int:
    root, project = load_project(args.path)
    result = quality_report_status(root, project)
    emit(result)
    return 0 if result["ready"] else 1


def cmd_credits(_: argparse.Namespace) -> int:
    provider = KieProvider()
    emit({"provider": "kie", "credits": provider.credits()})
    return 0


def cmd_submit(args: argparse.Namespace) -> int:
    root, project = load_project(args.path)
    if args.provider == "kie":
        design_status = design_contract_status(root, project)
        if not design_status["ready_for_paid_generation"]:
            first_issue = design_status["issues"][0] if design_status["issues"] else "unknown issue"
            raise ProjectError(
                "paid KIE generation is blocked because the design contract is not ready "
                "for paid generation; "
                "run 'cinelanding design-validate <project>' and resolve its issues "
                f"(first issue: {first_issue})"
            )
    request = request_for(root, project, args.scene, args.model, args.callback_url)
    fingerprint = request.fingerprint()
    existing = find_job_by_fingerprint(root, fingerprint, args.provider)
    if existing and not args.force_new:
        emit({"reused": True, "job": existing.to_dict()})
        return 0

    if args.provider == "kie" and not args.confirm_spend:
        raise ProjectError(
            "paid KIE generation requires --confirm-spend after the user reviews the plan and current credits"
        )

    provider = provider_for(args.provider)
    try:
        job = provider.submit(request)
    except SubmissionUnknownError:
        job = GenerationJob(
            task_id=f"unknown-{fingerprint[:16]}",
            provider=args.provider,
            model=request.model,
            state="submission_unknown",
            scene_id=request.scene_id,
            fingerprint=fingerprint,
            error_message=(
                "Submission timed out. Do not resubmit automatically; inspect the KIE dashboard first."
            ),
        )
        upsert_job(root, job)
        raise
    upsert_job(root, job)
    emit({"reused": False, "job": job.to_dict()})
    return 0


def _refresh_job(root: Path, job: GenerationJob) -> GenerationJob:
    if job.state == "submission_unknown":
        raise ProjectError("cannot poll a submission_unknown job without a provider task id")
    provider = provider_for(job.provider)
    updated = provider.status(job)
    upsert_job(root, updated)
    return updated


def cmd_status(args: argparse.Namespace) -> int:
    root, _ = load_project(args.path)
    job = _refresh_job(root, find_job(root, args.task_id))
    emit(job.to_dict())
    return 0 if job.state != "fail" else 1


def cmd_wait(args: argparse.Namespace) -> int:
    root, _ = load_project(args.path)
    job = find_job(root, args.task_id)
    deadline = time.monotonic() + args.timeout
    interval = 2.5
    while job.state not in TERMINAL_STATES:
        if time.monotonic() >= deadline:
            raise ProjectError(f"task did not finish within {args.timeout} seconds")
        job = _refresh_job(root, job)
        if job.state not in TERMINAL_STATES:
            time.sleep(interval)
            interval = min(interval * 1.5, 30.0)
    result: Dict[str, Any] = {"job": job.to_dict()}
    if args.download and job.state == "success":
        result["downloaded"] = [str(path) for path in download_results(root, job.task_id, job.scene_id, job.result_urls)]
    emit(result)
    return 0 if job.state == "success" else 1


def cmd_download(args: argparse.Namespace) -> int:
    root, _ = load_project(args.path)
    job = find_job(root, args.task_id)
    if job.state != "success":
        raise ProjectError(f"task state is '{job.state}', not success")
    paths = download_results(root, job.task_id, job.scene_id, job.result_urls)
    emit({"task_id": job.task_id, "downloaded": [str(path) for path in paths]})
    return 0


def cmd_extract(args: argparse.Namespace) -> int:
    root, _ = load_project(args.path)
    emit(extract_frames(root, args.video, args.scene, fps=args.fps, force=args.force))
    return 0


def cmd_mock_video(args: argparse.Namespace) -> int:
    root, _ = load_project(args.path)
    output = create_mock_video(root, args.scene, duration=args.duration)
    emit({"scene_id": args.scene, "video": str(output)})
    return 0


def cmd_jobs(args: argparse.Namespace) -> int:
    root, _ = load_project(args.path)
    emit({"jobs": [job.to_dict() for job in load_jobs(root)]})
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = JsonArgumentParser(prog="cinelanding", description="CineLanding agent CLI")
    parser.add_argument("--version", action="version", version=f"CineLanding {__version__}")
    subparsers = parser.add_subparsers(dest="command", required=True)

    doctor_parser = subparsers.add_parser("doctor", help="Check local tooling and provider configuration")
    doctor_parser.set_defaults(func=cmd_doctor)

    new_parser = subparsers.add_parser("new", help="Create a CineLanding project manifest")
    new_parser.add_argument("path", type=Path)
    new_parser.add_argument("--name", required=True)
    new_parser.add_argument("--url", help="Existing site URL; required only in redesign mode")
    new_parser.add_argument(
        "--locale",
        choices=["en-US", "ru-RU"],
        action="append",
        help="Visible-copy locale; repeat to add Russian (default: en-US)",
    )
    new_parser.add_argument(
        "--default-locale",
        choices=["en-US", "ru-RU"],
        help="Primary locale (default: first --locale, otherwise en-US)",
    )
    new_parser.add_argument(
        "--mode",
        choices=["redesign", "from-scratch"],
        required=True,
        help="Redesign an existing site or start from a brief and assets",
    )
    new_parser.add_argument(
        "--motion-style",
        choices=["journey", "reveal"],
        default="journey",
        help="Visual transition style (default: journey)",
    )
    new_parser.add_argument(
        "--narrative-pattern",
        choices=sorted(NARRATIVE_PATTERNS),
        help="Separate page-story pattern; left unselected when omitted",
    )
    new_parser.add_argument("--audience", default="general")
    new_parser.add_argument(
        "--business-ready",
        action="store_true",
        help="Prepare the project for a technical privacy audit and one-time Prodamus payments",
    )
    new_parser.add_argument(
        "--privacy-readiness",
        action="store_true",
        help="Include the technical privacy-readiness workflow",
    )
    new_parser.add_argument(
        "--payment-gateway",
        choices=["none", "prodamus"],
        help="Prepare a one-time payment integration (default: none, or prodamus with --business-ready)",
    )
    new_parser.add_argument("--force", action="store_true")
    new_parser.set_defaults(func=cmd_new)

    for command, handler in (("plan", cmd_plan), ("jobs", cmd_jobs)):
        command_parser = subparsers.add_parser(command)
        command_parser.add_argument("path", type=Path)
        command_parser.set_defaults(func=handler)

    validate_parser = subparsers.add_parser("validate")
    validate_parser.add_argument("path", type=Path)
    validate_parser.add_argument("--ready", action="store_true", help="Require every generation input")
    validate_parser.set_defaults(func=cmd_validate)

    design_init_parser = subparsers.add_parser(
        "design-init",
        help="Add missing design-contract files to an existing project",
    )
    design_init_parser.add_argument("path", type=Path)
    design_init_parser.add_argument(
        "--narrative-pattern",
        choices=sorted(NARRATIVE_PATTERNS),
        help="Initial page-story pattern when design-profile.json is missing",
    )
    design_init_parser.set_defaults(func=cmd_design_init)

    design_validate_parser = subparsers.add_parser(
        "design-validate",
        help="Validate the design contract and explicit approval gate",
    )
    design_validate_parser.add_argument("path", type=Path)
    design_validate_parser.set_defaults(func=cmd_design_validate)

    design_approve_parser = subparsers.add_parser(
        "design-approve",
        help="Record explicit project-owner approval after design validation",
    )
    design_approve_parser.add_argument("path", type=Path)
    design_approve_parser.add_argument(
        "--confirm",
        action="store_true",
        help="Confirm that the project owner explicitly approved this contract",
    )
    design_approve_parser.add_argument(
        "--approved-by",
        help="Optional non-secret approver label stored in design-profile.json",
    )
    design_approve_parser.set_defaults(func=cmd_design_approve)

    quality_validate_parser = subparsers.add_parser(
        "quality-validate",
        help="Validate post-build quality evidence",
    )
    quality_validate_parser.add_argument("path", type=Path)
    quality_validate_parser.set_defaults(func=cmd_quality_validate)

    credits_parser = subparsers.add_parser("credits", help="Read KIE account credits")
    credits_parser.set_defaults(func=cmd_credits)

    submit_parser = subparsers.add_parser("submit", help="Submit one scene for generation")
    submit_parser.add_argument("path", type=Path)
    submit_parser.add_argument("--scene", required=True)
    submit_parser.add_argument("--provider", choices=["mock", "kie"], default="mock")
    submit_parser.add_argument("--model", default=DEFAULT_MODEL)
    submit_parser.add_argument("--callback-url")
    submit_parser.add_argument("--confirm-spend", action="store_true")
    submit_parser.add_argument("--force-new", action="store_true")
    submit_parser.set_defaults(func=cmd_submit)

    for command, handler in (("status", cmd_status), ("download", cmd_download)):
        command_parser = subparsers.add_parser(command)
        command_parser.add_argument("path", type=Path)
        command_parser.add_argument("task_id")
        command_parser.set_defaults(func=handler)

    wait_parser = subparsers.add_parser("wait")
    wait_parser.add_argument("path", type=Path)
    wait_parser.add_argument("task_id")
    wait_parser.add_argument("--timeout", type=int, default=900)
    wait_parser.add_argument("--download", action="store_true")
    wait_parser.set_defaults(func=cmd_wait)

    extract_parser = subparsers.add_parser("extract")
    extract_parser.add_argument("path", type=Path)
    extract_parser.add_argument("video", type=Path)
    extract_parser.add_argument("--scene", required=True)
    extract_parser.add_argument("--fps", type=int, default=24)
    extract_parser.add_argument("--force", action="store_true")
    extract_parser.set_defaults(func=cmd_extract)

    mock_video_parser = subparsers.add_parser("mock-video", help="Create a local smoke-test video")
    mock_video_parser.add_argument("path", type=Path)
    mock_video_parser.add_argument("--scene", default="scene-01")
    mock_video_parser.add_argument("--duration", type=float, default=1.0)
    mock_video_parser.set_defaults(func=cmd_mock_video)
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8")
    parser = build_parser()
    try:
        args = parser.parse_args(argv)
        return int(args.func(args))
    except CineLandingError as exc:
        emit({"error": str(exc), "type": exc.__class__.__name__})
        return 2
    except KeyboardInterrupt:
        emit({"error": "cancelled", "type": "KeyboardInterrupt"})
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
