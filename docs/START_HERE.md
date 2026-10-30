# Start Here — Learning Games (2026-10-16 release closure)

**Current operating mode (2026-10-30):** usage-driven stabilization. Learning Games is the **in-class interactive activity** companion to SPP's **homework/independent practice**. Bug fixes and observed UX problems remain active; new games/multiplayer/adapter development waits for classroom evidence and owner approval. Old stacked PRs/branches are retained until individually reviewed for closure; do not mistake them for pending release steps. See `CURRENT_STATE.md`, `ROADMAP.md` and `IMMEDIATE_NEXT_PROMPT.md`.

**V1 is live at https://learning-games-rho.vercel.app** (merge `main@360f641ba05943f17b78d1993890f2ec865b5ea4`; accepted source `b9b16d03ea9e0ef8ff5c27afc8d089f231144496`). See the [authoritative release closure](releases/2026-10-16-v1-production.md), [current state](CURRENT_STATE.md) and [short game map](GAME_MAP.md). Older milestone statements below are explicitly historical, even if they call a branch "current".

**Shipped:** four local games (Memory, Was passt wohin?, Der Reihe nach, Auf Fehlersuche), Memory online Turns and Sort online Individual; user-facing DE/EN/VI. Final Production smoke passed for home, localization, four interfaces, responsive views; the host-exit native dialog was not run on real Production. Source validation 490/490 tests + typecheck/build passed.

**Next work:** classroom experience and teaching feedback, then one new game at a time when the owner chooses. [NEXT HANDOFF](IMMEDIATE_NEXT_PROMPT.md) and [ROADMAP](ROADMAP.md). Do not repeat v1 implementation, migrations or audit as an open task.

**Read by role:**
- Teaching / exercise authoring: [GAME_MAP](GAME_MAP.md) → [library](../library/README.md) → relevant [game spec](games/).
- Development: [AGENTS](../AGENTS.md) → CURRENT_STATE → [SYSTEM_OVERVIEW](architecture/SYSTEM_OVERVIEW.md) → specific source/tests.
- Hosted/Supabase coordination: [BACKEND_BASELINE](architecture/BACKEND_BASELINE.md) → [preflight risks](RELEASE_PREFLIGHT.md); SPP approval needed for database changes.
- Release history and rollback: [v1 closure](releases/2026-10-16-v1-production.md).

**Local checks:** `npm run typecheck`, `npm test`, `npm run build` (PowerShell: `npm.cmd` as needed). Local modes do not require a backend; online rooms use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. No browser service keys.

---

## Historical entrypoint — 2026-10-16 preflight and earlier
The material below is preserved for provenance; its release gates are already satisfied or superseded.

## Historical entrypoint — 2026-10-14 and earlier

Everything below records earlier milestones and setup context. Its “current”, “next”, design-only, branch and authorization statements are historical and are superseded by the current authority above.

**Authoritative current status:** MP0 frontend and hosted functional Memory QA **accepted on isolated Preview branch** `feat/lg-mp0-ux2-m3a-integration-20261013@b569d76`. NOT merged or Production-released. New MP1 backend is **design-only**. Read [CURRENT_STATE](CURRENT_STATE.md) and [MP0 hosted acceptance](audits/2026-10-14-mp0-hosted-acceptance.md).

**For independent backend review:** read [MULTIPLAYER_V1_CONTRACT](architecture/MULTIPLAYER_V1_CONTRACT.md) (locked product matrix), [MP1_BACKEND_CONTRACT](architecture/MP1_BACKEND_CONTRACT.md) (proposed technical contract), [MP1_REVIEW_AND_ROLLOUT](architecture/MP1_REVIEW_AND_ROLLOUT.md) (review and release gates), [BACKEND_BASELINE](architecture/BACKEND_BASELINE.md) and relevant source. Do not mistake documentation for deployed code. SPP Homework adapter is separate [discovery](architecture/SPP_HOMEWORK_INTEGRATION_DISCOVERY.md).

**Rule:** The documentation review branch is based on accepted MP0 code, but is not implementation authorization, SQL/hosted-write authorization or release authorization. The historical text below is retained for previous waves and may have stale status.

---

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
