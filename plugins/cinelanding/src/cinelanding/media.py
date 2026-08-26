from __future__ import annotations

import json
import os
from pathlib import Path
import re
import shutil
import subprocess
from typing import Any, Dict, List
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from .errors import ProjectError, ProviderError
from .models import SCENE_ID_PATTERN
from .project import atomic_write_json


def tool_path(name: str) -> str | None:
    return shutil.which(name)


def doctor() -> Dict[str, Any]:
    import platform
    import sys

    return {
        "python": {
            "version": platform.python_version(),
            "supported": sys.version_info >= (3, 10),
        },
        "ffmpeg": {"path": tool_path("ffmpeg"), "available": bool(tool_path("ffmpeg"))},
        "ffprobe": {"path": tool_path("ffprobe"), "available": bool(tool_path("ffprobe"))},
        "kie": {"configured": bool(os.environ.get("KIE_API_KEY"))},
    }


def _run(command: List[str]) -> None:
    try:
        completed = subprocess.run(command, check=False, capture_output=True, text=True)
    except OSError as exc:
        raise ProjectError(f"cannot run {command[0]}: {exc}") from exc
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout).strip()[-2000:]
        raise ProjectError(f"{command[0]} failed: {detail}")


def _safe_project_file(root: Path, value: Path) -> Path:
    resolved_root = root.resolve()
    resolved = value.resolve() if value.is_absolute() else (resolved_root / value).resolve()
    if not resolved.is_relative_to(resolved_root):
        raise ProjectError(f"file must stay inside the project directory: {value}")
    return resolved


def create_mock_video(root: Path, scene_id: str, duration: float = 1.0) -> Path:
    if not SCENE_ID_PATTERN.fullmatch(scene_id):
        raise ProjectError("scene id must be lower-case hyphen-case")
    ffmpeg = tool_path("ffmpeg")
    if not ffmpeg:
        raise ProjectError("ffmpeg is required to create a mock video")
    output_dir = root.resolve() / "artifacts" / scene_id
    output_dir.mkdir(parents=True, exist_ok=True)
    output = output_dir / "mock.mp4"
    _run(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "testsrc2=size=1280x720:rate=24",
            "-t",
            str(duration),
            "-an",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(output),
        ]
    )
    return output


def extract_frames(
    root: Path,
    video: Path,
    scene_id: str,
    fps: int = 24,
    force: bool = False,
) -> Dict[str, Any]:
    if not SCENE_ID_PATTERN.fullmatch(scene_id):
        raise ProjectError("scene id must be lower-case hyphen-case")
    if not 1 <= fps <= 60:
        raise ProjectError("fps must be between 1 and 60")
    ffmpeg = tool_path("ffmpeg")
    if not ffmpeg:
        raise ProjectError("ffmpeg is required to extract frames")
    input_path = _safe_project_file(root, video)
    if not input_path.is_file():
        raise ProjectError(f"video not found: {input_path}")

    output_dir = root.resolve() / "frames" / scene_id
    output_dir.mkdir(parents=True, exist_ok=True)
    existing = list(output_dir.glob("frame_*.jpg"))
    if existing and not force:
        raise ProjectError(f"{output_dir} already contains frames; pass --force to replace them")
    if force:
        for frame in existing:
            frame.unlink()

    pattern = output_dir / "frame_%05d.jpg"
    _run(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(input_path),
            "-vf",
            f"fps={fps}",
            "-q:v",
            "2",
            "-start_number",
            "0",
            str(pattern),
        ]
    )
    frames = sorted(output_dir.glob("frame_*.jpg"))
    if not frames:
        raise ProjectError("ffmpeg completed without producing frames")

    manifest_path = root.resolve() / "frames" / "manifest.json"
    manifest: Dict[str, Any] = {"version": 1, "scenes": {}}
    if manifest_path.exists():
        try:
            loaded = json.loads(manifest_path.read_text(encoding="utf-8"))
            if isinstance(loaded, dict) and isinstance(loaded.get("scenes"), dict):
                manifest = loaded
        except (OSError, json.JSONDecodeError):
            pass
    manifest["scenes"][scene_id] = {
        "count": len(frames),
        "fps": fps,
        "pattern": f"{scene_id}/frame_%05d.jpg",
        "source": str(input_path.relative_to(root.resolve())).replace("\\", "/"),
    }
    atomic_write_json(manifest_path, manifest)
    return {"scene_id": scene_id, "frames": len(frames), "directory": str(output_dir)}


def download_results(root: Path, task_id: str, scene_id: str, urls: List[str]) -> List[Path]:
    if not urls:
        raise ProviderError("the task has no result URLs")
    if not SCENE_ID_PATTERN.fullmatch(scene_id):
        raise ProviderError("recorded scene id is not safe for an artifact path")
    safe_task_id = re.sub(r"[^A-Za-z0-9._-]+", "-", task_id).strip("-._")[:80]
    if not safe_task_id:
        raise ProviderError("provider task id is not safe for an artifact filename")
    output_dir = root.resolve() / "artifacts" / scene_id
    output_dir.mkdir(parents=True, exist_ok=True)
    downloaded: List[Path] = []
    for index, url in enumerate(urls, start=1):
        parsed = urlparse(url)
        if parsed.scheme != "https" or not parsed.netloc:
            raise ProviderError(f"refusing non-HTTPS result URL: {url}")
        suffix = Path(parsed.path).suffix.lower()
        if suffix not in {".mp4", ".mov", ".webm", ".png", ".jpg", ".jpeg", ".webp"}:
            suffix = ".bin"
        output = output_dir / f"{safe_task_id}-{index:02d}{suffix}"
        if output.is_file() and output.stat().st_size > 0:
            downloaded.append(output)
            continue
        request = Request(url, headers={"User-Agent": "CineLanding/0.1.0"})
        try:
            with urlopen(request, timeout=120) as response:
                final_url = urlparse(response.geturl())
                if final_url.scheme != "https" or not final_url.netloc:
                    raise ProviderError("refusing a result redirect to a non-HTTPS URL")
                with output.open("wb") as target:
                    shutil.copyfileobj(response, target)
        except OSError as exc:
            if output.exists():
                output.unlink()
            raise ProviderError(f"failed to download result {index}: {exc}") from exc
        downloaded.append(output)
    return downloaded
