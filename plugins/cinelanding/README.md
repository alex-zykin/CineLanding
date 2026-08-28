# CineLanding agent plugin

This package contains the CineLanding CLI and the `$cinelanding` skill. It helps an agent plan cinematic landing-page scenes, validate anchor frames, run mock or KIE generation, process the output, and assemble approved media in a target frontend repository. Optional business-ready modules add technical personal-data evidence and a Prodamus launch workflow.

CineLanding does not have a hosted editor or control panel yet. The CLI and skill are the working product in this repository.

## Run from a source checkout

Python 3.10 or newer is required. FFmpeg handles local video and frame operations; `doctor` also reports FFprobe when available. The Python runtime has no third-party dependencies.

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

## Commands

| Command | Purpose |
| --- | --- |
| `doctor` | Check Python, FFmpeg, FFprobe, and KIE configuration. |
| `new` | Create a schema v2 manifest and project directories. Requires `--mode redesign` or `--mode from-scratch`; accepts optional business-ready modules. |
| `validate` | Validate the project contract. `--ready` also checks generation inputs. |
| `plan` | Show scene readiness, expected paid calls, and request settings. |
| `submit` | Submit one scene to `mock` or to an explicitly authorized `kie` request. |
| `credits` | Read the configured KIE account balance. |
| `status`, `wait` | Refresh one recorded provider task. `wait --download` can save a successful result. |
| `download` | Download HTTPS result URLs for a successful task. |
| `jobs` | List saved generation jobs for the project. |
| `mock-video` | Create a local FFmpeg test video. |
| `extract` | Stream video frames to `frames/<scene-id>/`. |

`redesign` requires `--url`. `from-scratch` rejects `--url`. The separate `--motion-style` option accepts `journey` or `reveal`. New projects use `en-US` unless locales are supplied explicitly.

`--business-ready` selects a technical privacy-readiness review and a one-time Prodamus integration workflow. The modules can also be selected independently with `--privacy-readiness` and `--payment-gateway prodamus`. They create working files under `business/`; those files are not proof of legal compliance or a live payment connection.

The request fingerprint reuses a recorded job when its settings and local frame contents have not changed. `--force-new` skips that protection and can create another paid task.

## Skill references

The skill entry point is [skills/cinelanding/SKILL.md](skills/cinelanding/SKILL.md). Its references cover both project modes, the schema, KIE, safety, frontend assembly, technical privacy readiness, and Prodamus launch checks.

The repository [README](../../README.md) has setup examples and the full command flow.
