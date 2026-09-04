# Hosted SaaS MVP architecture

Status: target production architecture plus an implemented local-demo baseline. The repository already contains a native Next.js App Router Studio with browser-local state. The SQL, authentication, worker, payment, KIE, storage, and generated-site publishing design below remains future work and is not a claim of legal, security, or 152-FZ compliance.

## Product and deployment boundary

CineLanding should remain two products with an explicit interface:

1. **Portable core:** the existing Python CLI, manifest rules, provider adapters, media processing, and deterministic workflow remain runnable outside the hosted service and free of Vercel, database, authentication, and storage SDKs. This is the AGPL-3.0-or-later codebase described in the [repository README](../README.md), implemented under [`plugins/cinelanding`](../plugins/cinelanding), and licensed by [`LICENSE`](../LICENSE).
2. **Hosted control plane:** a web application deployed on Vercel owns accounts, tenants, projects, quotas, billing state, durable jobs, artifact catalogues, approvals, and publication state. It invokes the portable core through a versioned command or service contract; it must not fork the core's manifest and request-fingerprint rules.

The current Studio stops before the hosted-control-plane boundary. Its `/sign-in`, `/app`, `/app/new`, project, and preview routes simulate the product flow and persist JSON only in the current browser's `localStorage`. They do not authenticate a user, fetch a source site, upload an asset, reserve spend, call KIE, run a worker, accept payment, or publish a generated site.

The process/API boundary keeps the core portable, but does not by itself decide AGPL obligations. Before public launch, document which deployed components are covered works and how users receive the corresponding source required by the applicable licence.

The recommended public boundary is:

- `cinelanding.ru` for the public marketing site;
- `app.cinelanding.ru` for authenticated SaaS.

These names are deployment configuration, not application constants. Canonical origins, callback origins, cookie scope, CORS, OAuth redirects, and generated links must come from validated environment configuration so preview deployments and future domains work safely. Prefer host-only application cookies and an explicit cross-origin allowlist; never infer tenant or trust from a hostname alone.

## Runtime shape

```text
browser
  -> Vercel web control plane
       -> SQL: identities, tenancy, projects, jobs, spend and manifests
       -> object storage: source snapshots, anchors, media and build output
       -> durable internal job dispatch
            -> isolated planning worker -> OpenRouter structured output
            -> isolated KIE worker -> KIE APIs
            -> import/inspection worker
            -> isolated build/test worker -> private artifacts
            -> publish worker -> Vercel deployment API
```

- Web requests validate, authorize, commit intent, and return quickly (`202` for asynchronous work). They do not wait for generation, media extraction, or deployment.
- SQL is the authoritative transactional ledger. A durable jobs table plus transactional outbox/claim mechanism is sufficient for the MVP; delivery is at least once, so every handler is idempotent.
- Workers claim jobs with a lease, heartbeat while active, and recover expired leases. Retry policy distinguishes safe local work, provider polling, and an ambiguous paid submission.
- The KIE worker holds the provider credential, calls the portable core contract, records the provider task ID before polling, and writes outputs to object storage. Vercel web functions never expose KIE credentials or depend on local files surviving a request.
- Object storage holds bytes; SQL holds ownership, classification, hashes, size, media type, lifecycle state, and storage keys. A successful object write is not visible to users until its SQL record is committed.
- Provider, worker, and storage interfaces should remain replaceable. The hosted database, authentication service, and object-storage vendor are deliberately **undecided** until the residency and privacy review below is complete.

OpenRouter is only the model gateway. It does not inspect source URLs safely, execute generated code, persist jobs, store artifacts, or publish deployments. The implemented server adapter and the full generation and customer handoff are defined in the [hosted generation contract](hosted-generation.md). Generated code runs as untrusted input in an isolated workspace with no production credentials or tenant-data access.

The hosted job ledger replaces `.cinelanding/jobs.json` as the authoritative SaaS state while preserving the behavior defined by the [project format](../plugins/cinelanding/skills/cinelanding/references/project-format.md) and [KIE contract](../plugins/cinelanding/skills/cinelanding/references/kie.md). Ephemeral worker workspaces may use the CLI's local layout, then upload verified outputs and be discarded.

## Identity, tenancy, and authorization

Every tenant-owned record carries `tenant_id`; project, job, artifact, manifest, reservation, publication, and payment-event uniqueness is scoped to it. Membership roles should start small (`owner`, `editor`, `viewer`) and permissions should be evaluated server-side from the authenticated membership.

For every API and worker action:

1. derive the user from the verified session and the tenant from an authorized membership, never from a trusted client claim;
2. load the target through `tenant_id` and object ID together;
3. authorize the action and current object state;
4. issue short-lived, operation-specific object URLs only after that check.

Storage paths, opaque IDs, signed URLs, and hidden UI are not authorization controls. Background jobs carry immutable tenant/project IDs and re-check that the initiating operation is still allowed before an external side effect. Administrative access is least-privilege, time-bounded where possible, and audited without logging secrets or personal payloads. Cross-tenant access and guessed-object-ID tests are release gates.

