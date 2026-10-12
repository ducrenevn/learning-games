# Learning Games UX-2 — Owner visual-smoke audit & Sonnet design brief

**Date:** 2026-10-12
**Reviewed base:** `test/wave-f-guided-dom-recovery-20261012` at `71e6e86`.
**Authority:** Owner screenshots (Memory import/editor/preview; Sort placement/reveal; Sequence editor/presentation; Detective editor) plus inspected current React/CSS. No implemented UX-2 changes.
**Latest technical gate:** Antigravity reports 238/238 Vitest, 19/19 files, typecheck/build, 48 corpus files, responsive/keyboard flows PASS. This is a *visual/pedagogical* redesign, not a request to reinterpret green technical tests as UX signoff.

## Design diagnosis: strengths to keep

- Visual identity is coherent: warm mineral background, forest-green ink, editorial serif, restrained copper accents, gentle borders. The landing choice cards feel welcoming.
- Choice-first entry, safe file import, guided validation, three interface languages, readable Memory board, Sort/category semantics, focus and keyboard feedback, local-first integrity, and distinct play modes are good foundations.
- Problem: presentation density and interactions vary substantially among games. Generic components add chrome but not clarity; some layouts reduce space for authored content and class interaction.

## Screenshot-by-screenshot assessment

1. **Memory import screen:** at desktop width, a large dashed file-drop zone remains prominent even after validation. An expanded “Lösungen ansehen” shows raw JSON (IDs, keys and braces) instead of a teacher-friendly preview. The import status and CTA are visually separated by too much vertical space. **Recommendation:** idle mode uses a concise drop zone; after selecting a valid file, collapse it into a one-line file strip with Replace action. Below, present a human-readable preview (for Memory, 6 visible left/right pairs; Sort, categories + sample cards; Sequence, ordered steps; Detective, passage + marked issues for teachers) and an explicit Open in editor action. Place raw JSON in an Advanced/Technical disclosure only. Preserve review-before-accept and no replacement on invalid imports. In code the current raw JSON is inside a closed-by-default `<details>`; the issue is that when expanded its *only* preview is technical JSON, not that it auto-expands.

2. **Memory guided editor:** spacious overall outer card, but the actual editor is cut off vertically, with a second page scrollbar, a 240px right navigator for only three steps, a 76px toolbar and footer and a large separate Memory hero above. Current CSS sets `.activity-ux-workspace{height:calc(100dvh - 215px);min-height:540px}`, `.activity-ux-body{grid-template-columns:minmax(0,1fr) 240px}` and internal `overflow-y:auto`. **Recommendation:** give editor the majority of the working viewport; use a compact horizontal 3–4-step strip across the top instead of a permanent 240px right rail; compress hero/breadcrumb when editing; content should be wider and long text should breathe. Keep one intentional scroll region on desktop, normal document flow on mobile, and a non-obscuring Next/Back area. Target language should be a friendly language picker, not an unexplained editable ISO code, while preserving arbitrary valid language tags if needed via Advanced.

3. **Memory preview:** the board/score panel hierarchy is strong and legible. Matched cards belonging to different players currently use identical orange borders. `LocalCard` and `matchCards()` only store `matched:boolean`; the `MemoryBoard` is shared with online mode. **Recommendation:** track local match ownership by pair ID / player index in `LocalMemory` only; use distinct muted but legible per-player colors echoed in scoreboard and matched card borders, combined with player labels/icons/patterns (never color alone). Support 1–6 local players, reduced motion and contrast. Do **not** change Supabase RPCs, online room payloads or shared public card contract without separate review; optional local-only owner prop on board or wrapper is safer.

