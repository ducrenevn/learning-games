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

## SPP control-room decision — CONDITIONAL GO, execution HOLD (2026-10-09)

SPP control-room inspection approved a **streamlined migration without a separate isolated database rehearsal**, conditional on all three controls below. This is **not** approval to run UP now, and does not waive the PRE or POST tests.

1. **Confirm SPP/Memory development freeze:** P2a-6c owner-only browser testing is handed off but not confirmed inactive. Explicitly pause overlapping SPP/Memory agent activity, browser test writes and schema changes for the migration window. Zero observed queries/locks does **not** prove a freeze.
2. **Refresh recovery coverage:** The previously encrypted backup covers **58 tables**, while the current shared database contains **65** after Homework. Create and independently verify a fresh **encrypted, transaction-consistent** snapshot covering the current 65-table state, with recovery credentials stored separately. A full isolated restore rehearsal can remain deferred; retaining only the old archive is not sufficient.
3. **Canonical SPP migration:** SPP GitHub `main@bca04ca729a6e07794f9c160a963bc111c9eac45` is the observed baseline. The applied Supabase ledger has **14** entries through `20261007071753_p2a1_homework_sql_rls_rpc_foundation`; no later migration recorded at inspection. Through the **SPP-owned migration process**, create/review the versioned artifact, lock its exact checksum and confirm an atomic execution path in which this SQL's `BEGIN/COMMIT` cannot separate application from its migration ledger entry. Reconcile changes against current Learning Games `main` before finalizing. Do not choose a version here or copy an untracked SQL snippet into a live editor.

**Release sequence after explicit owner/authorized SPP GO:** confirm fresh backup/freeze → repeat full read-only `00_PRE_READ_ONLY.sql` → apply one canonically tracked atomic UP → independent POST structural/security + rolled-back synthetic tests → Antigravity real anon-client multiplayer QA → separate frontend release decision. Keep legacy production Memory available as fallback. Do **not** automatically run destructive SQL rollback. No SPP write gate change is part of M3a.

**Scope note:** SPP Homework migration installation is complete, but P2a-6c owner browser dogfood and production Homework activation are separate gates. This M3a GO does not authorize either of them.

## Updated SPP handoff — 2026-10-10 (planning GO, SQL execution HOLD)

- SPP `main@72656c6ada22a1fc80e71541f15fc850ba8b4288`: P2a-1 through P2a-6d complete; Homework ON in production with authenticated teacher/student smoke. No competing SPP schema work planned, but SPP remains writable for ordinary usage.
- Live Supabase read-only inspection at **2026-10-10 16:30:39 UTC**: full `00_PRE_READ_ONLY.sql` completed without error in `BEGIN TRANSACTION READ ONLY`; 65 tables in `public/private/auth/supabase_migrations`, 17 historical Memory rooms, 20 players, zero unexpired rooms, no M3a columns, no create_v2, and 14 migration ledger entries ending `20261007071753`. This is point-in-time evidence; always rerun PRE.
- The migration scripts were copied unchanged into the clean **database-only** review branch `review/m3a-database-release-ready-20261010` based on Learning Games `main@f8ac534`. Unlike the older stacked M3a branches, this branch introduces no frontend changes. `main` remains untouched.
- The new encrypted transaction-consistent **65-table backup remains unverified**. Do not substitute the older 58-table archive. Confirm recoverability and separately stored encryption credentials through the SPP control room.
- **Canonical migration filename/version and atomic ledger method remain pending SPP operator confirmation.** SPP owns `supabase/migrations/`. Generate the version through the approved local CLI process, then verify the exact final bytes and checksum. Do not invent a version here or apply untracked SQL to production.
- The isolated rehearsal remains conditionally waived. Owner-specific production GO is still required. The release chain is verified backup + quiet window → fresh read-only PRE → one canonically tracked atomic UP → independent POST/security → Antigravity real anon browser QA. Legacy Memory frontend is the first rollback lever; never automatically run destructive DB rollback.

## Planned UP
1. Add `interface_language text NOT NULL DEFAULT 'de' CHECK IN ('de','en','vi')` and `allow_student_language_choice boolean NOT NULL DEFAULT false` to **private.game_poc_memory_rooms only**. Existing rooms are locked German (safe compatibility). No data deletions.
2. Add new `public.game_poc_memory_create_v2(text,jsonb,text,boolean)`, retaining legacy `create` untouched. It validates policy, calls legacy create to preserve token issuance and validation, sets room policy in the same transaction, and returns the original capabilities.
3. Replace *only* the existing state function body; preserve its original function signature, auth before projection, hidden card semantics and grants; append `roomLanguage` and `allowStudentLanguageChoice` to authorized state JSON. No changes to `join/flip/next/skip/start`.
4. Exact-function fingerprints guard against drift; schema guard stops partial re-application. Use a transaction with `SET LOCAL lock_timeout='5s'`, `SET LOCAL statement_timeout='60s'`; fail closed.

## Freeze and review gate — owner action
- Obtain **explicit confirmation** that competing SPP/Memory development, owner browser dogfood, backend test writes and migrations are paused. Check SPP `main`, actual project and deployment baseline; verify no app errors. An empty lock/query snapshot is insufficient.
- Verify the exact Supabase project reference, obtain and verify a **fresh encrypted, transaction-consistent 65-table backup** covering newly installed Homework (previous 58-table backup is stale), and keep recovery credentials separately. An isolated full restore may be deferred under SPP's documented risk acceptance. Retain the original `state()` definition and verify the current migration ledger and owner approvals.
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
