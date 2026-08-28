from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import re
import unicodedata
from typing import Any, Dict, Iterable, List, Optional
from urllib.parse import urlparse


SUPPORTED_LOCALES = {"en-US", "ru-RU"}
SUPPORTED_MODES = {"redesign", "from-scratch"}
SUPPORTED_MOTION_STYLES = {"journey", "reveal"}
SUPPORTED_PAYMENT_GATEWAYS = {"none", "prodamus"}
SUPPORTED_ASPECT_RATIOS = {"1:1", "4:3", "3:4", "16:9", "9:16", "21:9", "adaptive"}
SCENE_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,62}$")


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
    if slug:
        return slug[:64]
    digest = sha256(value.encode("utf-8")).hexdigest()[:8]
    return f"project-{digest}"


def is_http_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


@dataclass
class Scene:
    id: str
    title: str
    prompt: str
    first_frame: str
    last_frame: str
    duration: int = 5
    resolution: str = "720p"
    aspect_ratio: str = "16:9"
    negative_prompt: str = "flicker, warped text, distorted layout, geometry drift, camera shake"
    copy: Dict[str, Dict[str, str]] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, value: Dict[str, Any]) -> "Scene":
        return cls(
            id=str(value.get("id", "")),
            title=str(value.get("title", "")),
            prompt=str(value.get("prompt", "")),
            first_frame=str(value.get("first_frame", "")),
            last_frame=str(value.get("last_frame", "")),
            duration=int(value.get("duration", 5)),
            resolution=str(value.get("resolution", "720p")),
            aspect_ratio=str(value.get("aspect_ratio", "16:9")),
            negative_prompt=str(value.get("negative_prompt", "")),
            copy={
                str(locale): {str(key): str(text) for key, text in content.items()}
                for locale, content in value.get("copy", {}).items()
                if isinstance(content, dict)
            },
        )

    def validate(self, required_locales: Iterable[str] = ()) -> List[str]:
        issues: List[str] = []
        if not SCENE_ID_PATTERN.fullmatch(self.id):
            issues.append(f"scene id '{self.id}' must be lower-case hyphen-case")
        if not self.title.strip():
            issues.append(f"scene '{self.id}' has no title")
        if len(self.prompt.strip()) < 3:
            issues.append(f"scene '{self.id}' prompt must contain at least 3 characters")
        if not self.first_frame.strip():
            issues.append(f"scene '{self.id}' has no first_frame")
        if not self.last_frame.strip():
            issues.append(f"scene '{self.id}' has no last_frame")
        if not 2 <= self.duration <= 15:
            issues.append(f"scene '{self.id}' duration must be between 2 and 15 seconds")
        if self.aspect_ratio not in SUPPORTED_ASPECT_RATIOS:
            issues.append(f"scene '{self.id}' has unsupported aspect_ratio '{self.aspect_ratio}'")
        for locale in required_locales:
            content = self.copy.get(locale)
            if not content or not content.get("headline", "").strip():
                issues.append(f"scene '{self.id}' needs visible-copy headline for {locale}")
        return issues


