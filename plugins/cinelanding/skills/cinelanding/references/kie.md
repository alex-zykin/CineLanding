# KIE provider

Read this file before using `credits`, `submit --provider kie`, `status`, `wait`, or `download`.

Paid submission has two independent gates: the project owner has explicitly approved the current managed design contract, and the user separately authorizes the exact KIE call. The CLI blocks KIE submission unless `design-validate` reports `"readiness_scope": "paid-generation"` and `ready_for_paid_generation: true`. That status does not mean the website is built or ready to launch. Mock submission remains available while design work is pending.

## Configuration

The CLI reads the API key from the process environment:

```text
KIE_API_KEY
```

It does not load `.env` automatically. Keep the key in the user's secret manager or shell environment. Never write it to `cinelanding.json`, source assets, prompts, logs, or committed files.

Two optional variables can point to compatible gateways:

```text
KIE_API_BASE_URL
KIE_UPLOAD_BASE_URL
```

Change them only when the user has selected a compatible endpoint.

## Generation contract

The default model is `bytedance/seedance-2-fast`:

- duration: 4 to 15 seconds;
- resolution: `480p` or `720p`;
- first and last frames are always supplied;
- audio generation is disabled.

The quality model is `bytedance/seedance-2`. It also accepts `1080p` and `4k`. Both models use the aspect ratios listed in [project-format.md](project-format.md).

When `negative_prompt` is not empty, the adapter adds it to the submitted prompt as `Avoid: ...`. KIE receives one combined prompt because it has no separate negative-prompt field. The 20,000-character limit applies to that combined text.

The adapter uploads local JPEG, PNG, and WebP anchors before generation. Each base64 upload is limited to 10 MiB. Approved HTTP(S) anchors are passed as URLs. A callback URL, when used, must be HTTPS.

Pricing is not hard-coded because it may change. Treat every KIE generation request as paid.

## Submission sequence

1. Confirm that the approved design still matches the current contract and anchor provenance:

   ```text
   CLI design-validate <project>
   ```

   Resolve every issue. Each current anchor must have reviewed source and license text, a `reuse_status` of `original`, `user-owned`, `explicit-license`, or `permission-confirmed`, and `provider-upload` in its `allowed_uses`. Every local anchor also needs a SHA-256 matching its current bytes. Records for the same `path_or_url` must agree on rights and hash. Reference-only and unresolved statuses never authorize upload. Do not run `design-approve --confirm` unless the user has already approved the presented design, current scene manifest, and provenance record.

2. Validate the media project and show the plan:

   ```text
   CLI validate <project> --ready
   CLI plan <project>
   ```

3. With `KIE_API_KEY` configured, read the balance:

   ```text
   CLI credits
   ```

4. Show the exact scene, model, resolution, duration, and number of planned calls. Ask the user to authorize that submission. Prior design approval does not authorize this spend.

5. Submit only the spend-authorized scene:

   ```text
   CLI submit <project> --scene scene-01 --provider kie --confirm-spend
   ```

   Use the quality model only when requested:

   ```text
   CLI submit <project> --scene scene-01 --provider kie --model bytedance/seedance-2 --confirm-spend
   ```

6. Save the returned `task_id`, then poll or wait:

   ```text
   CLI status <project> <task-id>
   CLI wait <project> <task-id> --timeout 900 --download
   ```

Successful result URLs are temporary. Download them promptly. `download` accepts only HTTPS URLs and writes under `artifacts/<scene-id>/`.

## Duplicate requests and timeouts

The CLI fingerprints every request and scopes duplicate lookup to the selected provider. A matching mock job does not block the first KIE submission; submitting the same unchanged request to KIE again reuses its recorded KIE job instead of creating another paid task. Local anchors are identified by their SHA-256 contents and file size, so a changed image at the same path gets a new fingerprint. `--force-new` bypasses same-provider reuse and can create another paid task. Use it only when the user intends a separate generation.

If submission times out, the CLI records `submission_unknown`. KIE may have accepted the request before the response was lost. Do not resubmit and do not use `--force-new` as a retry. Check the KIE dashboard and account history first. Continue only if the provider task can be identified or the user approves a separate attempt after reviewing the possible duplicate cost.

Polling can back off safely. `wait` grows its interval to 30 seconds and uses a 900-second timeout by default. A wait timeout does not authorize a replacement task.

## API references

- [Seedance 2 API](https://docs.kie.ai/market/bytedance/seedance-2)
- [Get task details](https://docs.kie.ai/market/common/get-task-detail)
- [Base64 file upload](https://docs.kie.ai/file-upload-api/upload-file-base-64)
- [Account credits](https://docs.kie.ai/common-api/get-account-credits/)
