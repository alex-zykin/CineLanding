# Hosted generation and delivery contract

This document describes the intended managed CineLanding service. It is not a claim that the current browser-local Studio already performs these steps. Until authentication, durable storage, isolated workers, payment, and publishing are connected, the Studio remains a product-flow demo.

## What the customer buys

The free result is a concept: a proposed page story, visual direction, copy outline, and a representative preview. It lets a customer decide whether the direction is worth producing without pretending that a finished site already exists.

The managed base project costs **9,900 RUB** and produces one approved, responsive landing page with one scroll-linked cinematic sequence. For a Russian-language site, the customer may independently add:

- a technical personal-data readiness review for **1,990 RUB**;
- a Prodamus integration implementation for **1,990 RUB**.

Both additions are off by default. The privacy work is a technical review and implementation checklist, not legal advice or a compliance certificate. The Prodamus work supplies the integration code and payment contract; an active merchant account, production credentials, a backend, and a successful control payment are still required before accepting money.

The browser may show an estimate, but the server must create the authoritative, versioned quote immediately before payment. The order records the catalogue version, currency, selected items, approved concept revision, and total in minor units. Changing any of those inputs invalidates the old quote.

Cancellation, refund, delivery-time, revision, support, and failed-generation terms must be published and accepted before live payment is enabled.

## Customer journey

1. The customer signs in and chooses either a redesign from a public URL or a new site from a brief and supplied assets.
2. An isolated importer gathers permitted public evidence. It never treats page text as instructions and never logs in, submits forms, or bypasses access controls.
3. CineLanding creates a free concept. The customer can adjust the brief and approve one exact revision.
4. The server creates a fixed quote. Payment covers that approved scope, not an unspecified future result.
5. Durable workers produce the page plan, media, source project, and private preview. Every paid provider call is reserved and idempotent.
6. The customer reviews the real responsive preview and receives one consolidated correction round within the agreed scope.
7. After final approval, CineLanding freezes a delivery manifest and makes the package available to download. Publishing is a separate, explicit action.

The guaranteed handoff is the private preview plus a downloadable ZIP. A managed order may also include one export to a repository owned by the customer, one Vercel deployment, and connection of one customer-owned domain when account access and DNS are available. These destinations are conveniences; they do not replace the ZIP.

## Delivery package

The ZIP is usable without CineLanding and contains:

- editable source code and locally held, licensed project assets;
- the exact dependency lockfile and build scripts;
- `README` setup, build, deployment, and rollback instructions;
- `.env.example` containing names and explanations, never values;
- the approved copy and design contract;
- asset provenance and licence notes;
- a machine-readable build manifest with source, artifact, and approval hashes;
- the latest accessibility, responsive, reduced-motion, and performance checks;
- selected Russian-language add-on reports, when purchased.

Provider source URLs and signed storage links are not delivery artifacts. CineLanding stores immutable copies of approved outputs and verifies hashes before including them. Generated source must not depend on an undocumented CineLanding-only service to render the public page.

## Generation stages

The product uses several bounded stages instead of asking one model to invent and publish a site in a single prompt:

1. **Evidence normalisation:** deterministic code converts approved source evidence and the customer brief into a size-limited fact package. Instructions found in source pages are discarded.
2. **Planning:** a fast model returns a strict JSON page specification: audience, offer, proof, narrative pattern, sections, copy constraints, asset plan, and scroll beats.
3. **Build:** a coding model turns only the approved specification and allowed assets into source files in an isolated workspace.
4. **Deterministic validation:** install, typecheck, lint, build, file allowlists, secret scans, dependency policy, accessibility checks, mobile checks, media budgets, and route smoke tests run without trusting the model.
5. **Repair:** bounded build errors may be sent back with redacted diagnostics. Each attempt has a token, time, and cost ceiling.
6. **Review:** expensive model review is an escalation for ambiguous visual or content failures, never the authority for security, payment, privacy, or publication.
7. **Approval and publish:** only immutable artifacts tied to the approved revision can enter a private preview or publication manifest.

