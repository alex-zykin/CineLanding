# Frontend integration

Use this reference after CineLanding media is reviewed and the user's requested outcome includes a working landing page. Integrate into the selected target repository; do not turn the CineLanding core repository into a hosted editor or control panel.

## Inspect the target first

Before editing, read the target repository's instructions and durable documentation. Identify its framework, package manager, routes, design system, localization strategy, asset pipeline, existing animation/media primitives, and validation commands. Preserve unrelated work and reuse existing dependencies and components unless a new production dependency is explicitly approved.

Map each CineLanding scene to a page section and decide whether its reviewed output needs continuous playback, scroll scrubbing, or a static state. Keep media files in the location and delivery system already owned by the target project.

## Choose an efficient media strategy

- Prefer an encoded video with an appropriate poster when continuous playback is sufficient. Use browser-supported formats and responsive delivery already available in the target stack.
- Use a frame sequence only when deterministic scroll scrubbing materially improves the experience. Read `frames/manifest.json` instead of guessing filenames or counts.
- Never preload or retain every decoded frame. Load a small moving window around the current scroll position, release stale decoded images, cancel obsolete requests, and keep a bounded memory budget.
- Load below-the-fold media progressively. The first useful page content and controls must not wait for the complete cinematic sequence.
- Preserve the reviewed scene order and inspect transitions at their real scroll boundaries; do not hide a bad seam with a loading flash.

## Keep copy semantic and localized

Treat `scene.copy[locale]` as the visible content source and adapt it to the target project's i18n system. Render headlines, body copy, links, and buttons as semantic DOM content rather than baking essential text into video or canvas frames.

Use the project's locale routing and `lang` behavior, fall back deliberately to `project.default_locale`, and verify both `en-US` and `ru-RU`. Allow for different line lengths and wrapping instead of forcing identical geometry. Do not translate or invent product claims without evidence and user intent.

Decorative media should not duplicate semantic announcements. If media conveys information unavailable in the DOM, provide an equivalent accessible description. Preserve keyboard navigation, visible focus, heading order, link/button semantics, and adequate contrast.

## Motion and loading fallbacks

- Respect `prefers-reduced-motion`; replace scroll-driven playback with a useful static poster or stable endpoint and keep all content accessible.
- Avoid scroll hijacking. The page must remain usable when JavaScript, autoplay, or media loading is limited.
- Keep meaningful text visible before media completion and handle loading/error states without blank sections.
- Consider mobile viewport, reduced-data conditions, and low-powered devices. Do not assume desktop decode capacity.
- If a video is decorative, keep it muted and out of the accessibility tree. If user-controlled or meaningful media is introduced, provide the controls and alternatives appropriate to the target product.

## Validate the actual page

Use the target repository's existing checks, then inspect the running page rather than stopping at a successful build:

1. verify desktop and mobile layouts in both locales;
2. verify normal motion and `prefers-reduced-motion` behavior;
3. inspect network and console output for missing or oversized assets, decoding failures, and stale requests;
4. scrub through every scene boundary and check continuity, text readability, focus, and controls;
5. confirm that initial content appears before the full media sequence downloads;
6. report the target route, files changed, checks run, and any device/browser coverage still missing.

A green media pipeline does not prove a green landing page. Completion requires the target frontend's runtime and visual behavior to be checked.
