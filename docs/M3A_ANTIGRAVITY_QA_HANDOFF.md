# M3a Antigravity QA handoff — conditional, NOT authorized to begin online v2 test yet

**As of 2026-10-09:** The M3a UI feature is implemented on `feat/m3a-room-policy-ui-reviewed-20261009`. The DE/UK/VN opening flags from PR #7 are included. Automated GitHub checks for the toggle passed. **The `create_v2` backend migration is not applied.**

## Starting authority and hard stop

Read `AGENTS.md`, `docs/START_HERE.md`, `docs/M3A_IMPLEMENTATION_STATUS.md`, and the migration runbook under `docs/migrations/m3a/` (PR #5). Refer to `docs/migrations/m3a/2026-10-09_READ_ONLY_PRECHECK_AND_REHEARSAL_GATE.md` once the migration-safety PR is merged.

**Do not run M3a v2 live-room creation / POST tests until the SPP owner has explicitly confirmed:** SPP development freeze, approved backup/recovery, successful isolated PRE/UP/POST rehearsal, canonical migration ledger entry, production PRE and UP/POST success, and an authorized target for QA. Never apply or rollback shared Supabase migration as part of ordinary UI QA.

Do not merge to `main` or deploy to Vercel production during QA; use local/preview. Do not touch SPP Auth, Homework, student identity, or unrelated data.

## Part A — can run before database migration

1. Confirm clean checkout and branch/head; run `npm ci`, `npm run typecheck`, `npm test`, `npm run build` and `npm run dev`.
2. Manually inspect desktop/mobile layouts at 1440, 1024, 768, 390, 360 pixels; no overflow and clear focus states.
3. Verify opening and Memory selection header uses **rounded DE/UK/VN flags** with one active state. Switching affects UI but **never modifies original exercise vocabulary**.
4. Verify local Memory mode, matching/mismatching, rapid click protection, winner UI and localized labels; test all DE/EN/VI.
5. Verify global header language switch is deliberately absent on online join/room routes. An in-room selector appears only when the server's authorized room policy permits it; do not forge local state to simulate backend success.
6. Report browser-visible untranslated parser errors or messages as a separate polish backlog, never falsify success.

## Part B — only after approved backend migration and target access

Perform actual host + two independent student browser/device tests with **synthetic names and exercise content**:

1. Host selects DE, EN, VI respectively and **Everyone same language**; students must use host-selected UI and must **not** see a language switch.
2. Host selects **Students choose**; two students choose different UI languages in lobby. Host and students retain independent interface languages while seeing exactly the same teacher-authored target-language vocabulary.
3. Verify join via QR/link, no capability tokens exposed, lobby/player list and teacher-only start.
4. Verify refresh/rejoin and language-policy enforcement across status changes and across state/flip/next/skip/start responses.
5. Exercise correct and incorrect card turns, announcement timing (no duplicate/race/overlay regressions), retained turn after match, score, skip/recovery, full finish and responsive phone behavior.
6. Verify a legacy client room still defaults to locked German; verify unsupported/invalid/null settings and unauthorized state attempts are rejected. Confirm private card values remain hidden.
7. Confirm SPP classroom/auth/homework flows show no regressions using the SPP control room's approved smoke suite.
8. Capture tests with redacted evidence, document exact commands, environment/commit, test identities, pass/fail/blocked. No real learner data or tokens in screenshots/logs.

## Deliverables

- Reproducible QA report in `docs/audits/` with host+2-student matrix, browser/viewport details and safe redacted evidence.
- Fixes in focused PR(s), with changed tests; no auto-merge/deploy.
- Explicit verdict **PASS / PASS WITH CORRECTIONS / BLOCKED**. A TypeScript/build PASS alone is not sufficient for M3a live rollout.

The M3a source PR chain is #3 (base language), #5 (migration-safety review), #6 (room policy UI); #7 flag toggle is already merged into #6. Merge order and production authorization remain controlled by the owner.
