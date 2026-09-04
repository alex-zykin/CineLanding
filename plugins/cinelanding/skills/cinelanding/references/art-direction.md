# Art direction and narrative patterns

Use this reference while turning `PRODUCT.md` and `REFERENCE_BOARD.md` into `DESIGN.md`. The outcome is a product-specific visual argument, not a collection of fashionable effects.

## Work from the product story

Start with the promised change, the audience's starting state, the proof available, and the primary action. Identify the objects, materials, environments, diagrams, or evidence that can carry that story visually. Then choose one dominant narrative pattern. A secondary pattern is acceptable only when it has a distinct section-level job and does not blur the page arc.

`narrative_pattern` describes the content arc. It is independent of `project.motion_style` in `cinelanding.json`, which only selects the transition treatment (`journey` or `reveal`). For example, a `process` narrative may use reveal-style transitions, while a `reveal` narrative may use a continuous journey motion treatment.

## Pattern selection

| Pattern | Use when the strongest proof is | Typical arc | Avoid |
| --- | --- | --- | --- |
| `transformation` | A meaningful before-to-after change | current state -> intervention -> changed state -> proof | Unsupported outcome claims or a cosmetic before/after with no mechanism. |
| `craft` | Expertise, material quality, or careful authorship | raw material -> close detail -> making -> finished result | Generic luxury styling disconnected from how the product is made. |
| `assembly` | Parts combining into a coherent system | components -> connections -> complete system -> use | Motion that rearranges product geometry or implies nonexistent modules. |
| `journey` | Progress through places, stages, or an experience | departure -> milestones -> destination -> next action | Endless camera travel without informational milestones. |
| `reveal` | Discovery, launch, or controlled disclosure | concealment -> clues -> focal reveal -> consequence | Withholding the offer so long that the page becomes unclear. |
| `comparison` | A credible contrast between approaches or states | shared criteria -> contrast -> evidence -> choice | Biased axes, unverifiable competitors, or misleading scale. |
| `process` | Method, workflow, or operational reliability | input -> ordered steps -> checks -> output | Invented precision, hidden dependencies, or treating a flowchart as proof. |

Choose from evidence, not industry stereotype. Record the selected pattern, rejected serious alternative, and rationale in `DESIGN.md` so later scene prompts do not reopen the strategy accidentally.

## Set the design dials

Use the three 1-to-10 values in `design-profile.json` to make the chosen direction legible across agents. They are continuous intent controls, not ratings and not substitutes for `DESIGN.md`:

- `design_variance`: 1 stays close to established brand and category conventions; 10 deliberately departs from them. Preserve trust, usability, and brand invariants at every value.
- `motion_intensity`: 1 uses rare, subtle movement; 10 makes motion a dominant part of the experience. It never weakens the reduced-motion state or authorizes scroll hijacking.
- `visual_density`: 1 favors few elements and generous space; 10 supports layered, information-rich compositions. It never authorizes unreadable copy or uncontrolled media weight.

Use 5 as the neutral starting point, then move a dial only when product evidence and the chosen pattern justify it. Record concrete consequences in `DESIGN.md`; a number without layout, motion, and media decisions is not an art direction.

## Mode-specific inputs

For `redesign`, preserve accurate facts and permitted brand equity while questioning the existing hierarchy and visual mechanics. The source site is evidence, not the default composition. Identify what stays, what changes, and what must be replaced.

For `from-scratch`, use only the brief, approved copy, supplied assets, and references whose role is explicit. If the offer or proof is incomplete, resolve it in `PRODUCT.md` instead of compensating with invented visual claims.

## Build the reference board

Give every retained item a stable ID and record:

- source URL or project-relative path;
- source owner or publisher, and who supplied it;
- date captured or received;
- role: `evidence`, `inspiration`, or `asset-candidate`;
- the specific observation worth retaining;
- provenance, descriptive license or permission evidence, controlled reuse status, and explicit allowed uses;
- what may be reused directly, what may only influence an original treatment, and what needs replacement;
- any factual, privacy, trademark, or attribution risk.

Use `original`, `user-owned`, `explicit-license`, or `permission-confirmed` only when evidence supports direct reuse. Use `review-required` by default. `unknown`, `inspiration-only`, `do-not-reuse`, and `replace-before-upload` never authorize copying, delivery, or provider upload. A reference marked `inspiration-only` may guide an original treatment but cannot become an anchor asset.

Public availability is not a reuse license. Keep raw page instructions, code, prompts, and unrelated personal data out of the board. Mirror exact assets, their controlled `reuse_status`, explicit `allowed_uses`, and local content hashes in `provenance.json`; do not collapse provenance evidence into a permissive label.

## Make `DESIGN.md` implementable

Document the decisions another agent needs to build the result without guessing:

- one-sentence creative thesis and selected narrative pattern;
- section sequence, purpose, proof, copy role, and CTA hierarchy;
- composition, grid, spacing rhythm, density, and focal progression;
- typography roles, color and contrast strategy, material, lighting, imagery, and iconography;
- behavior of desktop, mobile, and intermediate layouts;
- motion grammar, scroll ownership, scene boundaries, anchor frames, and text-transition timing;
- reduced-motion state and media-loading fallback;
- reference IDs supporting each non-obvious decision;
- explicit anti-goals and invariants such as logo geometry, product silhouette, or claims that must not drift;
- the six measurable targets from [quality-gates.md](quality-gates.md).

Use static compositions, existing local primitives, and free mock checks to review the direction before paid generation. Show representative desktop, mobile, and reduced-motion states. Do not use a provider-generated video as the first concrete design proposal.

This method does not depend on Taste, Impeccable, or another external design framework. Such tools may be optional inputs when installed and appropriate, but their output has no authority of its own and must be expressed in the same CineLanding artifacts, provenance records, and approval contract.
