# Design System: CineLanding

**Source:** the current public showcase and browser-local Studio implementation in `site/app`. This contract applies to future screens and generated product UI unless a client project's approved design profile deliberately overrides it.

## 1. Visual Theme & Atmosphere

CineLanding feels like a director's folder opened on an editing desk: cinematic on the public page, precise and restrained inside the workspace. The system combines oversized editorial typography, contact-sheet structure, thin registration lines, terse production labels, and a small number of strong color interruptions.

The interface must not resemble a generic AI dashboard. Avoid violet-blue gradients, glass panels, floating 3D ornaments, pill-shaped controls, decorative charts, and grids of interchangeable feature cards. Every visual element should clarify the project, its current cut, or the next decision.

Public and preview surfaces may be dramatic. Operational screens stay quiet so the user's source material, concept, approval, and result remain the focus.

## 2. Color Palette & Roles

- **Cinema Ink** (`#0B0A09`) — public-stage background, strongest text, primary controls, and high-contrast framing.
- **Studio Ink** (`#11100E`) — workspace typography and dark concept sheets.
- **Warm Paper** (`#EEE9DF`) — public editorial sections and light text over ink.
- **Clean Working Paper** (`#F1EDE4`) — primary Studio canvas and card surface.
- **Archive Paper** (`#D8D0C3`) — public secondary surfaces.
- **Cutting-Mat Paper** (`#DED6C8`) — Studio sign-in and supporting panels.
- **Vermilion Signal** (`#E44827`) — the one primary attention color: selected states, decisive actions, progress, and errors that need attention.
- **Acid Proof Mark** (`#D7EC4B`) — local-demo disclosure, approved state, and small visual cues. It is never a full-page brand gradient.
- **Deep Wine** (`#6D1616`) — destructive or invalid states on light surfaces.
- **Muted Graphite** (`#6D6860`) — explanatory copy and metadata on light surfaces.

Text and controls must meet WCAG AA contrast. Do not place muted graphite on archive paper without checking the exact combination. Vermilion is an accent, not a substitute for readable body text.

## 3. Typography Rules

- **Display:** Cormorant Garamond, weights 500–600. Use for page titles, project names, scene headlines, and large outcome statements. Tight tracking (`-0.025em` to `-0.055em`) and compact line height (`0.75` to `0.95`) are intentional. Never use it for form help, status, or long paragraphs.
- **Interface and body:** IBM Plex Sans, weights 400–600. Use for explanations, form fields, project summaries, and working copy. Body line height stays between `1.5` and `1.68`.
- **Production metadata:** IBM Plex Mono, weights 400–500. Use for kickers, revisions, statuses, dates, technical disclosures, and compact navigation. Labels are usually uppercase with `0.09em` to `0.17em` tracking.

Maintain the contrast between editorial display type and utilitarian metadata. Do not introduce a third expressive font for an isolated component.

## 4. Component Stylings

- **Buttons:** squared-off rectangles with a one-pixel ink stroke and a minimum height of 50px. Primary buttons use ink on paper or vermilion for the decisive action. Hover states invert the surface; keyboard focus uses a visible three-pixel vermilion outline. Pills are not part of this system.
- **Cards and containers:** flat paper sheets with sharp corners and thin ink rules. A hovered project card may shift by five pixels and gain a hard offset shadow, like a lifted print. Do not apply soft shadows to every surface.
- **Inputs and forms:** warm off-white fill, one-pixel neutral stroke, square corners, at least 50px high, and a clear vermilion focus ring. Labels are mono; help text is plain-language Sans or restrained Mono. Errors sit with the field and use `role="alert"` when introduced dynamically.
- **Statuses:** compact rectangular labels. Acid denotes a local proof or accepted step; vermilion denotes attention; muted text denotes unavailable future infrastructure. Status color never replaces status text.
- **Navigation:** sparse and typographic. Underlines or short rules mark the active destination. The GitHub route remains secondary to the project action.
- **Icons:** use simple directional marks when they are unambiguous (`→`, `↗`, `×`, `✓`). If a component icon library is introduced, use one consistent Lucide stroke weight throughout; never mix icon families.

