# Business-ready projects

Business-ready is an optional delivery track for projects that need more than the visual landing page. It adds two independent modules:

- `privacy_readiness`: a technical review of personal-data handling, with evidence, risks, and required fixes;
- `payment_gateway: prodamus`: a target-stack implementation contract for one-time payments through Prodamus.

Enable both when creating a project:

```text
CLI new cinelanding-work/acme --name "Acme" --mode redesign --url "https://example.com" --business-ready
```

Or enable them independently:

```text
CLI new cinelanding-work/acme --name "Acme" --mode redesign --url "https://example.com" --privacy-readiness
CLI new cinelanding-work/acme --name "Acme" --mode redesign --url "https://example.com" --payment-gateway prodamus
```

The CLI creates only the selected working materials under `business/`. Do not create that directory for a project that selected neither module.

## Technical privacy readiness

Start with `business/privacy-readiness.md`. Build a data map across the complete runtime path:

1. Identify every form, account field, cookie, analytics event, uploaded file, support channel, payment field, webhook, log, export, and deletion path that can contain personal data.
2. Trace each item from collection through the API, background work, primary database, file storage, logs, analytics, provider dashboards, backups, and deletion.
3. Record evidence separately for source code and the deployed environment. Do not infer a live storage region, real database permissions, retention job, or deletion result from configuration alone.
4. Verify access by role, administrator access, secret handling, log redaction, retention periods, expiry jobs, backups, and deletion behavior.
5. For data subjects in Russia, verify where the primary collection record is stored and obtain provider evidence for the region. Flag every cross-border recipient for separate legal review.
6. Keep findings factual: evidence, risk, impact, owner, and concrete next action.

Use these states:

- `requested`: the module was selected;
- `static_reviewed`: source and configuration were reviewed;
- `live_verification_required`: claims about the running system still need evidence;
- `technical_review_complete`: code and live checks are complete;
- `legal_review_required`: documents or operator obligations need a qualified specialist.

Never use `152fz_compliant`, “fully compliant”, “certified”, or “legally safe”. The module is a technical readiness review, not legal advice, a certificate, or a guarantee that later changes remain compliant.

## Prodamus one-time payments

Start with `business/prodamus-launch.md`. Implement the adapter in the target backend; the CineLanding Python CLI is not an HTTP server or transactional payment service.

Required flow:

1. Create the internal order on the server with an immutable `order_num`, product code, amount, and currency. The browser must not define authoritative commercial fields.
2. Build or sign the provider request on the server. Keep credentials in server-side environment variables and out of the manifest, repository, prompts, screenshots, and client bundle.
3. Re-check the current [official Prodamus integration documentation](https://help.prodamus.ru/payform/integracii/rest-api/instrukcii-dlya-samostoyatelnaya-integracii-servisov), accept its documented webhook content type, enforce a request-size limit, and verify the `Sign` header with the documented HMAC algorithm and constant-time comparison. Do not implement a payment contract from this skill alone when the provider documentation differs.
4. Treat only the verified webhook as payment evidence. A success return URL never changes the internal order state.
5. Look up the order by `order_num` and verify the successful status, provider order ID, amount, currency, and expected product against server-side data.
6. In one transaction, insert a provider event protected by a unique key and move the order from `pending` to `paid`. Duplicate or concurrent delivery must fulfil once.
7. Return HTTP 500 after a database or infrastructure failure so the provider can retry. Return HTTP 200 for a confirmed duplicate.
8. Pass signature fixtures, invalid-signature, duplicate, concurrent-delivery, amount-mismatch, database-failure, and return-URL checks before launch. Then show the exact real control-payment amount and obtain explicit user authorization before making or refunding that payment.

Use these states:

- `requested`;
- `scaffolded`;
- `awaiting_credentials`;
- `test_mode`;
- `webhook_verified`;
- `control_payment_verified`;
- `ready_to_accept_payments`.

Only the last state may be shown after a verified webhook and real control payment. Never describe the initial scaffold as “payments work out of the box”.

## How the modules interact

Payment events can contain email addresses, phone numbers, order data, and attacker-controlled input. Include the order table, webhook handler, payment journal, provider account, receipt flow, logs, retention, and deletion behavior in the privacy data map.

For a valid event, retain only the fields needed for accounting, support, reconciliation, and audit; encrypt or otherwise protect sensitive payload material and limit access. For an invalid signature, prefer a hash, body size, timestamp, and field names over storing the complete untrusted body or calculated signature in ordinary logs.

## Delivery report

Report the two modules separately. For each one include:

- selected or disabled;
- implementation and evidence paths;
- current state from the lists above;
- checks completed;
- checks that require the deployed environment, provider account, real credentials, or a specialist;
- any personal-data, security, or operational risk that blocks launch.

This workflow adapts lessons from the MIT-licensed [152-FZ data-audit skill](https://github.com/imnadsa/152fz-data-audit-skill/tree/7d4351960b1a10ed3dedc9b8e9ad9a0fee47c503) and [Prodamus subscription skill](https://github.com/imnadsa/prodamus-subscription-skill/tree/a089842ff612358efeb10bf0e8a839768dd20b10). CineLanding uses an original one-time-payment contract and privacy-minimised logging for generated projects; attribution is recorded in the repository's `THIRD_PARTY_NOTICES.md`.
