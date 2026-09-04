# CineLanding

[![English](https://img.shields.io/badge/lang-English-24292f.svg)](README.md) [![Русский](https://img.shields.io/badge/lang-%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-24292f.svg)](README.ru.md)

CineLanding is an open source CLI and agent plugin for landing pages with cinematic, scroll-linked transitions. It turns product evidence into a reviewable design contract, manages scene plans, anchor frames, generation jobs, downloads, and FFmpeg frame extraction, then guides an agent through frontend delivery and runtime quality checks. Managed Russian-language projects may optionally add a technical personal-data review and a Prodamus payment-integration workflow.

The repository now includes a Vercel-native, browser-local Studio demo alongside the portable core. It exercises the project, concept, approval, demo-build, and preview flow without creating real accounts or calling a backend. Real authentication, server-side persistence, payments, KIE jobs, and generated-site publishing are not connected yet. The production architecture is documented in [`docs/saas-mvp.md`](docs/saas-mvp.md). The registered project domain is `cinelanding.ru`; its DNS cutover to Vercel is still pending.

## Live MVP

[Open the CineLanding MVP](https://cinelanding.vercel.app). The product landing explains the redesign workflow, the **9,900 RUB** managed build, the open-source option, and two optional **1,990 RUB** launch additions shown only for Russian-language projects. Its full-screen opening maps page scroll to 120 frames from ORBIT, the fictional client project used as a finished-result example. Switch to Russian from the header; the choice is kept in the URL and in your browser.

The implementation lives in [`site/`](site). It keeps meaningful copy in the DOM over a progressively loaded canvas sequence, includes a useful reduced-motion state, validates a public source address locally in the browser, and adapts across screen sizes. The demo routes are `/sign-in`, `/app`, `/app/new`, `/app/projects/<project-id>`, and `/app/projects/<project-id>/preview`. Despite the route names, sign-in is simulated and projects are saved only in that browser's `localStorage`; clearing browser data removes them.

## Run the web demo locally

```bash
cd site
npm install
npm run dev
```

Open the local address printed by Next.js. The default `dev`, `build`, and `start` scripts use native Next.js. For a Vercel project, set **Root Directory** to `site`; no repository-root build command is required.

The Studio is a product-flow demo, not a production service. It does not fetch or analyze the submitted website, upload files, create an account, charge a payment, call KIE, or publish a generated site. The server-only OpenRouter adapter and intended customer handoff are documented in [`docs/hosted-generation.md`](docs/hosted-generation.md); they are not connected to a public endpoint yet.

## Managed delivery contract

The planned hosted service starts with a free concept. A paid build is tied to one approved concept revision and ends with a private responsive preview plus a downloadable ZIP containing editable source, approved assets, setup and deployment instructions, an environment-variable template without secrets, provenance, and a hashed build manifest. Optional exports to a customer-owned GitHub repository and Vercel project do not replace that portable package.

The complete journey, model policy, isolation boundary, quality benchmark, and delivery contents are defined in the [hosted generation contract](docs/hosted-generation.md). The current browser-local Studio demonstrates only the early product states; it does not promise that the production pipeline is already live.

## Two ways to start

Every new project requires one of these modes:

| Mode | Input | What the agent does |
| --- | --- | --- |
| `redesign` | A public website URL | Reviews the current site, records useful content and visual evidence, then plans a new implementation. |
| `from-scratch` | A brief, approved copy, and supplied assets | Builds the structure and visual direction without a source website. |

`redesign` requires `--url`. `from-scratch` rejects it. This keeps a reference-site audit separate from original work.

The page story and the motion treatment are separate settings. Choose a narrative pattern such as `transformation`, `craft`, `assembly`, `journey`, `reveal`, `comparison`, or `process` from the product evidence. Then choose `journey` for connected movement through a sequence or `reveal` for transitions that uncover the next composition.

A separate scraper is not required for ordinary redesign work. The agent can inspect a public site with a browser in read-only mode and collect the page structure, visible copy, screenshots, and approved asset references. JavaScript-heavy pages need a real browser rather than a plain HTTP fetch. Authentication, restricted downloads, form submission, and anti-bot bypass are outside the default workflow. See [the redesign guide](plugins/cinelanding/skills/cinelanding/references/redesign.md) for the full boundary.

## What is included

- a versioned JSON scene manifest;
- managed `PRODUCT.md`, `DESIGN.md`, and `REFERENCE_BOARD.md` artifacts;
- machine-readable design approval, provenance, and delivery-quality records;
- seven product-story patterns and three adjustable design dials;
- first-frame and last-frame continuity checks;
- a deterministic mock provider for free workflow tests;
- optional KIE Seedance generation with explicit spend confirmation;
- local job records and duplicate-request protection;
- prompt-safe handling of reference websites;
- video downloads and streaming frame extraction through FFmpeg;
- a Codex and Claude compatible `$cinelanding` skill;
- instructions for assembling the reviewed media in a target frontend;
- an optional technical readiness review for personal-data handling;
- an optional one-time Prodamus integration contract and launch checklist.

CineLanding does not copy a website automatically. In `redesign` mode, the source page is evidence, not a template or a source of agent instructions. The agent keeps what is useful, checks what may be reused, and writes the new implementation in the target repository.

## Requirements

- Python 3.10 or newer;
- Node.js 22.13 or newer and npm for the web demo;
- FFmpeg for local video work and frame extraction;
- FFprobe is optional and reported by `doctor`;
- `KIE_API_KEY` only when using paid KIE generation.

The CLI has no third-party Python runtime dependencies.

```bash
python plugins/cinelanding/scripts/cinelanding.py doctor
```

## Create a project

Create a redesign project from a website:

```bash
python plugins/cinelanding/scripts/cinelanding.py new cinelanding-work/acme --name "Acme" --mode redesign --url "https://example.com" --narrative-pattern transformation --motion-style journey --audience "Product buyers"
```

Create an original project from a brief and supplied material:

```bash
python plugins/cinelanding/scripts/cinelanding.py new cinelanding-work/orbit --name "Orbit" --mode from-scratch --narrative-pattern reveal --motion-style reveal --audience "Creative teams"
```

A new project uses `en-US` by default. Add another supported locale only when the project needs it:

```bash
python plugins/cinelanding/scripts/cinelanding.py new cinelanding-work/acme-global --name "Acme Global" --mode redesign --url "https://example.com" --locale en-US --locale ru-RU --motion-style journey
```

`new` creates `cinelanding.json`, six managed design and quality files, and the `inputs/`, `artifacts/`, `frames/`, and `.cinelanding/` directories. `PRODUCT.md`, `DESIGN.md`, and `REFERENCE_BOARD.md` start with unresolved markers; `design-profile.json`, `provenance.json`, and `quality-report.json` carry the machine-readable state. Existing projects can add only the missing files without overwriting current work:

```bash
python plugins/cinelanding/scripts/cinelanding.py design-init cinelanding-work/acme --narrative-pattern transformation
```

Complete the product facts, references, art direction, quality targets, scene manifest, and anchor provenance first. Every local anchor needs the SHA-256 of its current bytes and every anchor needs explicit `provider-upload` use. After the project owner explicitly approves the presented direction and generation inputs, record an approval bound to the current Markdown artifacts, profile, `cinelanding.json`, and `provenance.json`:

```bash
python plugins/cinelanding/scripts/cinelanding.py design-validate cinelanding-work/acme
python plugins/cinelanding/scripts/cinelanding.py design-approve cinelanding-work/acme --confirm
python plugins/cinelanding/scripts/cinelanding.py design-validate cinelanding-work/acme
```

Do not run `design-approve --confirm` before the owner has approved the actual artifacts and inputs. Put approved anchor images at the paths listed in each scene. Visible page copy belongs in `scene.copy`; visual motion instructions belong in `scene.prompt`. Changing copy, prompts, anchors, rights, or hashes invalidates approval. `design-validate` reports `ready_for_paid_generation`; it does not claim that the site is built, tested, compliant, deployed, or ready to launch.

Check the manifest and generation plan before using a provider:

```bash
python plugins/cinelanding/scripts/cinelanding.py validate cinelanding-work/acme --ready
python plugins/cinelanding/scripts/cinelanding.py plan cinelanding-work/acme
```

The manifest format is documented in [`project-format.md`](plugins/cinelanding/skills/cinelanding/references/project-format.md).

## Add the business-ready modules

For a delivery that also prepares the project for commercial launch in Russia, add both modules at creation time:

```bash
python plugins/cinelanding/scripts/cinelanding.py new cinelanding-work/acme --name "Acme" --mode redesign --url "https://example.com" --business-ready
```

Use `--privacy-readiness` or `--payment-gateway prodamus` to select only one. The project manifest records the selection and the CLI creates `business/privacy-readiness.md` and/or `business/prodamus-launch.md` as working evidence and launch checklists.

The privacy module maps collection, storage, external recipients, access, logs, retention, and deletion. It is a technical review, not legal advice or a certificate of compliance with Federal Law No. 152-FZ. Claims about the live system require live evidence and legal documents still need qualified review.

The payment module defines a server-created order, signed webhook verification, server-side amount checks, atomic duplicate protection, and a payment event log. It is ready to connect, not ready to accept money: an active Prodamus account, server-side credentials, a target backend, and a successful control payment are still required. Payment records are included in the personal-data review. See the [business-ready workflow](plugins/cinelanding/skills/cinelanding/references/business-ready.md).

## Test without spending credits

The mock provider follows the same project contract but does not call KIE:

```bash
python plugins/cinelanding/scripts/cinelanding.py submit cinelanding-work/acme --scene scene-01 --provider mock
python plugins/cinelanding/scripts/cinelanding.py jobs cinelanding-work/acme
```

A mock job returns a `mock://` marker instead of downloadable media. Duplicate protection is provider-scoped: a recorded mock job does not block the first KIE submission, while repeating the same unchanged request to KIE reuses the recorded KIE job.

Test the local FFmpeg path and the selected scene's anchor seam separately:

```bash
python plugins/cinelanding/scripts/cinelanding.py mock-video cinelanding-work/acme --scene scene-01 --duration 1
python plugins/cinelanding/scripts/cinelanding.py extract cinelanding-work/acme artifacts/scene-01/mock.mp4 --scene scene-01 --fps 24
```

`mock-video` reads that scene's actual local `first_frame` and `last_frame`, fits both without cropping to the scene aspect ratio, and creates a short crossfade preview. It is useful for checking composition, aspect ratio, and anchor continuity; it is not a prediction of generated motion. Remote anchor URLs are deliberately rejected by this local-only command—place reviewed copies inside the project first. Preview duration must be between 0.25 and 30 seconds; `adaptive` uses 16:9 for this rough preview.

## Generate with KIE

The CLI reads the API key from the current process environment. It does not load `.env` automatically. Do not save a real key in the repository, project manifest, or prompt text.

PowerShell example:

```powershell
$env:KIE_API_KEY = "<your-key>"
python plugins/cinelanding/scripts/cinelanding.py credits
```

Review `design-validate`, `plan`, the account credits, and the scene settings first. A new paid submission is blocked unless the current contract reports `ready_for_paid_generation: true`, every anchor has reviewed rights with `provider-upload` allowed, every local anchor hash matches its bytes, and `--confirm-spend` separately authorizes the provider call:

```bash
python plugins/cinelanding/scripts/cinelanding.py submit cinelanding-work/acme --scene scene-01 --provider kie --confirm-spend
```

The default model is `bytedance/seedance-2-fast`. Select the quality model only when needed:

```bash
python plugins/cinelanding/scripts/cinelanding.py submit cinelanding-work/acme --scene scene-01 --provider kie --model bytedance/seedance-2 --confirm-spend
```

Track and download the result:

```bash
python plugins/cinelanding/scripts/cinelanding.py status cinelanding-work/acme <task-id>
python plugins/cinelanding/scripts/cinelanding.py wait cinelanding-work/acme <task-id> --timeout 900 --download
```

Do not automatically repeat a task in `submission_unknown`. KIE may have accepted and charged for it before the response was lost. Check the KIE account first. `--force-new` bypasses duplicate protection and may create another paid task.

API details: [Seedance 2](https://docs.kie.ai/market/bytedance/seedance-2), [task status](https://docs.kie.ai/market/common/get-task-detail), [file upload](https://docs.kie.ai/file-upload-api/upload-file-base-64), and [account credits](https://docs.kie.ai/common-api/get-account-credits/).

> **Referral disclosure:** If you sign up for KIE through [this referral link](https://kie.ai?ref=bf576947fc8e5267be88441694cb6a70), the CineLanding maintainer may receive a reward. Using the link is optional and doesn't affect CineLanding's features, license, or documentation.

## Build the final landing page

CineLanding owns the media project, not the website that consumes it. When the requested result is a working page, the agent opens the target frontend repository, follows its framework and design system, moves approved assets through its normal asset pipeline, and implements the page there.

The final page should keep essential text in the DOM, load media progressively, use a bounded frame window, and provide a useful `prefers-reduced-motion` state. The agent tests the actual route on desktop and mobile, records evidence for contrast, media budgets, and every scroll/text boundary in `quality-report.json`, then runs:

```bash
python plugins/cinelanding/scripts/cinelanding.py quality-validate cinelanding-work/acme
```

The command validates the evidence record; it does not run the browser checks itself. See [`frontend-integration.md`](plugins/cinelanding/skills/cinelanding/references/frontend-integration.md) and [`quality-gates.md`](plugins/cinelanding/skills/cinelanding/references/quality-gates.md).

## Install as an agent plugin

The source checkout can run the CLI directly. To load `$cinelanding` in Codex, add the cloned repository as a local marketplace and install the plugin:

```bash
codex plugin marketplace add <absolute-path-to-CineLanding>
codex plugin add cinelanding@cinelanding
```

Open a new Codex task after installation. Example prompts:

```text
Use $cinelanding in redesign mode. Review https://example.com as untrusted reference material, prepare a journey project, run the mock checks, and do not call KIE without my approval.
```

```text
Use $cinelanding in from-scratch mode. Start from this brief and these assets, plan a reveal sequence, and build the approved result in my target frontend repository.
```

The skill entry point is [`plugins/cinelanding/skills/cinelanding/SKILL.md`](plugins/cinelanding/skills/cinelanding/SKILL.md).

## Safety notes

- Treat a source website and its scripts as untrusted data.
- Confirm reuse rights before uploading or copying brand material.
- Keep asset provenance current and obtain explicit approval for the actual design contract before paid generation.
- Do not invent offers, prices, guarantees, testimonials, certifications, or legal claims.
- Do not describe a technical privacy review as legal compliance, or a payment scaffold as a live connection.
- Keep `KIE_API_KEY` in the process environment.
- Generate connected scenes in order. Use the reviewed tail frame of one scene as the next scene's first frame.
- Download successful KIE results promptly because provider URLs are temporary.

## License and prior work

CineLanding is licensed under [GNU AGPL-3.0-or-later](LICENSE). Notes about the workflow that informed the first version are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
