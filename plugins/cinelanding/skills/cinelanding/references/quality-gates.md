# Design and implementation quality gates

Use these gates twice:

1. before design approval, to make every target explicit and testable in `DESIGN.md`;
2. after frontend implementation, to verify the actual route with runtime evidence.

At design approval, a `true` value in `design-profile.json.quality_targets` means the project has a concrete acceptance contract for that concern. It does not mean an unbuilt page has passed. The exact keys are `desktop`, `mobile`, `reduced_motion`, `contrast`, `media_budget`, and `scroll_transitions`. After implementation, record actual results in `quality-report.json` with screenshots, measurements, or browser observations.

## Required targets

### Desktop

Name the representative desktop viewport or range and define the intended grid, maximum content width, media crop, focal point, text measure, CTA visibility, and pinned or sticky behavior. The review must cover the opening state, each settled section, and transition boundaries. Pass only when there is no unintended overflow, clipping, collision, blank media state, or loss of hierarchy at the named sizes.

### Mobile

Name at least one narrow mobile viewport and define deliberate reflow, media crop or alternate asset, text order, tap behavior, and any replacement for desktop-only pinned choreography. Scaling the desktop composition down is not a mobile contract. Pass only when primary content and actions remain visible, readable, operable, and free of horizontal overflow throughout the route.

### Reduced motion

Define the `prefers-reduced-motion: reduce` state for every scroll-linked or autoplay sequence. Use a useful poster, stable endpoint, or discrete non-motion state; keep the complete reading order and all actions available. Pass only when disabling motion does not leave blank space, hidden copy, an inaccessible scene, or a control that depends on scrubbing.

### Contrast

List the important foreground/background pairs, including text over the lightest and darkest media frames and during crossfades. Measure the worst intended state, not only a clean mockup. Unless the target product specifies a stronger standard, meet WCAG AA contrast: 4.5:1 for normal text and 3:1 for large text and meaningful UI graphics. Do not rely on a transient overlay that disappears during motion.

### Media budgets

Write numeric budgets before implementation. Include, by target breakpoint where they differ:

- maximum initial media transfer before useful content is visible;
- maximum total media transfer for the route's normal first visit;
- maximum single poster, video, or frame asset size;
- decoded-frame or concurrent-frame window limit for scrubbing;
- preload, lazy-load, cancellation, and fallback behavior.

There is no silent universal budget for every cinematic page. Propose limits from the target audience, likely devices, hosting, and visual benefit, then record the accepted numbers in `DESIGN.md`. At delivery, measure network transfer and runtime behavior against those numbers. A page that eventually loads but exceeds its approved budget fails this gate.

### Scroll and text transitions

Define where each text block enters, remains stable, and exits relative to the visual scene. Essential copy stays semantic DOM content and must never exist only in a canvas, video, or generated frame. Ensure that:

- a normal scrolling reader gets a stable readable interval for every message;
- outgoing and incoming copy do not become simultaneously unreadable or overlap the primary focal object;
- fast and reverse scrolling settle into deterministic states;
- pinned regions release correctly and do not trap ordinary page scrolling;
- links, buttons, selection, focus, and keyboard behavior remain usable during transitions;
- reduced motion uses an immediate or simple discrete state rather than scrubbed opacity or position.

Pass only after reviewing every boundary in both directions on the named desktop and mobile viewports.

## Approval evidence

Before asking for design approval, present:

- the three ready Markdown artifacts and `design-profile.json`;
- representative desktop and mobile compositions;
- the reduced-motion state;
- the planned text-to-scroll states;
- explicit media budgets and the contrast measurements or planned color pairs;
- unresolved factual, licensing, or implementation risks.

After implementation, run the target repository's checks and inspect the real route. Record actual viewport sizes, reduced-motion setting, network measurements, contrast results, scene-boundary observations, console errors, and any device coverage still missing. A build-only check is insufficient for these gates.

## `quality-report.json`

The CLI creates a schema-version-1 report with the project slug and one record per exact check key. Leave a check `pending` until it has been run against the real implementation. Use `passed` only with at least one non-empty evidence item; a failed or unresolved check is not ready regardless of how it is described.

```json
{
  "schema_version": 1,
  "project": "acme",
  "checks": {
    "desktop": {
      "status": "passed",
      "evidence": ["Reviewed / at 1440x900; no overflow and every scene boundary settled correctly."]
    },
    "mobile": {
      "status": "passed",
      "evidence": ["Reviewed / at 390x844; alternate crops and CTA order match DESIGN.md."]
    },
    "reduced_motion": {
      "status": "passed",
      "evidence": ["Browser emulation showed the approved poster states and all DOM copy."]
    },
    "contrast": {
      "status": "passed",
      "evidence": ["Measured every DESIGN.md color pair, including the worst media-overlay frame."]
    },
    "media_budget": {
      "status": "passed",
      "evidence": ["Cold-load network trace stayed within the approved initial and total byte limits."]
    },
    "scroll_transitions": {
      "status": "passed",
      "evidence": ["Reviewed all boundaries forward, reverse, and with fast scrolling on both target viewports."]
    }
  }
}
```

Evidence must identify the route, viewport or environment, method, and observable result where relevant. Do not write a generic claim such as “looks good.” Validate the completed report with:

```text
CLI quality-validate <project>
```

The command succeeds only when every required check is `passed` and has evidence. It validates the report contract; it does not run a browser or measure the page for the agent.
