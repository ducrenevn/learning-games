# Start Here — Learning Games
First read [AGENTS.md](../AGENTS.md). Verify the current `main`, open PRs, code and tests. Documentation marked "planning" is not implementation.

| Agent task | Short reading path |
| --- | --- |
| Plan a lesson or recommend an activity | [GAME_MAP](GAME_MAP.md) → matching [teaching-library entry](../library/README.md) |
| Reuse a saved activity | Game Map → corresponding library index → just that JSON |
| Generate JSON via external AI | Game Map → **approved** game schema/spec → [portable file rules](architecture/PORTABLE_ACTIVITY_FILES.md); proposed schema = draft only |
| Develop/review a game | [CURRENT_STATE](CURRENT_STATE.md) → [SYSTEM_OVERVIEW](architecture/SYSTEM_OVERVIEW.md) → game-specific contracts, source and tests |
| Multiplayer/hosted database | [BACKEND_BASELINE](architecture/BACKEND_BASELINE.md), separate explicit owner-approved migration |
| Handoff to a control room | CURRENT_STATE → [ROADMAP](ROADMAP.md) → [IMMEDIATE_NEXT_PROMPT](IMMEDIATE_NEXT_PROMPT.md) |

[LEARNING_ACTIVITY_LIBRARY](PRODUCT_CATALOG.md) is the **long-form strategic catalog**, not the default lesson-agent entrypoint. Mechanics are in `docs/games/`, shared contracts are in `docs/architecture/`, pedagogical uses and future real JSON in `library/`.

## Setup
```bash
npm install
cp .env.example .env.local
npm run dev
npm run typecheck
npm test
npm run build
```
Memory local needs no backend. Memory online uses public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` only. Never put secret keys in frontend. Local build is not hosted proof.

## Goal
Independent, adult-appropriate learning activity toolkit. Memory is implemented on `main`; Sort, Sequence and Language Detective exist only on the unmerged Wave F branch (reviewed, not released); other activities remain planning until separately approved.

## Current branch (2026-10-13)
The authoritative state is the **UX-2 single-canvas** branch `feat/ux2-single-canvas-20261012`: see [CURRENT_STATE](CURRENT_STATE.md#ux-2-single-canvas-implementation--authoritative-2026-10-13) and the [handoff](IMMEDIATE_NEXT_PROMPT.md). Detective v2 limits are owner-approved.

## Wave F — local teaching-game development (2026-10-12) (historical)
A new control room is authorized to **build three frontend-only games**. Read [Wave F contract](architecture/LOCAL_FIRST_ACTIVITY_CONTRACT.md), then the three short specs [Sort](games/sort.md), [Sequence](games/sequence.md), [Language Detective](games/language-detective.md). **Status 2026-10-12:** all three are implemented on branch `feat/wave-f-local-games-a1-a3-20261012` and have had the independent Sonnet review and fixes ([report](audits/2026-10-12-wave-f-independent-review.md)); they are **not merged, not released and not yet owner-tested**. The current handoff is [IMMEDIATE_NEXT_PROMPT](IMMEDIATE_NEXT_PROMPT.md). Do not treat the original authorization as permission to merge to main, deploy, or change Supabase.
