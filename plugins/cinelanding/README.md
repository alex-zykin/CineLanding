# CineLanding agent plugin

This package contains the CineLanding CLI and the `$cinelanding` skill. It helps an agent establish and approve a product-specific design contract, plan cinematic landing-page scenes, validate anchor provenance, run mock or KIE generation, process the output, and verify delivery in a target frontend repository. Optional business-ready modules add technical personal-data evidence and a Prodamus launch workflow.

The repository includes a browser-local Studio demo, but not a production account, billing, or generation backend. This package remains the portable working core for agent-driven projects.

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
| `new` | Create a schema v2 manifest, draft design contract, provenance record, and quality report. |
| `validate` | Validate the project contract. `--ready` also checks generation inputs. |
| `plan` | Show scene readiness, expected paid calls, and request settings. |
| `design-init` | Add only missing design-contract files to an existing project. |
| `design-validate` | Check product/design artifacts, scene-bound approval, anchor upload rights and hashes; reports paid-generation readiness, not launch readiness. |
| `design-approve` | Record an explicit owner approval and bind it to the current contract hash. |
| `quality-validate` | Check that every post-build quality gate has recorded passing evidence. |
| `submit` | Submit one scene to `mock` or to an explicitly authorized `kie` request. |
| `credits` | Read the configured KIE account balance. |
| `status`, `wait` | Refresh one recorded provider task. `wait --download` can save a successful result. |
| `download` | Download HTTPS result URLs for a successful task. |
| `jobs` | List saved generation jobs for the project. |
| `mock-video` | Crossfade a scene's local first/last anchors into a no-cost FFmpeg seam preview. |
| `extract` | Stream video frames to `frames/<scene-id>/`. |

`redesign` requires `--url`. `from-scratch` rejects `--url`. Narrative patterns describe the page's product-story arc; the separate `--motion-style` option accepts `journey` or `reveal` for transition treatment. New projects use `en-US` unless locales are supplied explicitly.

`--business-ready` selects a technical privacy-readiness review and a one-time Prodamus integration workflow. The modules can also be selected independently with `--privacy-readiness` and `--payment-gateway prodamus`. They create working files under `business/`; those files are not proof of legal compliance or a live payment connection.

Within each provider, the request fingerprint reuses a recorded job when its settings and local frame contents have not changed. A mock record does not block the first matching KIE submission. A new KIE request additionally requires `ready_for_paid_generation: true`: the approval must match the current manifest and provenance, every anchor must explicitly allow `provider-upload`, every local anchor hash must match its bytes, and the user must separately confirm spend. `--force-new` skips same-provider protection and can create another paid task.

`mock-video` is intentionally local-only: it rejects remote anchor URLs, fits local anchors without cropping to the scene aspect ratio, and creates a 0.25-to-30-second crossfade. It checks composition and seam continuity, not model-generated motion. The rough `adaptive` preview defaults to 16:9.

## Skill references

The skill entry point is [skills/cinelanding/SKILL.md](skills/cinelanding/SKILL.md). Its references cover both project modes, art direction, design approval, quality gates, the schema, KIE, safety, frontend assembly, technical privacy readiness, and Prodamus launch checks.

The repository [README](../../README.md) has setup examples and the full command flow.