4. **Sort before checking:** category trays contain placed word chips *and* all cards remain in the original card bank with normal emphasis, creating duplicated visual items and little sense of progress. Selected card opens a bulky control group under the card, increasing layout height. **Recommendation:** add pointer/touch drag-and-drop from unsorted bank to category tray, with tap-to-place and keyboard-first alternative retained. Prefer that assigned cards move visually into the bins and stop appearing as active unsorted cards; alternatively leave explicit muted/inert placeholders with “sorted” status, but avoid duplicate fully active cards. Permit reassignment/removal without revealing answers; show progress (“7 of 9 sorted”) and visible state. Do not silently change scoring, answers or focus behavior. Native HTML5 drag alone is insufficient for reliable touch/keyboard; assess accessible DnD strategy and dependencies.

5. **Sort after checking/reveal:** correct answers are visible in trays and cards while each original card gains another answer panel, leading to excessive vertical repetition. **Recommendation:** compact status/result summary, clear correct/incorrect states, teacher explanation in a progressive reveal, focus to result and key maintained. Preserve no answer leak before Check and Reveal.

6. **Sequence editor:** the text entry is materially cramped and truncated because `.activity-ux-page .activity-edit-row` applies a generic four-column grid to rows that only have an input and `.activity-item-tools`. Each row is tall despite hiding much of the meaningful sentence. Up, Down and Entfernen are stacked beside narrow text. **Recommendation:** custom Sequence row layout: narrow drag handle + order number, full-width autosizing text entry (supports full sentences), subtle trailing contextual actions/overflow menu. Offer accessible Move Up/Down controls with stable focus (always available to keyboard and screen readers), not only hover. Remove step must require deliberate action and preserve minimum count.

7. **Sequence presentation/player:** rows have large fonts/padding and up/down buttons underneath, forming bulky repetitive two-line cards. **Recommendation:** slimmer single-row card on desktop (handle, number, full sentence, discreet controls), responsive wrapping on phones; drag reorder plus keyboard/tap actions. Presentation is allowed to be larger than Preview/Independent, but should fit typical 5–10 lines and a projector without losing clarity. Keep shuffled unsolved start, deterministic answer key, scoring and focus announcements.

8. **Language Detective editor:** current word-first text preparation is substantially better than dozens of fields, but forces one continuous sequence of segments. `splitPassage` tokenizes whitespace and `DetectiveContent` v1 contains one `prompt`, `segments[]` and `issues[]`; it cannot genuinely preserve separate sentence/task boundaries, prompts and per-task result states. **Owner request:** several *short sentences as stacked independent tasks*. **Recommendation:** teacher adds Sentence 1 / Sentence 2 / … blocks with their own text and marked errors (including error-free sentences). Learner sees separate compact sentence blocks and feedback per sentence plus optional overall summary; no free-text autograding. Need an explicit versioned data model + compatibility plan before coding; a CSS-only line break would misrepresent the task structure. Keep all existing v1 Detective JSON fixtures importable, treating them as a one-task activity. Propose schema choices, migration, global limits and UX first; do not silently mutate v1 or drop its valid imports.

9. **Global language and entry cards (prior owner screenshot):** the current per-game native select is visually inconsistent with the absent homepage language control. Earlier M3a PR #10 contains an accessible DE/EN/VI **flag-button toggle** with SVG artwork that renders on Windows (not emoji); its room-language policies are separate and must not be casually merged. Recommendation: one shared, global interface-language source for catalog + four activities, with three accessible pressed-state flag buttons, no persistence required yet, and target-language content untouched. Online-room language policy stays separate. “Raum beitreten” is a React Router Link styled as a card but still renders text underlines: apply consistent card typography and focus styles while **retaining proper link semantics**.

10. **Microcopy and hierarchy:** on imported activities, “NEUE AKTIVITÄT” is factually wrong; label “Aktivität bearbeiten” or just show its title. The English/DE/VI interface must be consistent on homepage, not only in editor. “Nur in diesem Browser” could imply durable local storage, though current authoring is in-memory until download; prefer explicit “Nicht gespeichert · Aktivität herunterladen” (with accurate status changes). Review and play controls should not be split across too many places.

## Proposed cohesive pattern (Sonnet should challenge, not blindly copy)

