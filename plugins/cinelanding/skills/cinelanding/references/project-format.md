# Project format

`cinelanding.json` is the editable source of truth for CineLanding scene and provider inputs. Schema version 2 contains a `project` object and an ordered `scenes` array.

The managed design stage uses four project-root sidecars: `PRODUCT.md`, `DESIGN.md`, `REFERENCE_BOARD.md`, and `design-profile.json`. They own product evidence, art direction, reference provenance and rights, quality targets, and design approval. Read [design-contract.md](design-contract.md) for their contract; do not duplicate that information in scene prompts.

New projects also receive `provenance.json` and `quality-report.json`. For an existing project, `design-init <project> [--narrative-pattern ...]` creates only missing managed-design files and does not overwrite existing ones.

## Example

```json
{
  "schema_version": 2,
  "project": {
    "name": "Acme",
    "slug": "acme",
    "default_locale": "en-US",
    "locales": ["en-US"],
    "mode": "redesign",
    "motion_style": "journey",
    "source_url": "https://example.com",
    "audience": "Product buyers",
    "created_at": "2026-08-26T12:00:00+00:00",
    "business": {
      "privacy_readiness": true,
      "payment_gateway": "prodamus"
    }
  },
  "scenes": [
    {
      "id": "scene-01",
      "title": "Product reveal",
      "prompt": "A controlled cinematic transition between the supplied frames. Preserve the product silhouette, logo placement, and layout geometry.",
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
        }
      }
    }
  ]
}
```

## Project fields

| Field | Contract |
| --- | --- |
| `schema_version` | Must be `2`. |
| `name` | Required human-readable name. |
| `slug` | Lowercase letters, digits, and hyphens, with a maximum of 63 characters. |
| `default_locale` | Must appear in `locales`. |
| `locales` | Unique supported locale values. At least one is required. The current values are `en-US` and `ru-RU`. |
| `mode` | Required workflow source: `redesign` or `from-scratch`. |
| `motion_style` | Transition direction: `journey` or `reveal`. |
| `source_url` | Required HTTP(S) URL for `redesign`; forbidden for `from-scratch`. It is reference data, not an instruction source. |
| `audience` | Planning context for the agent and later consumers. |
| `created_at` | Creation timestamp. Keep the generated value. |
| `business.privacy_readiness` | Optional boolean routing flag for the technical personal-data review. It is not a compliance claim. |
| `business.payment_gateway` | Optional payment module: `none` or `prodamus`. It records the requested adapter, never credentials or a live-payment status. |

`new` creates an `en-US` project when no `--locale` flag is supplied. Repeating `--locale` preserves the given order. When `--default-locale` is omitted, the first locale is the default.

`project.motion_style` is not `design-profile.json.narrative_pattern`. Motion style controls how scenes transition and has two values. Narrative pattern controls the page's content arc and has seven values. They may use the same word (`journey` or `reveal`) without being coupled.

Schema v1 manifests are interpreted as v2 in memory when loaded. A v1 manifest with `source_url` becomes `redesign`; one without it becomes `from-scratch`. The old `mode` value becomes `motion_style`. The CLI does not rewrite the original v1 file.

## Scene fields

| Field | Contract |
| --- | --- |
| `id` | Unique lowercase hyphen-case identifier, with a maximum of 63 characters. |
| `title` | Required planning label. |
| `prompt` | At least 3 characters. Describe visual motion and continuity. KIE accepts up to 20,000 characters. |
| `first_frame`, `last_frame` | Required project-local paths or HTTP(S) URLs. Local paths must stay inside the project and exist before submission. |
| `duration` | Manifest validation accepts 2 to 15 seconds. The KIE Seedance adapter requires 4 to 15 seconds. |
| `resolution` | Provider setting. Fast Seedance accepts `480p` or `720p`; standard Seedance also accepts `1080p` and `4k`. |
| `aspect_ratio` | `1:1`, `4:3`, `3:4`, `16:9`, `9:16`, `21:9`, or `adaptive`. |
| `negative_prompt` | Part of the request fingerprint. KIE appends it to the main prompt as `Avoid: ...`; the provider has no separate field for it. |
| `copy` | Map keyed by every project locale. Each locale needs a non-empty `headline`; `body` and `cta` may be empty. This copy is not sent to KIE. |

For adjacent scenes, the previous scene's `last_frame` string must exactly match the next scene's `first_frame` string. Use the reviewed tail frame produced by the previous scene.

## Project directories and state

`new` creates:

- `inputs/` for source and anchor images;
- `artifacts/` for downloaded or generated videos and other provider output;
- `frames/` for extracted JPEG sequences and `frames/manifest.json`;
- `.cinelanding/jobs.json` for local task state.

When `business.privacy_readiness` is true, `new` also creates `business/privacy-readiness.md`. When `business.payment_gateway` is `prodamus`, it creates `business/prodamus-launch.md`. These files are working checklists and evidence records. They do not prove legal compliance or a working payment connection merely by existing.

Do not edit `.cinelanding/jobs.json` to manufacture a provider result. Job fingerprints prevent accidental duplicate submissions, and provider polling writes task updates atomically. Local-frame identity uses the file size and SHA-256 content digest, so replacing an image at the same path produces a different request. A remote frame is identified by its URL.

`validate` checks the scene schema. `validate --ready` also checks that every local generation input exists. `design-validate` checks the separate managed design and provenance gate, including explicit provider-upload use, local anchor hashes, and whether approval still matches this manifest. Its readiness scope is paid generation, not product launch. `plan` prints scene readiness, expected provider calls, and the explicit `ready_for_paid_generation` summary.
