# Learning Games — unified experience proposal (decision required)
**2026-10-12.** Investigated Wave F UX draft PR #13 (e96db14), reviewed PR #12 (5cf3276), Memory's MemoryHome.tsx/pairs.ts, and separate Memory localization PR #10. This is planning, **not authorization to modify Memory**.

## Recommendation
**Unify the activity lifecycle and visual language, not engines or synchronization.** Memory's welcoming choice-first UI is an asset; Wave F's guided editing, reviewed file intake and DE/EN/VI shell are assets. Do not force Memory's multiplayer semantics on other games.

| Step | All games | Memory-specific |
| --- | --- | --- |
| Catalog | Select game, accessible labels and consistent cards | Show Memory's online capability |
| Entry | **Create activity**, **Import activity** once supported | Also **Join game** for existing online rooms |
| Editor | Details → game-specific content → Review; no errors on fresh draft | Pair editor and optional bulk-entry mode |
| Review | Teacher-only solution preview; explicit Download activity | Do not export player/room state |
| Play | Dedicated board, teacher-facing Present and local Practice wherever implemented | Existing local scores/turns and separate online room lifecycle |

Desktop: persistent right step navigator, central scrolling editor, fixed footer. Tablet: horizontal step navigator. Narrow phone: compact step picker and natural scroll. Use DE/EN/VI interface strings independently of the authored target language. Labels say “activity”, not “JSON”, except as secondary file-format help.

## Compatibility warning
Memory currently uses **LEFT | RIGHT | OPTIONAL_CATEGORY** newline-separated text with ≤80 characters per card side and 2–16 pairs for online rooms; it has no Wave F JSON schema or import. Wave F supports versioned JSON for sort, sequence, language-detective only. Never display a nonfunctional Memory “Import activity” button. Do not silently reuse Sort's engine or Memory-specific RPCs.

**Proposed separate Memory migration (subject to owner's approval):**
1. Add an explicit local Memory activityType/content schema/validator and a tested MemoryPair conversion adapter, preserving legacy text bulk entry.
2. Reuse the guided editor shell, import/review/export and separate play chrome. Keep existing room join/create/host UI and all multiplayer RPC/source behavior intact.
3. Reconcile PR #10 localization against the selected base with separate review; no silent cherry-pick, merge, or schema changes.
4. Check Legacy Memory local + multiplayer behavior, URLs, room tokens, room language policy, and escape/safety. Online room smoke creates hosted state and requires a separate explicit permission gate.

Do not merge/deploy, touch SPP/Supabase, implement backend, or claim Memory JSON exists. Authoring/story consistency is the objective, not identical scoring, turn or check mechanics.

## Before Antigravity
First reconcile pre-UX1 DOM tests and obtain npm ci/typecheck/test/build for PR #13. After the owner approves the Memory design, implement its frontend-local adapter separately; otherwise Antigravity should test the current 3-file schema and legacy Memory flow, logging the visual discrepancy as an accepted known limitation. The owner will judge visual/pedagogical fit separately from exhaustive automated smoke.
