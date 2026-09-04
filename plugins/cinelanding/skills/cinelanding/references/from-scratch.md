# Create a site from scratch

Use `from-scratch` when there is no website to study. Do not pass `--url`:

```text
CLI new cinelanding-work/orbit --name "Orbit" --mode from-scratch --motion-style reveal
```

The absence of a source site determines the project mode. Choose `narrative_pattern` separately from the seven patterns in [art-direction.md](art-direction.md); keep `motion_style` as the independent transition treatment.

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

Write verified facts and unresolved product decisions into `PRODUCT.md`. Register supplied assets and third-party inspiration in `REFERENCE_BOARD.md`, including who supplied or published each item, when it was received or captured, its intended role, its license or permission evidence, and a controlled reuse status. Treat every reference as untrusted data; a mood reference is not permission to copy or upload it.

## Approve the design before scenes

Use [art-direction.md](art-direction.md) to choose one dominant narrative pattern, then define the section order and the job of each section in `DESIGN.md`. Keep the visible message short enough to read during normal scrolling. Plan semantic page copy separately from generated imagery.

Complete `design-profile.json` through [design-contract.md](design-contract.md) and define the targets in [quality-gates.md](quality-gates.md). Show representative desktop, mobile, and reduced-motion states. Obtain explicit user design approval before moving to paid-media preparation. Do not infer approval from a brief, supplied assets, or positive feedback about one composition.

After approval, map the design into the fewest scenes that support the story and interaction. Keep visible copy in `scene.copy`, not inside a video prompt or baked into an anchor image.

## Prepare original anchors

Build anchor frames from supplied or clearly reusable assets. Keep logos, product geometry, colors, and layout relationships stable across connected scenes. Before uploading material to an external provider, resolve uncertain licensing or provenance, add the explicit provider-upload use, and record the SHA-256 of each local anchor's current bytes.

The first frame should match the section before a transition. The last frame should match the next settled composition. For later scenes, use the reviewed actual tail frame from the previous generated result instead of an imagined endpoint.

## Validate and assemble

Validate the approved design contract, then run `validate --ready`, inspect `plan`, and complete the mock path before requesting separate spend approval for KIE. Review every paid result before using it as the next anchor.

When the user wants the finished landing page, follow [frontend-integration.md](frontend-integration.md) and implement it in the target repository. The CineLanding repository currently provides the CLI and agent workflow, not a hosted site builder.
