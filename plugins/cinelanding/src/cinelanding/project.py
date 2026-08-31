from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from .business import write_business_materials
from .errors import ProjectError
from .models import GenerationJob, Project, Scene, is_http_url, slugify, utc_now


PROJECT_FILE = "cinelanding.json"
STATE_DIR = ".cinelanding"
JOBS_FILE = "jobs.json"


def atomic_write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary, path)


def project_root(value: Path) -> Path:
    candidate = value.expanduser().resolve()
    return candidate.parent if candidate.is_file() else candidate


def create_project(
    destination: Path,
    name: str,
    source_url: Optional[str],
    locales: List[str],
    default_locale: str,
    mode: str,
    motion_style: str,
    audience: str,
    privacy_readiness: bool = False,
    payment_gateway: str = "none",
    force: bool = False,
) -> Tuple[Path, Project]:
    root = destination.expanduser().resolve()
    manifest = root / PROJECT_FILE
    if manifest.exists() and not force:
        raise ProjectError(f"{manifest} already exists; refusing to overwrite it")

    title = "Первая сцена" if default_locale == "ru-RU" else "First scene"
    visible_copy = {
        locale: {
            "headline": "Заголовок сцены" if locale == "ru-RU" else "Scene headline",
            "body": "",
            "cta": "",
        }
        for locale in locales
    }
    project = Project(
        name=name,
        slug=slugify(name),
        default_locale=default_locale,
        locales=locales,
        mode=mode,
        motion_style=motion_style,
        source_url=source_url,
        audience=audience,
        created_at=utc_now(),
        privacy_readiness=privacy_readiness,
        payment_gateway=payment_gateway,
        scenes=[
            Scene(
                id="scene-01",
                title=title,
                prompt=(
                    "Smooth cinematic transition between the supplied frames. "
                    "Preserve brand geometry, product identity, and all deliberate layout anchors."
                ),
                first_frame="inputs/scene-01-first.png",
                last_frame="inputs/scene-01-last.png",
                copy=visible_copy,
            )
        ],
    )
    issues = project.validate()
    if issues:
        raise ProjectError("; ".join(issues))

    for relative in ("inputs", "artifacts", "frames", STATE_DIR):
        (root / relative).mkdir(parents=True, exist_ok=True)
    write_business_materials(root, project)
    atomic_write_json(manifest, project.to_dict())
    return root, project


def load_project(value: Path) -> Tuple[Path, Project]:
    root = project_root(value)
    manifest = root / PROJECT_FILE
    if not manifest.is_file():
        raise ProjectError(f"project manifest not found: {manifest}")
    try:
        payload = json.loads(manifest.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ProjectError(f"cannot read {manifest}: {exc}") from exc
    project = Project.from_dict(payload)
    issues = project.validate()
    if issues:
        raise ProjectError("invalid project: " + "; ".join(issues))
    return root, project


def get_scene(project: Project, scene_id: str) -> Scene:
    for scene in project.scenes:
        if scene.id == scene_id:
            return scene
    raise ProjectError(f"scene '{scene_id}' does not exist")


def resolve_media_reference(root: Path, value: str, require_exists: bool = True) -> str:
    if is_http_url(value):
        return value
    candidate = Path(value)
    resolved = candidate.resolve() if candidate.is_absolute() else (root / candidate).resolve()
    if not resolved.is_relative_to(root.resolve()):
        raise ProjectError(f"local media must stay inside the project directory: {value}")
    if require_exists and not resolved.is_file():
        raise ProjectError(f"media file not found: {resolved}")
    return str(resolved)


def project_readiness(root: Path, project: Project) -> Dict[str, Any]:
    scene_plans: List[Dict[str, Any]] = []
    for scene in project.scenes:
        missing: List[str] = []
        for label, value in (("first_frame", scene.first_frame), ("last_frame", scene.last_frame)):
            try:
                resolve_media_reference(root, value)
            except ProjectError as exc:
                missing.append(f"{label}: {exc}")
        scene_plans.append(
            {
                "scene_id": scene.id,
                "title": scene.title,
                "ready": not missing,
                "missing": missing,
                "provider_request": {
                    "model": "bytedance/seedance-2-fast",
                    "duration": scene.duration,
                    "resolution": scene.resolution,
                    "aspect_ratio": scene.aspect_ratio,
                    "generate_audio": False,
                },
            }
        )
    return {
        "project": project.slug,
        "default_locale": project.default_locale,
        "locales": project.locales,
        "mode": project.mode,
        "motion_style": project.motion_style,
        "business": {
            "privacy_readiness": project.privacy_readiness,
            "payment_gateway": project.payment_gateway,
        },
        "ready": bool(scene_plans) and all(item["ready"] for item in scene_plans),
        "paid_calls": len(scene_plans),
        "scenes": scene_plans,
    }


def jobs_path(root: Path) -> Path:
    return root / STATE_DIR / JOBS_FILE


def load_jobs(root: Path) -> List[GenerationJob]:
    path = jobs_path(root)
    if not path.exists():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ProjectError(f"cannot read job store {path}: {exc}") from exc
    return [GenerationJob.from_dict(item) for item in payload.get("jobs", [])]


def save_jobs(root: Path, jobs: Iterable[GenerationJob]) -> None:
    atomic_write_json(jobs_path(root), {"version": 1, "jobs": [job.to_dict() for job in jobs]})


def upsert_job(root: Path, job: GenerationJob) -> None:
    jobs = load_jobs(root)
    for index, existing in enumerate(jobs):
        if existing.task_id == job.task_id:
            jobs[index] = job
            break
    else:
        jobs.append(job)
    save_jobs(root, jobs)


def find_job_by_fingerprint(
    root: Path, fingerprint: str, provider: str
) -> Optional[GenerationJob]:
    for job in load_jobs(root):
        if job.provider == provider and job.fingerprint == fingerprint:
            return job
    return None


def find_job(root: Path, task_id: str) -> GenerationJob:
    for job in load_jobs(root):
        if job.task_id == task_id:
            return job
    raise ProjectError(f"task '{task_id}' is not recorded in this project")
