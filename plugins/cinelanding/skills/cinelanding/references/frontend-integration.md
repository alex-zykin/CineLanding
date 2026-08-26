# Frontend integration

Use this reference after the media has been reviewed and the user wants a working landing page. Implement the page in the selected target repository. Do not turn the CineLanding core into a hosted editor or control panel.

## Inspect the target repository

Read its instructions and durable documentation before editing. Identify the framework, package manager, routes, design system, locale handling, asset pipeline, animation primitives, and validation commands. Preserve unrelated work. Reuse installed dependencies and existing components unless the user approves a new production dependency.

Map each CineLanding scene to a page section. Decide whether the approved output needs ordinary playback, scroll scrubbing, or a static state. Put media in the location and delivery system already used by the target project.

## Choose the media format

- Use encoded video with a poster when continuous playback is enough. Follow the target stack's existing responsive-delivery approach.
- Use a frame sequence only when precise scroll scrubbing improves the page. Read `frames/manifest.json` instead of guessing names or frame counts.
- Keep only a small window of decoded frames around the current scroll position. Release stale images and cancel obsolete requests so memory use stays bounded.
- Load media below the fold as it is needed. Initial content and controls should not wait for the full sequence.
- Check transitions at their real scroll boundaries. A loading flash should not hide a poor seam.

## Keep visible copy in the document

Use `scene.copy[locale]` as the source for visible content and adapt it to the target project's locale system. Render headings, paragraphs, links, and buttons as semantic DOM content. Do not bake essential text into video or canvas frames.

Follow the project's locale routing and `lang` behavior. Fall back to `project.default_locale` deliberately. Test every requested locale and allow for different line lengths. Do not translate or invent product claims without supporting material and user intent.

Decorative media should not repeat semantic announcements. If media carries information that the DOM does not contain, provide an accessible equivalent. Preserve keyboard navigation, visible focus, heading order, correct link and button semantics, and sufficient contrast.

## Motion and loading fallbacks

- Respect `prefers-reduced-motion`. Replace scroll-linked playback with a useful poster or stable endpoint while keeping all content available.
- Do not hijack scrolling. The page must remain usable when JavaScript, autoplay, or media loading is limited.
- Keep meaningful text visible while media loads and provide useful error states instead of blank sections.
- Account for mobile viewports, reduced-data settings, and slower devices. Do not assume desktop decoding capacity.
- Keep decorative video muted and out of the accessibility tree. Meaningful or user-controlled media needs suitable controls and alternatives.

## Test the actual route

Run the target repository's normal checks, then inspect the page in a browser:

1. check desktop and mobile layouts for every requested locale;
2. check normal motion and `prefers-reduced-motion`;
3. inspect network and console output for missing assets, excessive downloads, decode failures, and stale requests;
4. scrub through each scene boundary and review continuity, text readability, focus, and controls;
5. confirm that initial content appears before the complete media sequence downloads;
6. report the route, changed files, checks, and any browser or device coverage still missing.

A successful media pipeline does not prove that the page works. Call the task complete only after the target frontend runs and its visual behavior has been checked.
