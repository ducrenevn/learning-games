# Learning Games — unified experience decision and Memory frontend implementation

**2026-10-12.** Investigation of live draft PR #13 at `e96db146` (Wave F UX1), Sonnet-reviewed Wave F PR #12 at `5cf3276`, Memory `MemoryHome.tsx` and `memory/engine/pairs.ts`, the Wave F file/UX contracts and the separately unmerged M3a PR #10. The owner approved the frontend-only Memory unification on 2026-10-12; no approval was given for backend changes, merges, or deployment.

## Design conclusion

**Standardize the learner/teacher experience, not the game engines.** Memory's simple initial choice and locally playable board are good. Wave F's guided editor, import review, optional advanced IDs, explicit export and DE/EN/VI layout are good. Keep a shared **activity lifecycle**, but do not force multiplayer, scores, host identity or synchronized turns into non-network games.

### Unified lifecycle

1. **Catalog** (`/`): select Memory, Sort, Sequence or Language Detective. Label the game clearly, avoid jargon and promise only supported functionality.
2. **Game landing** (`/games/<game>`): primary **Create activity** and **Import activity**, equally clear. A third *Join game* action appears **only** on Memory, not globally. Import on Memory is unavailable until its canonical adapter exists; do not show a dead button. The file interface shows `.json` only as secondary information.
3. **Guided authoring**: one task at a time with progressive validation, canonical source not mutated by gameplay. Desktop: right-hand persistent step navigator, central internal editor scroll, fixed footer. Tablet: horizontal step list. Mobile: compact previous/next or selector and natural vertical scroll. Shared terminology in DE/EN/VI; target language is independent. Default activity IDs auto-generated and advanced-editable.
4. **Review**: title, instructions, item count and teacher-only answer-key disclosure; explicit **Download activity**; do not mislabel a browser draft as saved. Imported content has a review/accept step and cannot replace unsaved work silently.
5. **Play**: dedicated, uncluttered board, no authoring form. **Present** for a teacher-operated shared screen, **Practice** for local individual play. **Online room** only for Memory after preserving its current host/join state machine and contract. Check/Reveal appropriate to each game, not universal turn or grading logic.

### Game-specific authoring

| Game | Guided editor content | Check semantics | Extra route |
| --- | --- | --- | --- |
| Memory | Pair list, optionally categories, local player settings later | Pair matching with local completion and scores; no separate answer key reveal | Existing multiplayer create / join / room |
| Sort | Details → Categories → Cards → Review | One teacher-assigned category per card | None |
| Sequence | Details → Ordered steps → Review | Exact intended serialized order | None |
| Language Detective | Details → Text → Mark errors → Review | Only flagged segments automatically scored; typed corrections teacher/self-reviewed | None |

## Memory compatibility decision to make before implementation

Currently Memory is not compatible with Wave F JSON: it uses `LEFT | RIGHT | OPTIONAL_CATEGORY`, with max-80-character sides; online rooms require 2–16 pairs and use Memory-specific RPCs. It also has a different localized frontend awaiting separate M3a release approval.

**Recommended path:** After the owner approves, add a local **Memory portable-content adapter** with a deliberately reviewed `activityType: "memory"` v1 validator and bidirectional conversion to `MemoryPair[]`. Never write online room tokens, players, room IDs or results to exported files. Apply online room limits before creating rooms even when imported. Keep the existing `parsePairs` input available temporarily as a compatibility/advanced bulk-edit option, and test preservation of legacy behavior. Reuse the shared game landing/editor/import shell, but leave `MemoryRoom`, `MemoryJoin`, RPCs and online lifecycle untouched. Reconcile localization against PR #10 *before* modifying Memory components: no silent merge/cherry-pick of the draft release candidate.

**Safer release slices:**

A. Authorize Memory's common landing/authoring UX and local JSON adapter (frontend only, no multiplayer code changes), with its own strict Memory schema and bidirectional fixtures; then integrate as an isolated reviewed PR.

B. Reconcile M3a i18n/Memory branch separately after its outstanding release gate; do not assume unmerged code is on Wave F.

C. Antigravity independently audits UX1 + corpus + Memory local regression, then owner personally judges visual/pedagogical fit. Online-room creation tests require explicit permission because they write to hosted prototype RPCs; offline/local Memory can be smoke-tested without backend writes.

## Avoid

- Do not replace Memory's existing local or multiplayer engines with the generic Wave F engine.
- Do not advertise Memory JSON import when only `LEFT | RIGHT` lines work.
- Do not offer multiplayer or shared student submission for Sort/Sequence/Detective on the basis of Memory RPCs.
- Do not move player answers, student identities, scoring histories, room tokens or temporary state into activity files.
- Do not conflate visual consistency and database/network release approval.

## Evidence and unresolved questions

As of this document, PR #13's layout, file chooser and guided editors have only limited TypeScript/jsdom evidence. Existing UI tests relying on the old one-screen editor need reconciliation. No real-browser proof for UX1 was established here. The JSON corpus in `tests/fixtures/wave-f/corpus/` is for the three *implemented* v1 activity types; Memory only has its legacy text compatibility fixture until the schema decision above is approved. Owner visual acceptance and Antigravity QA are separate gates.

## Memory unification implementation (2026-10-12; separate draft branch)

Approved and implemented on isolated `feat/wave-f-memory-unified-20261012` stacked on corpus PR #14: Memory now shares the Wave F chooser, guided task/pairs/review workspace, local preview/presentation/independent launch, local JSON import/export and DE/EN/VI authoring chrome. Memory alone retains the Join game link and online room creation action. Legacy `LEFT | RIGHT | CATEGORY` bulk entry remains an optional editor disclosure, and its original parsing engine, room RPCs, join and live room components stay unchanged.

The Memory JSON v1 content is `{pairs:[{id,left,right,category?}]}` within the existing `learning-games.activity` envelope and `activityType:"memory"`. Each text side <=80 characters; 1–16 pairs locally, at least 2 for creating an online room. Import rejects unknown top-level/row properties such as room codes, host tokens, players or scores. Only teacher-authored content is serialized. Original order and category labels are preserved, local and online engines consume converted `MemoryPair[]`. A game player does not automatically publish, save, or synchronize anything.

The four-game fixture corpus has 20 valid files and 28 invalid files. External human curriculum review is still required; all contents are explicitly examples or boundary tests. Preserve the independently unmerged M3a PR #10, and reconcile its separate room-language UI in a future scoped integration pass rather than cherry-picking it here.

**Evidence boundary:** TypeScript checking and direct validator+roundtrip corpus checks ran during authoring; Vitest/browser cross-device proof must be performed independently by Antigravity, and owner visual acceptance is a separate gate.