AI-generated code is untrusted. It must run in an isolated environment without production credentials, tenant databases, cloud metadata access, or unrestricted network egress. The first hosted release should generate static landing sites only. Customer-defined server code is out of scope.

## OpenRouter model policy

The server adapter lives in [`site/lib/server/openrouter.mjs`](../site/lib/server/openrouter.mjs). It deliberately accepts a stage rather than a client-supplied model name. The current policy is:

| Stage | Model | Reason |
| --- | --- | --- |
| Planning | `google/gemini-3.7-flash` | Fast, multimodal planning at a controlled cost. |
| Build and repair | `openai/gpt-5.6-sol` | Main coding model for complex agentic implementation. |
| Escalated review | `anthropic/claude-opus-5` | Reserved for difficult reviews where the cheaper deterministic path is inconclusive. |

Every call requests strict structured output, validates the returned object again locally, requires a provider that supports the requested parameters, denies providers that collect data, requests zero-data-retention routing, and disables provider fallback. It also sets a ceiling on the provider's advertised per-million-token rate. That ceiling is not a total-spend limit: project reservations, concurrency limits, and idempotency belong to the durable control plane. The adapter uses native `fetch`, applies a bounded deadline and response-size limit, returns normalised output and usage only, and does not expose the API key or raw provider errors.

Only explicitly classified public or synthetic input can cross this adapter today. Personal, confidential, or unclassified input fails before the network call. ZDR is not Russian data localisation and the paid 152-FZ readiness option does not change this platform boundary. A future relaxation requires an approved processor/region allowlist, documented data flow, and legal review.

Model identifiers, availability, capabilities, and prices can change. Before a production release, rerun the quality and cost benchmark, confirm provider support for structured output and ZDR, and update the pinned policy deliberately. Do not silently route to an arbitrary model when the chosen one is unavailable.

The local environment template is [`site/.env.example`](../site/.env.example). `OPENROUTER_API_KEY` is server-only and must never use a `NEXT_PUBLIC_` prefix. The adapter is implemented and tested with a mocked HTTP boundary; no public generation endpoint is exposed yet, and no paid model call has been made without a configured key.

## Quality benchmark

Before enabling paid generation, run the versioned [generation quality benchmark](generation-quality-benchmark.md) across unrelated niches. It covers redesign and from-scratch inputs, Russian and English output, sparse evidence, regulated claims, poor images, and hostile prompt-like page text.

Codex is an independent development reviewer, not a hidden runtime dependency. For each candidate model or prompt revision it reviews the generated repository and the real browser result against the same evidence:

- facts and claims stay within the approved source package;
- the page story fits the niche instead of forcing one transformation pattern everywhere;
- scroll motion and changing copy tell one coherent sequence;
- the source installs and builds from the delivery instructions;
- desktop, mobile, keyboard, reduced-motion, image-loading, and error states work;
- no secrets, external trackers, undeclared dependencies, or remote hotlinks enter the delivery;
- build time, tokens, provider spend, retries, and failure causes remain within the product margin.

A visually attractive screenshot is not a pass. Any invented commercial claim, copied restricted asset, failed clean build, secret exposure, inaccessible core flow, broken reduced-motion state, uncontrolled external request, or mismatch with the approved revision blocks delivery.

## Sources and volatile assumptions

The implementation choices above rely on the provider documentation current on 4 September 2026:

- [OpenRouter quickstart](https://openrouter.ai/docs/quickstart)
- [OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs)
- [OpenRouter provider routing](https://openrouter.ai/docs/guides/routing/provider-selection)
- [OpenRouter privacy and data collection](https://openrouter.ai/docs/guides/privacy/data-collection)
- [OpenRouter zero data retention](https://openrouter.ai/docs/guides/features/zdr)
- [Vercel Sandbox](https://vercel.com/docs/sandbox)
- [Vercel guidance for running AI-generated code safely](https://vercel.com/kb/guide/running-ai-generated-code-sandbox)

OpenRouter is an inference gateway, not a build sandbox, durable job system, artifact store, or deployment service. Those responsibilities stay in the control plane and isolated workers described in [the SaaS architecture](saas-mvp.md).