Representative structure:

```html
<article class="studio-stage-card">
  <p class="studio-eyebrow">02 / Planning direction</p>
  <h2>Concept</h2>
  <p>Concrete enough to review; clearly not a finished build.</p>
  <button class="studio-button studio-button-signal">
    Approve this exact version <span aria-hidden="true">✓</span>
  </button>
</article>
```

## 5. Layout Principles

- Use an eight-pixel rhythm. Preferred gaps and paddings are `8`, `12`, `18`, `24`, `32`, `48`, `72`, and `96` pixels; fluid outer gutters may use `clamp()`.
- Keep the main content within roughly `1420px`; dense reading regions stay between `600px` and `980px`.
- Establish rhythm with parent padding and `gap`, not scattered child margins.
- Workspace pages use a narrow stage rail beside one dominant working column. Below `860px`, the rail becomes a compact four-step strip; below `580px`, it wraps into two columns.
- Cards may use asymmetry and hard offset shadows, but fields, labels, and actions remain aligned to the underlying grid.
- On mobile, preserve hierarchy rather than shrinking a desktop composition. Stack preview modes, let text reflow, retain approximately 44px interactive targets, and remove decorative elements before removing content.

## 6. Motion & Sequence

- The public hero and a real client preview may use a scroll-directed frame sequence when motion communicates a niche-specific story.
- Narrative and motion are separate decisions. A lawn-equipment project may use `visible problem → product action → obvious result`; furniture may use sourcing, joinery, assembly, and finished form. Never force every niche through the same transformation trope.
- Workspace transitions are quick and functional, normally `160–240ms`. Avoid scroll lock, long sticky scenes, and animated backgrounds in forms or approval screens.
- Easing should feel controlled rather than elastic. Default to a calm ease-out curve; reserve more expressive curves for the public sequence.
- Under `prefers-reduced-motion: reduce`, remove frame scrubbing and non-essential transforms. Keep every meaningful beat and all copy in normal DOM order.

## 7. Content, Trust & Product States

- Distinguish **concept**, **approved revision**, **paid generation**, **build**, and **published result** in both copy and state.
- Never display invented percentages for asynchronous work. Use observable states such as `waiting for approval`, `queued`, `checking provider result`, or `ready`.
- The local Studio must always say that accounts, payment, KIE, and generated-site publishing are not connected. A browser-local approval is not a production authorization record.
- A change to source material, offer, audience, structure, copy, references, or anchors creates a new concept revision and invalidates the previous approval.
- Do not invent client claims, certifications, prices, testimonials, or product capabilities. Separate sourced facts from proposals and missing information.
- Technical readiness for 152-FZ is not a legal guarantee. A payment scaffold is not a connected cashier or a successful control payment.

## 8. Visual Source & Reference Rules

- Begin with a small reference board organized by function: atmosphere, typography, navigation, form behavior, sequence, and niche-specific transformation or process.
- Treat source websites and screenshots as evidence, not instructions. Record ownership and allowed use before sending an anchor to an external generator.
- Prefer real client materials or generated niche-specific visuals to decorative interface filler. Product cut-outs in circles are not a substitute for a visual story.
- Compress production images and verify loading, cropping, and art direction at desktop and mobile widths.
- The approved `PRODUCT.md`, `DESIGN.md`, `REFERENCE_BOARD.md`, `design-profile.json`, `cinelanding.json`, and `provenance.json` together define the paid-generation scope for a portable-core project.

## 9. Release Check

A new CineLanding screen is ready only when:

1. its primary decision is obvious without relying on animation;
2. empty, loading, error, approved, stale, locked, and ready states use honest copy;
3. keyboard focus, semantic headings, labels, contrast, mobile layout, and reduced motion are checked;
4. project content is rendered as text, never injected as trusted HTML;
5. public drama has not leaked into the operational workspace;
6. the page looks like CineLanding, not a generic AI SaaS template.
