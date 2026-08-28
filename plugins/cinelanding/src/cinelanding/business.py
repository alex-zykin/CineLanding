from __future__ import annotations

from pathlib import Path

from .models import Project


PRIVACY_REPORT = """# Privacy readiness

Status: `requested`

This is a technical readiness review, not a legal opinion, compliance certificate, or guarantee of compliance with Federal Law No. 152-FZ.

## Review scope

- Map every place where personal data is collected, sent, stored, logged, exported, or deleted.
- Record the real recipients, storage regions, subprocessors, and administrator access.
- Check authentication, authorization, retention, deletion, backups, logs, analytics, and error reporting.
- Include payment forms, webhook payloads, receipts, support requests, and provider dashboards in the data map.
- Separate evidence found in code from facts verified in the live environment.

## Evidence register

| Area | Evidence | State | Risk or required action |
| --- | --- | --- | --- |
| Collection points | Not reviewed | Code review required | |
| Primary storage and region | Not verified | Live verification required | |
| Third-party recipients | Not reviewed | Code and account review required | |
| Access and administrator roles | Not verified | Live verification required | |
| Retention and deletion | Not verified | Policy and live verification required | |

## Completion boundary

Do not mark this review complete from source code alone. Verify the deployed API, database permissions and region, storage, background jobs, logs, expired-data counts, and deletion behavior. A qualified specialist must review legal documents, notices, consent wording, and operator obligations before launch.
"""


PRODAMUS_LAUNCH = """# Prodamus launch checklist

Status: `awaiting_credentials`

The project is prepared for a one-time Prodamus integration. It is not ready to accept payments until the target backend is implemented, merchant credentials are configured, and a real control payment succeeds.

## Required implementation

- Create the order on the server with an immutable internal `order_num`, product code, amount, and currency.
- Build or sign the payment request on the server. Never trust price or product fields supplied by the browser.
- Treat only a verified webhook as the payment source of truth. The success return URL must not mark an order as paid.
- Verify the `Sign` header with the provider algorithm and a constant-time comparison.
- Match the webhook to the internal order and verify status, provider order ID, product, amount, and currency.
- Apply the payment and insert a unique event in one transaction so duplicate or concurrent delivery cannot fulfil twice.
- Return HTTP 500 after infrastructure or database failure so the provider can retry. Return HTTP 200 for a confirmed duplicate.
- Keep secrets in server-side environment variables and never write them to this manifest, source control, client code, or ordinary logs.

## Data handling

Payment payloads and the payment journal may contain personal data. Add them to `privacy-readiness.md`, restrict access, define a retention period, and avoid storing a raw invalid payload when a hash and field metadata are enough for diagnosis.

## Launch evidence

- [ ] Active Prodamus merchant account
- [ ] Server-side credentials configured
- [ ] Signature fixtures pass for Cyrillic text and URLs
- [ ] Invalid and missing signatures are rejected
- [ ] Duplicate and concurrent webhooks fulfil once
- [ ] Database failure returns HTTP 500
- [ ] Return URL does not change payment state
- [ ] Verified webhook changes the internal order from pending to paid
- [ ] Exact control-payment amount approved by the project owner
- [ ] One real control payment and refund path are checked

Only after these checks may the project show `ready_to_accept_payments`.
"""


def write_business_materials(root: Path, project: Project) -> list[Path]:
    materials: list[tuple[str, str]] = []
    if project.privacy_readiness:
        materials.append(("privacy-readiness.md", PRIVACY_REPORT))
    if project.payment_gateway == "prodamus":
        materials.append(("prodamus-launch.md", PRODAMUS_LAUNCH))
    if not materials:
        return []

    output = root / "business"
    output.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for name, contents in materials:
        path = output / name
        if not path.exists():
            path.write_text(contents, encoding="utf-8")
        written.append(path)
    return written
