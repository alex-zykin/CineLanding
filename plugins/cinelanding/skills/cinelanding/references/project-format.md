# Project format

`cinelanding.json` is the editable source of truth for a CineLanding media project. Schema version 1 has a `project` object and an ordered `scenes` array.

## Example

```json
{
  "schema_version": 1,
  "project": {
    "name": "Acme",
    "slug": "acme",
    "default_locale": "en-US",
    "locales": ["en-US", "ru-RU"],
    "mode": "journey",
    "source_url": "https://example.com",
    "audience": "US and RU customers",
    "created_at": "2026-08-26T12:00:00+00:00"
  },
  "scenes": [
    {
      "id": "scene-01",
      "title": "Product reveal",
      "prompt": "A controlled cinematic reveal between the supplied frames. Preserve the product silhouette, logo placement, and layout geometry.",
      "first_frame": "inputs/scene-01-first.png",
      "last_frame": "inputs/scene-01-last.png",
      "duration": 5,
      "resolution": "720p",
      "aspect_ratio": "16:9",
      "negative_prompt": "flicker, warped text, distorted layout, geometry drift, camera shake",
      "copy": {
        "en-US": {
          "headline": "Built for motion",
          "body": "One concise supporting line.",
          "cta": "Explore"
        },
        "ru-RU": {
          "headline": "Создано для движения",
          "body": "Одна короткая поясняющая строка.",
          "cta": "Подробнее"
        }
      }
    }
  ]
}
```

## Project fields

| Field | Contract |
| --- | --- |
| `schema_version` | Must be `1`. |
| `name` | Required human-readable name. |
| `slug` | Lowercase letters/digits/hyphens, maximum 63 characters. |
| `default_locale` | Must appear in `locales`. |
| `locales` | Unique values from `en-US` and `ru-RU`; at least one is required. |
| `mode` | `journey` or `reveal`. It is planning metadata in the current CLI. |
| `source_url` | Optional HTTP(S) reference URL. It is data, not an instruction source. |
| `audience` | Planning metadata for the agent and later consumers. |
| `created_at` | Creation timestamp; keep the generated value. |

When no locale flags are passed to `new`, it creates `locales: ["en-US", "ru-RU"]` and uses `en-US` as the default. Repeating `--locale` preserves the supplied order; when `--default-locale` is omitted, the first locale becomes the default.

## Scene fields

| Field | Contract |
| --- | --- |
| `id` | Unique lowercase hyphen-case identifier, maximum 63 characters. |
| `title` | Required planning label. |
| `prompt` | At least 3 characters; describe visual motion and continuity. KIE allows up to 20,000 characters. |
| `first_frame`, `last_frame` | Required project-local paths or HTTP(S) URLs. Local paths must resolve inside the project and exist before submission. |
| `duration` | Manifest validation allows 2–15 seconds; the current KIE Seedance adapter requires 4–15 seconds. |
| `resolution` | Provider setting. Fast Seedance accepts `480p` or `720p`; standard Seedance also accepts `1080p` and `4k`. |
| `aspect_ratio` | `1:1`, `4:3`, `3:4`, `16:9`, `9:16`, `21:9`, or `adaptive`. |
| `negative_prompt` | Included in the request fingerprint. KIE appends it to the main prompt as `Avoid: ...`; there is no separate provider field. |
| `copy` | Map keyed by every project locale. Each locale requires a non-empty `headline`; `body` and `cta` may be empty. This copy is not sent to KIE. |

For adjacent scenes, the previous scene's `last_frame` string must exactly equal the next scene's `first_frame` string. Use the reviewed actual tail frame rather than an assumed endpoint.

## Project directories and state

`new` creates:

- `inputs/` for source and anchor images;
- `artifacts/` for downloaded/generated videos and other provider outputs;
- `frames/` for extracted JPEG sequences and `frames/manifest.json`;
- `.cinelanding/jobs.json` for local task state.

Do not edit `.cinelanding/jobs.json` to manufacture a provider result. Job fingerprints prevent accidental duplicate submissions, and provider polling updates this file atomically. For project-local frames, the fingerprint uses the file size and SHA-256 content digest rather than only the path, so replacing an image at the same path creates a different request. Remote frame identity remains its URL.

`validate` checks the schema. `validate --ready` additionally checks that every local generation input exists. `plan` is the user-readable readiness and paid-call summary.