## Paid generation and idempotency

A paid request uses both a caller idempotency key and a deterministic fingerprint containing the tenant, project, scene, provider, model/options, portable-core version, and server-computed hashes of all inputs.

In one SQL transaction, the control plane must:

- lock or conditionally update the tenant's available allowance;
- create one spend reservation;
- create or reuse one generation job under unique idempotency and fingerprint constraints;
- enqueue through the durable outbox.

The worker records the transition from `reserved` to `submitting` before the external call, stores a unique provider task ID when known, and settles the reservation only from provider evidence. A timeout after submission becomes `submission_unknown`: keep the reservation, do not automatically submit again, and reconcile with KIE. Release funds only for a confirmed non-billable terminal outcome. `force new` must be a separately authorized operation with a new idempotency key and an explicit duplicate-charge warning. These rules extend the current CLI's duplicate protection rather than weakening it.

## Imports, SSRF, and content identity

All URLs, uploads, website content, and provider responses are untrusted. Apply the existing [safety boundary](../plugins/cinelanding/skills/cinelanding/references/safety.md) and add hosted controls:

- imports accept only allowed `http`/`https` schemes and ports; reject credentials in URLs;
- resolve DNS and validate every connected address and redirect, blocking loopback, private, link-local, multicast, reserved, and cloud-metadata destinations, including IPv6 and DNS-rebinding cases;
- run fetching or browser inspection in an isolated worker with restricted egress and no tenant, cloud, or operator credentials;
- cap redirects, duration, bytes, decoded image dimensions, archive expansion, and concurrency; verify media from magic bytes rather than extension or `Content-Type` alone;
- never execute imported scripts or treat page text as agent instructions; no authentication, form submission, or anti-bot bypass is part of default import;
- stream accepted bytes into object storage while computing SHA-256 on the server. Do not trust a client hash or hash a URL in place of its content;
- snapshot allowed remote assets so later generation and publication refer to immutable bytes. Keep deduplication tenant-scoped to avoid cross-tenant existence leaks.

## Immutable artifacts and publication

Artifacts are append-only content versions identified by a server-computed SHA-256 digest. Reprocessing creates a new artifact record; it never overwrites an approved input or output.

An immutable **artifact manifest** pins the project-manifest version, core version, provider request and result metadata, input and output artifact hashes, provenance, and review state. An immutable **publish manifest** pins one approved artifact manifest plus locale content, build source revision, build settings, target origin, and resulting deployment ID/hash.

Publication creates a new manifest and deployment, verifies the deployed bytes and route, then atomically moves a small mutable `active_publication` pointer. Rollback moves that pointer to a previously verified publish manifest; it does not rebuild or mutate history. Preview, approve, and publish are distinct authorized actions. Frontend output must still meet the accessibility, reduced-motion, loading, and real-route checks in the [frontend integration contract](../plugins/cinelanding/skills/cinelanding/references/frontend-integration.md).

## Commercial scope, payments, and 152-FZ review boundaries

The managed base build is 9,900 RUB. For Russian-language output only, customers may independently add the 1,990 RUB technical personal-data readiness review and the 1,990 RUB Prodamus implementation. Both are optional and off by default. A locale switch away from Russian removes them from the order. Prices live in a versioned server catalogue; the browser total is informative until the server issues an immutable quote for the approved revision.

Payment is an adapter behind the control plane, not a browser capability and not part of the CLI. The server creates the immutable order and authoritative amount/currency; credentials remain server-side. Only a size-limited, signature-verified webhook may advance payment state. Provider event IDs are unique, amount and product are checked against the order, and event insertion plus state transition occur in one transaction. A return URL is display-only. The existing [business-ready contract](../plugins/cinelanding/skills/cinelanding/references/business-ready.md) is the baseline, but current provider documentation and a real control payment must be verified before accepting money.

Before selecting SQL, authentication, or object-storage vendors, complete a technical privacy/residency review covering at least:

- every collected identity, project, source-site, prompt, upload, generated asset, payment, support, analytics, log, backup, and deletion path;
- primary-record location for Russian data subjects, processor and subprocessor regions, administrator access, cross-border transfers, retention, backups, export, and deletion evidence;
- Vercel-hosted compute and logs, the chosen auth/database/storage services, email/analytics providers, and KIE uploads and dashboards as separate recipients;
- minimisation and classification rules that prevent personal or confidential media from reaching KIE by default without an explicit permitted workflow;
- operator documents, consents, contracts, and legal review outside the codebase.

This produces evidence and open risks, not a `152-FZ compliant` flag or guarantee. Vendor selection is blocked until the review records acceptable regions, contractual evidence, deletion behavior, and remaining legal decisions. Vercel remains the intended web/deployment platform, but its actual data flows must be included in the same review.

## Current-site migration

