# Start Here — Learning Games (2026-10-16)

**Current authority:** [CURRENT_STATE](CURRENT_STATE.md) and [release preflight](RELEASE_PREFLIGHT.md). Frozen accepted Preview candidate: `8c14b845ee4ed7892a224e9e336852255612362f`. All four local games are implemented and accepted on Preview; Memory online is functional; Sort Individual online is classroom-accepted. Three Learning Games migrations, including the reveal lifecycle correction, are installed on shared SPP Supabase per owner release handoff. Production merge is still pending.

**Current task boundary:** isolated local preflight corrections and verification, then a local commit and STOP for independent review. No push, merge, deployment, hosted writes, new rooms, SQL changes or SPP modifications. SPP PR #12 remains draft; migration-history reconciliation and legacy Memory clean-replay proof remain outstanding. Hosted DB security/function-parity probing belongs to the separate SPP control room.

**Reading path:** [AGENTS](../AGENTS.md) → CURRENT_STATE → [SYSTEM_OVERVIEW](architecture/SYSTEM_OVERVIEW.md) / [BACKEND_BASELINE](architecture/BACKEND_BASELINE.md) → relevant source/tests. Release handoff: [IMMEDIATE_NEXT_PROMPT](IMMEDIATE_NEXT_PROMPT.md). Lesson planning still starts at [GAME_MAP](GAME_MAP.md) and the relevant `library/` entry.

**Local checks (PowerShell):** `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`, `git diff --check`. Use `npm.cmd` when PowerShell blocks the `npm.ps1` shim. Online configuration needs only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; never expose secret keys. Local games need no backend.

---

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