@dataclass
class Project:
    name: str
    slug: str
    default_locale: str
    locales: List[str]
    mode: str
    motion_style: str
    source_url: Optional[str]
    audience: str
    created_at: str
    privacy_readiness: bool = False
    payment_gateway: str = "none"
    scenes: List[Scene] = field(default_factory=list)
    schema_version: int = 2

    @classmethod
    def from_dict(cls, value: Dict[str, Any]) -> "Project":
        project = value.get("project", value)
        business = project.get("business", {})
        if not isinstance(business, dict):
            business = {}
        scenes = [Scene.from_dict(item) for item in value.get("scenes", [])]
        source_url = project.get("source_url") or None
        schema_version = int(value.get("schema_version", 1))
        if schema_version == 1:
            mode = "redesign" if source_url else "from-scratch"
            motion_style = str(project.get("mode", ""))
            schema_version = 2
        else:
            mode = str(project.get("mode", ""))
            motion_style = str(project.get("motion_style", ""))
        return cls(
            name=str(project.get("name", "")),
            slug=str(project.get("slug", "")),
            default_locale=str(project.get("default_locale", project.get("locale", ""))),
            locales=[str(item) for item in project.get("locales", [project.get("locale", "")]) if item],
            mode=mode,
            motion_style=motion_style,
            source_url=source_url,
            audience=str(project.get("audience", "")),
            created_at=str(project.get("created_at", "")),
            privacy_readiness=business.get("privacy_readiness", False),
            payment_gateway=str(business.get("payment_gateway", "none")),
            scenes=scenes,
            schema_version=schema_version,
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "project": {
                "name": self.name,
                "slug": self.slug,
                "default_locale": self.default_locale,
                "locales": self.locales,
                "mode": self.mode,
                "motion_style": self.motion_style,
                "source_url": self.source_url,
                "audience": self.audience,
                "created_at": self.created_at,
                "business": {
                    "privacy_readiness": self.privacy_readiness,
                    "payment_gateway": self.payment_gateway,
                },
            },
            "scenes": [asdict(scene) for scene in self.scenes],
        }

    def validate(self, require_scenes: bool = False) -> List[str]:
        issues: List[str] = []
        if self.schema_version != 2:
            issues.append(f"unsupported schema_version {self.schema_version}")
        if not self.name.strip():
            issues.append("project name is required")
        if not SCENE_ID_PATTERN.fullmatch(self.slug):
            issues.append("project slug must be lower-case hyphen-case")
        if not self.locales:
            issues.append("at least one locale is required")
        if len(set(self.locales)) != len(self.locales):
            issues.append("project locales must be unique")
        unsupported_locales = sorted(set(self.locales) - SUPPORTED_LOCALES)
        if unsupported_locales:
            issues.append(f"unsupported locales: {unsupported_locales}")
        if self.default_locale not in self.locales:
            issues.append("default_locale must be present in locales")
        if self.mode not in SUPPORTED_MODES:
            issues.append(f"mode must be one of {sorted(SUPPORTED_MODES)}")
        if self.motion_style not in SUPPORTED_MOTION_STYLES:
            issues.append(f"motion_style must be one of {sorted(SUPPORTED_MOTION_STYLES)}")
        if not isinstance(self.privacy_readiness, bool):
            issues.append("privacy_readiness must be true or false")
        if self.payment_gateway not in SUPPORTED_PAYMENT_GATEWAYS:
            issues.append(f"payment_gateway must be one of {sorted(SUPPORTED_PAYMENT_GATEWAYS)}")
        if self.mode == "redesign" and not self.source_url:
            issues.append("redesign mode requires source_url")
        if self.mode == "from-scratch" and self.source_url:
            issues.append("from-scratch mode does not accept source_url")
        if self.source_url and not is_http_url(self.source_url):
            issues.append("source_url must be an http(s) URL")
        if require_scenes and not self.scenes:
            issues.append("at least one scene is required")
        seen = set()
        for index, scene in enumerate(self.scenes):
            issues.extend(scene.validate(self.locales))
            if scene.id in seen:
                issues.append(f"duplicate scene id '{scene.id}'")
            seen.add(scene.id)
            if index > 0 and self.scenes[index - 1].last_frame != scene.first_frame:
                issues.append(
                    f"scene chain is broken between '{self.scenes[index - 1].id}' and '{scene.id}'; "
                    "the next first_frame must point to the previous actual tail frame"
                )
        return issues


@dataclass
class VideoRequest:
    scene_id: str
    prompt: str
    first_frame: str
    last_frame: str
    duration: int
    resolution: str
    aspect_ratio: str
    negative_prompt: str = ""
    callback_url: Optional[str] = None
    model: str = "bytedance/seedance-2-fast"

    @staticmethod
    def _reference_identity(reference: str) -> Dict[str, Any]:
        if is_http_url(reference):
            return {"kind": "url", "value": reference}
        path = Path(reference)
        if not path.is_file():
            return {"kind": "path", "value": reference}
        digest = sha256()
        with path.open("rb") as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                digest.update(chunk)
        return {
            "kind": "file",
            "sha256": digest.hexdigest(),
            "bytes": path.stat().st_size,
        }

    def fingerprint(self) -> str:
        value = asdict(self)
        value["first_frame"] = self._reference_identity(self.first_frame)
        value["last_frame"] = self._reference_identity(self.last_frame)
        body = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        return sha256(body.encode("utf-8")).hexdigest()


@dataclass
class GenerationJob:
    task_id: str
    provider: str
    model: str
    state: str
    scene_id: str
    fingerprint: str
    result_urls: List[str] = field(default_factory=list)
    progress: Optional[int] = None
    credits_consumed: Optional[float] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    created_at: str = field(default_factory=utc_now)
    updated_at: str = field(default_factory=utc_now)

    @classmethod
    def from_dict(cls, value: Dict[str, Any]) -> "GenerationJob":
        return cls(
            task_id=str(value["task_id"]),
            provider=str(value["provider"]),
            model=str(value.get("model", "")),
            state=str(value.get("state", "waiting")),
            scene_id=str(value.get("scene_id", "")),
            fingerprint=str(value.get("fingerprint", "")),
            result_urls=[str(item) for item in value.get("result_urls", [])],
            progress=value.get("progress"),
            credits_consumed=value.get("credits_consumed"),
            error_code=value.get("error_code"),
            error_message=value.get("error_message"),
            created_at=str(value.get("created_at", utc_now())),
            updated_at=str(value.get("updated_at", utc_now())),
        )

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