The current [`site/`](../site) is now a native Next.js App Router baseline for Vercel. Its default `dev`, `build`, and `start` scripts run Next.js, and it includes the public showcase plus the browser-local Studio routes. For local work:

```bash
cd site
npm install
npm run dev
```

Set the Vercel project's **Root Directory** to `site`. The legacy `dev:vinext`, `build:vinext`, and `start:vinext` commands remain available for the previous OpenAI Sites/Cloudflare path. Their Vite configuration and development dependencies are not a production backend and must not become dependencies of the native Vercel request path.

The native deployment is live at [`cinelanding.vercel.app`](https://cinelanding.vercel.app). Vercel built the project with the Next.js preset and no Cloudflare runtime dependency; desktop, mobile, reduced-motion, public, Studio, and local-preview paths were smoke-tested on the deployed origin. Custom-domain DNS, canonical-origin settings, and redirects still need a separate check before moving `cinelanding.ru`.

## Delivery phases and acceptance gates

### 0. Decisions and contracts

**Status:** in progress. The portable-core boundary and local-demo behavior are explicit; production vendors, the data map, residency evidence, worker contract, and source-delivery review are still open.

Define the control-plane/core interface, threat model, data map, licensing boundary, environments, and configurable origins. Run the residency/privacy review before choosing auth, SQL, or storage vendors.

**Gate:** approved architecture decisions; documented data recipients and regions; vendor choices justified by evidence; AGPL source-delivery plan reviewed; no production personal data or paid calls.

### 1. Vercel marketing migration

**Status:** deployed and smoke-tested on Vercel. Native Next.js scripts, the existing showcase, and browser-local Studio routes are present. The vinext commands remain as an explicitly named legacy path.

The `site` root is linked to the Vercel project `cinelanding`. Configure the recommended domains only after the owner accepts the deployed MVP and the canonical-origin/DNS checks pass.

**Remaining gate:** verify custom-domain ownership, DNS, canonical URLs, redirects, and final owner acceptance before moving `cinelanding.ru`. Repeat the build and browser checks after any domain-sensitive change.

### 2. Tenant-safe control plane

**Status:** not implemented. The current browser-local Studio is a UX and state-transition demo, not an account or tenant boundary.

Add authentication, memberships, projects, SQL state, direct-to-storage uploads, safe URL import, audit events, and mock-only asynchronous jobs.

**Gate:** object-level authorization and cross-tenant denial tests pass; SSRF/redirect/rebinding and hostile-upload fixtures pass; worker restart and duplicate-delivery tests pass; retention/deletion behavior is demonstrable in a preview environment.

### 3. Structured planning and code generation

**Status:** server adapter implemented and tested at the mocked HTTP boundary; no public endpoint or paid call is enabled. The current model policy pins planning, building, and escalated review stages and rejects a client-supplied model.

Add immutable input packages, prompt/version records, output-schema validation at each consumer, durable generation records, isolated build workspaces, bounded repair, usage reconciliation, and the golden-set quality benchmark in the [generation contract](hosted-generation.md).

**Gate:** hostile source instructions do not enter system prompts; retries are idempotent; keys are absent from clients and logs; tariff ceilings plus project spend reservations fail closed; generated source cannot reach production secrets or metadata; clean install/build and the [Codex-reviewed golden set](generation-quality-benchmark.md) pass on real browser output.

### 4. KIE generation

**Status:** not implemented in the hosted service. Provider and worker decisions remain blocked by the production data-flow, residency, and security review.

Add spend reservations, idempotent job dispatch, the isolated KIE worker, reconciliation, and immutable artifact manifests. Start with the CLI mock provider, then use a separately authorized low-cost KIE test.

**Gate:** concurrent duplicate requests create one reservation and at most one paid submission; `submission_unknown` never auto-retries; provider task/result reconciliation and hash verification pass; secrets and payloads are absent from client bundles and ordinary logs.

### 5. Build and publish

**Status:** not implemented. The local demo build creates preview metadata only; it does not run a frontend worker or call the Vercel deployment API.

Create preview, approval, immutable publish manifests, Vercel deployment, custom-domain attachment, and manifest-based rollback.

**Gate:** only approved hashes publish; the deployed route matches its manifest; failed deploys never move `active_publication`; rollback restores a prior verified deployment; accessibility, loading, motion, locale, and mobile checks pass on the actual URL.

### 6. Payments and controlled launch

**Status:** not implemented. Payment-provider selection and production activation remain separate decisions after the technical and legal review.

Implement the selected payment adapter, operational monitoring, support access, backup/restore, retention/deletion jobs, incident handling, and launch documentation.

**Gate:** signature, tampering, duplicate/concurrent webhook, amount mismatch, database failure, and return-URL tests pass; an explicitly authorized control payment reconciles once; backup restore and deletion evidence are reviewed; privacy and legal open items are recorded without compliance claims.

Production domain cutover, live payments, and broad customer onboarding are separate launch decisions after all applicable gates pass.