- **Catalog & game selection:** welcoming choice cards, shared language toggle. Memory additionally has **Join game**.
- **Import:** compact idle drop zone → validated one-line file strip → domain preview with bounded height → clear “Open in editor”. Technical file JSON is advanced-only.
- **Guided editor:** compact game/activity title and 3–4 horizontal step tabs; editor occupies the majority of canvas, long-form text gets width; one clear footer; no large dedicated navigator sidebar. Responsive at 1440/1024/768/390/360 and short viewports.
- **Player:** mode-appropriate density (preview/solo vs projector), calm controls and progressive reveal; direct manipulation where it improves learning, with full keyboard/touch alternatives.
- **No new account, storage, external AI, backend or hosted writes.**

## Suggested review/implementation sequence — separate gates

**UX-2a, low-risk shared polish:** redesign chooser/link typography, restore consistent accessible flag switcher through careful M3a reconciliation (or standalone reimplementation, independently reviewed), import human preview and compact file strip, editor shell real estate, truthful labels. Preserve current v1 schema and all game engines. Take before/after screenshots; run full suite and build.

**UX-2b, mechanics and pedagogy polish:** Sort DnD + visually resolved sorted cards, Sequence authoring/playing reorder redesign + DnD with keyboard alternative, Memory per-player matched ownership. Respect 44px pointer targets, game rules, transitions, accidental drag, rapid interactions, screen reader announcements, focus, and Reveal secrecy. New interaction tests required.

**UX-2c, Detective sentence tasks:** FIRST design and document contract decision, compatible v1 import and export, distinct task identity/error scope, per-task zero errors and grouped scoring. Present proposed UI and migration/test plan for owner approval **before schema/player implementation**.

## Sonnet brief — independent designer/reviewer

Read `AGENTS.md`, `docs/START_HERE.md`, `docs/CURRENT_STATE.md`, Wave F contracts, `docs/games/`, the current source and tests, and this audit. Run the app at `test/wave-f-guided-dom-recovery-20261012` base / current design-review branch; inspect actual screens instead of assuming mockups represent implementation. Owner provided nine screenshots dated 2026-10-12; request screenshot access if not already in your review environment.

**Phase 1 deliverable: design critique and proposal only.** Do not code the large drag-and-drop, Memory match-owner, or Detective schema changes before showing the user a cohesive proposed flow. Provide sketches/wireframes or before/after screenshots of at least import, editor, Sort and Sequence play, Detective stacked sentence authoring, and Memory owner-state. Explain desktop/mobile behavior, states, localization, keyboard/touch accessibility and implementation complexity. Distinguish P0 visual consistency, P1 interaction improvements, P2 versioned data-contract proposal. Identify if any option contradicts the existing trusted test/engine assumptions.

After owner design approval, make **small, reviewable commits on an isolated feature branch** (not main, not release-linked, not the green smoke branch). Typecheck, full Vitest and build must stay green; preserve all 48 valid/reject fixtures and backwards-compatible JSON roundtrips. Run browser screenshots at 1440/768/390/360 and portrait. Sonnet may propose a dependency but must justify size, accessibility and touch behavior before adding it.

**Forbidden without explicit separate authorization:** any Supabase/SPP changes, hosted room creation/writes, multiplayer RPC schema, production deployment/merge, silent v1 Detective schema breakage, removal of touch/keyboard fallback, or premature claim of screen-reader/device testing.

## Design acceptance criteria (owner decision, not merely Vitest PASS)

- Teacher can import an activity and inspect its *meaningful content* without seeing JSON syntax.
- At standard laptop height, editor content is immediately visible with little wasted chrome and no clipped Sequence sentence fields.
- Sort clearly distinguishes unsorted/placed cards and supports drag *and* tap/keyboard placement.
- Sequence rows are readable and efficiently reorderable in editor and player.
- Matched Memory cards have unambiguous per-player ownership and accessible noncolor cue.
- Detective can teach several short sentences as separately presented and marked tasks, with old JSON still importable.
- Same clear DE/EN/VI selector and teacher-facing terminology on catalog and game screens.
- Existing tests and actual classroom mechanics stay correct, with release separately approved.
