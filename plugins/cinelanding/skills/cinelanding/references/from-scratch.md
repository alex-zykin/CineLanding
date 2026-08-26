# Create a site from scratch

Use `from-scratch` when there is no website to study. Do not pass `--url`:

```text
CLI new cinelanding-work/orbit --name "Orbit" --mode from-scratch --motion-style reveal
```

## Start with usable inputs

Gather the material that already exists:

- the page goal and intended audience;
- the product, service, event, or idea being presented;
- approved facts, offer details, and legal constraints;
- the primary call to action;
- available copy, logos, typefaces, product images, video, and brand rules;
- required locale, route, framework, and delivery constraints;
- references the user wants to use for mood rather than content.

Do not fill missing product facts with plausible text. If a missing decision would change the offer, page structure, or visual direction, ask the user. For minor presentation choices, make a reversible choice and record it.

## Write the page outline first

Define the section order and the job of each section before generating media. Keep the visible message short enough to read during normal scrolling. Store page text in `scene.copy`, not inside a video prompt or baked into an anchor image.

Choose `journey` for one connected visual path. Choose `reveal` when the page should move through distinct compositions. Break the outline into the fewest scenes that can support the intended story and interaction.

## Prepare original anchors

Build anchor frames from supplied or clearly reusable assets. Keep logos, product geometry, colors, and layout relationships stable across connected scenes. Record uncertain licensing or provenance before uploading material to an external provider.

The first frame should match the section before a transition. The last frame should match the next settled composition. For later scenes, use the reviewed actual tail frame from the previous generated result instead of an imagined endpoint.

## Validate and assemble

Run `validate --ready`, inspect `plan`, and complete the mock path before requesting approval for KIE. Review every paid result before using it as the next anchor.

When the user wants the finished landing page, follow [frontend-integration.md](frontend-integration.md) and implement it in the target repository. The CineLanding repository currently provides the CLI and agent workflow, not a hosted site builder.
