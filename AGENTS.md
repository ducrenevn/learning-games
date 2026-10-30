# Learning Games — Working Rules

## Operating decision — usage-driven stabilization (2026-10-30)

The owner uses **Learning Games primarily for live interactive classroom activities** in small German classes; `ducrenevn/speak-practice-pro` serves homework, independent learner practice, feedback and lesson memory. The two repos are complementary and share Supabase infrastructure, **not** Auth/guest-capability/assignment authority. No automatic integration.

**Pause speculative new game/mode development, not maintenance.** Fix reproducible bugs, access/security problems and friction observed in actual teaching; make bounded improvements with owner agreement when there is clear classroom value. A new game, multiplayer mode or SPP adapter should start only from a concrete teaching need and separate scope approval; no scheduled feature sprint or fixed freeze period. Avoid mandatory reporting/feedback bureaucracy. Preserve v1 production.

## Current authority (2026-10-16)

**V1 is merged and live in Production.** `main@360f641ba05943f17b78d1993890f2ec865b5ea4` (release PR #19), source candidate `b9b16d03ea9e0ef8ff5c27afc8d089f231144496`. The final Production smoke test passed for homepage, DE/EN/VI, four games, local examples and responsive layouts; the native unfinished-host exit confirmation was NOT browser-tested on live Production. This release is **closed**. Read [release closure](docs/releases/2026-10-16-v1-production.md), [CURRENT_STATE](docs/CURRENT_STATE.md) and [GAME_MAP](docs/GAME_MAP.md) before starting a new task.

### Non-negotiable working rules

1. **Working software outranks optimistic documentation.** Independently verify source, Git refs and tests; distinguish reported acceptance from directly executed checks.
2. **Do not reopen the v1 release without a concrete regression.** The next phase is classroom feedback and independently scoped new games, not unrequested polishing.
3. Keep the four game engines separate. Share UI/workspace/localization only where two games genuinely need the same behavior. Preserve technical IDs and portable file types.
4. The displayed game names and DE/EN/VI voice are documented in [GAME_MAP](docs/GAME_MAP.md). Target language content is teacher authored and independent of interface language and room-language policy.
5. Hosted Memory uses the existing `public.game_poc_memory_*` RPC family (including `create_v2`). Hosted Sort Individual uses `public.lg_v1_*` create/join/state/command. Do not assume other multiplayer modes exist just because the [V1 matrix](docs/architecture/MULTIPLAYER_V1_CONTRACT.md) plans them.
6. Guest bearer capabilities are **not** SPP user identities, account credentials, durable learning records, or suitable proof of an authenticated student. Never log or expose bearer tokens or service-role keys. Public frontend configuration only.
7. Shared Supabase project `iizsyphqlezesbvaiztd` also serves SPP. **No SPP speaking/Auth/Homework/schema changes or hosted DDL, grants, cleanup, migrations or test-room writes without separate explicit owner approval.** Preserve the three installed Learning Games migration source files byte-for-byte.
8. Keep Canva Code's original version as a reference; don't assume a configured Canva agent.
9. Include appropriately scoped tests/documentation with source changes. Don't claim browser/hosted/security verifications that weren't run. Check responsive layout and all three interface languages for user-facing changes.
10. Preserve unrelated or uncommitted work. Branch and inspect before edits; push/merge/Production deployments require explicit approval, as they may trigger Vercel. For new feature proposals, return to the owner for scope acceptance first.

## Agent and lesson routing

- Implementation: [START_HERE](docs/START_HERE.md) → [CURRENT_STATE](docs/CURRENT_STATE.md) → [SYSTEM_OVERVIEW](docs/architecture/SYSTEM_OVERVIEW.md) → relevant game source/tests.
- Lesson agents: [GAME_MAP](docs/GAME_MAP.md) → [teaching library](library/README.md) → specific lesson material, not the full release timeline.
- New-game planning: [PRODUCT_CATALOG](docs/PRODUCT_CATALOG.md), [game specifications](docs/games/) and [portable activity files](docs/architecture/PORTABLE_ACTIVITY_FILES.md); do not equate planned ideas with built functionality.
- Hosted/security work: [BACKEND_BASELINE](docs/architecture/BACKEND_BASELINE.md), [RELEASE_PREFLIGHT](docs/RELEASE_PREFLIGHT.md), release closure; coordinate with the SPP owner.
- Handoff: [IMMEDIATE_NEXT_PROMPT](docs/IMMEDIATE_NEXT_PROMPT.md) describes *what to do next*, older milestone sections are historical.
