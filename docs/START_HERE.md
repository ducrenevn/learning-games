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
Independent, adult-appropriate learning activity toolkit. Memory is implemented; Sort and other activities remain planning until separately approved.
