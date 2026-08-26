# CineLanding agent plugin

CineLanding is an agent-first, provider-aware toolkit for planning and producing cinematic transition assets for scroll-driven landing pages. This package contains the Python CLI and the `$cinelanding` agent skill. The skill can guide integration into a user's target frontend; CineLanding itself intentionally has no hosted editor or SaaS control panel.

## Run from a source checkout

Python 3.10+ is required. FFmpeg is required for the local video and frame workflow; `doctor` also reports FFprobe when it is available. The runtime has no third-party Python dependencies.

From the repository root:

```bash
python plugins/cinelanding/scripts/cinelanding.py doctor
python plugins/cinelanding/scripts/cinelanding.py --help
```

Optional editable installation:

```bash
python -m pip install -e plugins/cinelanding
cinelanding doctor
```

## Command surface

| Command | Purpose |
| --- | --- |
| `doctor` | Check Python, FFmpeg/FFprobe, and whether KIE is configured. |
| `new` | Create `cinelanding.json` and project directories. |
| `validate` | Validate the project contract; `--ready` also requires all generation inputs. |
| `plan` | Print scene readiness, paid-call count, and request settings. |
| `submit` | Submit one scene to `mock` or explicitly authorized `kie`. |
| `credits` | Read the configured KIE account credit balance. |
| `status`, `wait` | Refresh one recorded provider task; `wait --download` can save a successful result. |
| `download` | Download HTTPS result URLs for a successful task. |
| `jobs` | List the project's persisted generation jobs. |
| `mock-video` | Create a local FFmpeg smoke-test video. |
| `extract` | Stream video frames to `frames/<scene-id>/`. |

The same request fingerprint reuses its recorded job unless `--force-new` is supplied. Use `--force-new` only when a genuinely new paid generation is intended.

## Agent guidance

The skill entrypoint is [skills/cinelanding/SKILL.md](skills/cinelanding/SKILL.md). Its focused references cover the project format, mock-first workflow, KIE boundary, handling of untrusted source websites, and performant integration into a target frontend.

For setup and an end-to-end example, see the repository-level `README.md`.
