# KIE provider

Read this reference before using `credits`, `submit --provider kie`, `status`, `wait`, or `download`.

## Configuration

The CLI reads the API key only from the process environment:

```text
KIE_API_KEY
```

It does not load `.env` automatically. Keep the key in the user's secret manager or shell environment; never write it to `cinelanding.json`, source assets, prompts, logs, or committed files.

Two optional environment variables can point at compatible gateways:

```text
KIE_API_BASE_URL
KIE_UPLOAD_BASE_URL
```

Do not override them unless the user intentionally selected a compatible endpoint.

## Supported generation contract

The default model is `bytedance/seedance-2-fast`:

- duration: 4–15 seconds;
- resolution: `480p` or `720p`;
- first and last frame are always supplied;
- audio generation is always disabled.

The quality model is `bytedance/seedance-2` and additionally accepts `1080p` and `4k`. Both models use the aspect ratios listed in [project-format.md](project-format.md).

When `negative_prompt` is non-empty, the adapter appends it to the submitted prompt as `Avoid: ...`. KIE receives one combined prompt, not a separate negative-prompt field; the 20,000-character maximum applies after combining them.

Local JPEG, PNG, and WebP anchors are uploaded before generation. The base64 upload limit enforced by the adapter is 10 MiB per image. Approved HTTP(S) anchors are passed as URLs. A callback URL, when used, must be HTTPS.

Provider pricing is deliberately not hard-coded because it can change. Treat every KIE generation submission as paid.

## Safe submission sequence

1. Validate and show the plan:

   ```text
   CLI validate <project> --ready
   CLI plan <project>
   ```

2. With `KIE_API_KEY` configured, read the balance:

   ```text
   CLI credits
   ```

3. Show the user the exact scene, model, resolution, duration, and number of planned calls. Obtain explicit authorization for the submission.

4. Submit only the authorized scene:

   ```text
   CLI submit <project> --scene scene-01 --provider kie --confirm-spend
   ```

   Select the quality model only when requested:

   ```text
   CLI submit <project> --scene scene-01 --provider kie --model bytedance/seedance-2 --confirm-spend
   ```

5. Record the returned `task_id`, then poll or wait:

   ```text
   CLI status <project> <task-id>
   CLI wait <project> <task-id> --timeout 900 --download
   ```

Successful result URLs are temporary external artifacts. Download them promptly. `download` accepts only HTTPS URLs and writes under `artifacts/<scene-id>/`.

## Duplicate and timeout rules

The CLI fingerprints each request. Repeating the same request reuses its recorded job instead of creating a second task. Local anchor identity is based on SHA-256 file contents and size, so changing the image at the same path produces a new fingerprint. `--force-new` bypasses reuse even when the fingerprint is unchanged and can create another paid task; use it only after the user explicitly intends a new generation.

If submission times out, the CLI records `submission_unknown` because KIE may have accepted the request before the response was lost. Never resubmit automatically and never add `--force-new` as a retry. Inspect the KIE dashboard/account history first. Resume only if a provider task ID can be identified or the user explicitly authorizes a separate new attempt after reviewing possible duplicate cost.

Polling can safely back off; the CLI `wait` interval grows to 30 seconds and defaults to a 900-second timeout. A wait timeout is not authorization to create a replacement task.

## Authoritative API references

- [Seedance 2 API](https://docs.kie.ai/market/bytedance/seedance-2)
- [Get task details](https://docs.kie.ai/market/common/get-task-detail)
- [Base64 file upload](https://docs.kie.ai/file-upload-api/upload-file-base-64)
- [Account credits](https://docs.kie.ai/common-api/get-account-credits/)
