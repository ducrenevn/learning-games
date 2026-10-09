# M3a Supabase migration runbook — DRAFT / HOLD

**Target only:** Supabase `iizsyphqlezesbvaiztd` (SPP + Learning Games shared project). **No migration has been applied.** Do not run before the owner confirms SPP dev freeze, backups, and reviewed change window.

## Baseline verified read-only 2026-10-09
- `private.game_poc_memory_rooms` RLS ON; approx 17 rows at inspection; `private.game_poc_memory_players` RLS ON (~20 rows).
- Seven `public.game_poc_memory_*` RPCs, SECURITY DEFINER with empty search_path.
- Old `create(text,jsonb)` MD5 `5e9d605fe596a4a6ce7679ac28a30ad5`; `state(text,text)` MD5 `acf655257ca78625a460ab01945190a7`.
- Original `create` and `state`: EXECUTE anon, service_role and postgres; NOT authenticated. Preserve.
- At the original drafting inspection, migration history showed 13 SPP migrations through `20261004160000`. **Read-only recheck on 2026-10-09 found 14**, latest `20261007071753_p2a1_homework_sql_rls_rpc_foundation`. This is a *new* Learning Games migration proposal, NOT an existing SPP migration. See [2026-10-09 read-only precheck and rehearsal gate](2026-10-09_READ_ONLY_PRECHECK_AND_REHEARSAL_GATE.md); never assume the old ledger is still current.

## Review adjustments — 2026-10-09

- PRE now checks all seven legacy Memory RPCs for SECURITY DEFINER, empty search_path, anon allowed and authenticated denied; it also checks RLS/direct private-table access and reports unexpired rooms. Exact create/state fingerprints remain fail-closed.
- UP now asserts the new room policy update affects **exactly one** room, and checks prototype security/grant baseline before applying. It does **not** broaden scope to other games.
- POST smoke now exercises an explicitly locked English room **as a joined student**, alongside Vietnamese-choice and German legacy compatibility, and rejects null policy choices. These SQL-editor checks are **privileged functional checks**, not a substitute for real anonymous-client authorization tests.
- Rollback now refuses to run while **any unexpired Memory room exists**, or when installation is partial or historical non-default room language settings would be lost. It is still a destructive, owner-approved last resort.
- Changes are limited to migration drafts and operational documentation on a review branch. **No deployment, database write, migration-ledger entry, application implementation, or SPP change has been made.**

## Planned UP
1. Add `interface_language text NOT NULL DEFAULT 'de' CHECK IN ('de','en','vi')` and `allow_student_language_choice boolean NOT NULL DEFAULT false` to **private.game_poc_memory_rooms only**. Existing rooms are locked German (safe compatibility). No data deletions.
2. Add new `public.game_poc_memory_create_v2(text,jsonb,text,boolean)`, retaining legacy `create` untouched. It validates policy, calls legacy create to preserve token issuance and validation, sets room policy in the same transaction, and returns the original capabilities.
3. Replace *only* the existing state function body; preserve its original function signature, auth before projection, hidden card semantics and grants; append `roomLanguage` and `allowStudentLanguageChoice` to authorized state JSON. No changes to `join/flip/next/skip/start`.
4. Exact-function fingerprints guard against drift; schema guard stops partial re-application. Use a transaction with `SET LOCAL lock_timeout='5s'`, `SET LOCAL statement_timeout='60s'`; fail closed.

## Freeze and review gate — owner action
- Stop concurrent SPP development and migrations, ensure clean SPP `main` and deployment baseline, verify no app errors.
- Verify correct Supabase project reference in dashboard; take a confirmed DB snapshot / PITR recovery point as available, restore-test according to the SPP control-room policy, retain the original `state()` definition, and record the exact migration ledger and applicable owner approvals.
- Review exact SQL files and diff; obtain explicit owner GO to apply. Any drift/failure = STOP, do not force.
- Current production Vercel still uses older `create` and still works after additive migration.

## Order
1. Run `00_PRE_READ_ONLY.sql` and confirm PASS; retain results and migration history.
2. Reconcile migration ownership with the SPP control room: reserve an **actual canonical migration version and history entry** using its approved process, without inventing one in this docs folder. Apply the reviewed equivalent of `01_m3a_room_language_UP_DRAFT.sql` as **one atomic migration**, not multiple dashboard snippets; record version/checksum/commit. **No direct untracked execution on the shared production backend.**
3. Run `02_POST_AND_ROLLBACK_SMOKE.sql` structural assertions and rollback-only synthetic room test; verify no synthetic rows remain. These tests alone do **not** validate client role grants.
4. Complete M3a frontend option/conditional language UI on isolated branch and test against migrated backend via **preview**, including locked and choice rooms, DE/EN/VI, QR join, refresh, and existing client. Run a genuine browser/anon API full-game regression: create, join as two students, start, flip (both matching and mismatching), resolve, skip/recovery, scoreboard, finish, hidden-card non-disclosure, token rejection, QR/link secrecy, and interface policy across refresh. A privileged SQL editor is not an anon API test.
5. Owner approves merge after green QA. Merge and monitor new Vercel release.
6. Resume SPP development only when all checks and monitoring are clean.

## Rollback
- **Preferred rollout stop:** Keep existing Vercel `main` frontend, which still calls legacy create. Failed frontend rollout → revert deployment; additive DB change is harmless to old callers.
- If DB rollback required, follow `03_MANUAL_DB_ROLLBACK_DRAFT.sql` only after verifying **no unexpired Memory rooms of either legacy or v2 format** and that historical non-default policy data need not be retained. It restores old state projection, drops v2 and the two columns; **destructive to stored language settings**. Never blindly run during active games.
- If deployment or SQL checks fail, halt and reconcile against live schema; do not alter any SPP migration, tables, auth, RLS or policies.

## Separate security advisory (NOT PART OF M3a)
Supabase table listing reported `private.maintenance_state` with RLS disabled. This is outside Memory and must be independently evaluated by the SPP control room; do not enable RLS as a side effect, since it can change SPP behavior.

## M3a UX contract
- No accounts, profiles or remembered global language choice.
- App selection routes show a top-right DE/EN/VI language switch (in-memory).
- Room create option: everyone same language (no student switch; server roomLanguage controls interface) OR students choose (switch appears on join/lobby).
- Vocabulary never auto-translated. The policy is immutable for the life of the room.

## Follow-on game architecture — separate milestone

Information Gap and Conversation Cards require genuine per-participant private role projections, pairing, teacher phases and possibly student answers. **Do not expand M3a** with those tables or include portable activity JSON in Memory's room policy. The future game/session backend requires a separately threat-modeled, reviewed contract; the existing generic public Canva POC tables are not a safe role-secret store. See `docs/activity-specs/` in the separate documentation PR for product planning.
