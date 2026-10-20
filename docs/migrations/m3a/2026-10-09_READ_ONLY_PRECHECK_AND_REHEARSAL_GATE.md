# M3a read-only baseline and isolated-rehearsal gate — 2026-10-09

**Status: READ-ONLY PRE PASSED; SPP CONTROL ROOM CONDITIONALLY WAIVED THE ISOLATED REHEARSAL; PRODUCTION MIGRATION STILL ON HOLD.**

Repository `ducrenevn/learning-games`. Migration-review branch `review/m3a-migration-safety-20261009`. Target shared Supabase project `iizsyphqlezesbvaiztd` (SPP). These observations are a point-in-time snapshot, not a waiver of PRE checks at rollout.

## Checks actually completed (read-only, 2026-10-09)

Supabase connected project: `speak-practice-pro-preview`, project ref `iizsyphqlezesbvaiztd`, healthy PostgreSQL 17.11.

- `private.game_poc_memory_rooms`, `private.game_poc_memory_players` exist; RLS enabled on both.
- Seven `public.game_poc_memory_*` RPC functions remain present.
- All seven are `SECURITY DEFINER` with empty `search_path`; all seven allow `anon` execution and deny `authenticated` execution (as required by existing prototype).
- Original `create(text,jsonb)` fingerprint: `5e9d605fe596a4a6ce7679ac28a30ad5`.
- Original `state(text,text)` fingerprint: `acf655257ca78625a460ab01945190a7`.
- `game_poc_memory_create_v2(text,jsonb,text,boolean)`: absent.
- `interface_language` / `allow_student_language_choice` columns: absent.
- Unexpired Memory rooms at observation time: 0. **Recheck immediately before change; this count can change.**
- Supabase migration history contained **14 migrations**, most recent `20261007071753_p2a1_homework_sql_rls_rpc_foundation`. Older runbook references to 13 migrations ending `20261004160000` are historical, not current; no new version has been reserved.

Initial checks were direct SQL SELECT/catalog inspections. The **exact full PRE script was subsequently executed successfully** in a read-only transaction; see dated execution evidence below. Re-run PRE at the approved change window.

## Migration scope reviewed

- UP is additive to **Memory only**: two room columns, `create_v2` RPC, and authorized `state` projection.
- Preserve legacy `create` and all existing turn/match/score/join APIs, their grants and hidden-card behavior.
- New RPC validates language and student-choice boolean, uses legacy validated allocation, updates exactly one newly created room, and grants execute to `anon`, not PUBLIC/`authenticated`.
- Old rooms remain German/locked by default.
- No SPP Auth, Homework, learner data, RLS, general tables, or other game schemas may change.
- Rollback SQL is destructive to language history; **frontend rollback should be preferred**. SQL rollback has strict safety checks and requires a separate decision.

## Remaining mandatory gates — no silent substitutions

1. **Reconcile SPP control-room authority.** Confirm current SPP main/release, active database change freeze, migration ledger ownership and canonical new version from its accepted migration tooling. Do not guess a version or execute untracked DDL via dashboard.
2. **Backup and recovery.** Verify an approved backup / PITR snapshot and actual restore procedure suitable for this shared production DB. A local unencrypted dump is not an assumed safe recovery solution.
3. **Isolated SQL rehearsal waiver (conditional).** The SPP control room allows skipping a separate disposable-database rehearsal **only after** verified SPP/Memory development freeze, refreshed encrypted transaction-consistent backup covering the present **65 tables** (older backup covers 58), canonical atomic SQL+ledger artifact, and explicit owner GO. Preserve full fresh PRE and POST/role-accurate client testing. Without these conditions, this is NO-GO for deployment.
4. **Operational fallback review.** Confirm the reviewed UP uses one atomic transaction, any error aborts cleanly, and legacy production frontend remains available. Review `03_MANUAL_DB_ROLLBACK_DRAFT.sql` separately; never run it on production as a convenience.
5. **Fresh production PRE.** Immediately before any owner-approved production migration, verify project ID, latest migration history, drift hashes, table/RLS/grants, unexpired rooms, backup readiness, and clean SPP app status.
6. **Owner-approved application.** Only the SPP owner/control room initiates the canonically tracked, atomic migration. A read-only audit or this document is **not** approval to apply it.
7. **POST and real anonymous-client QA.** After migration, perform structural POST, transactional synthetic smoke, then full role-accurate anon/browser host + two students testing (locked DE/EN/VI, individual language choice, refresh/rejoin, match/mismatch, auto-next, scoring, completion, no hidden-value/token leakage, legacy client). Hand step 3 testing to Antigravity only after migration gates pass and its environment is authorized.
8. **Deploy gate.** Frontend PR #6 requires `create_v2`; it cannot safely be deployed before the backend. Keep production Memory on legacy frontend until verified. Check staging/preview and monitor after owner approval.

## Environment and execution evidence

This control-room environment did **not** have a Docker daemon or `psql` client available, so **no executable isolated PostgreSQL test was run**. No migrations, DDL, POST synthetic writes, backups, restores, or SPP changes were performed. Do not mark M3a database-ready solely on the read-only observations.

See `README_DRAFT.md` and the numbered PRE / UP / POST / ROLLBACK scripts in this directory.

## Exact PRE script executed — 2026-10-09 23:15 ICT (16:15 UTC)

The repository's exact `00_PRE_READ_ONLY.sql` at blob `4a98c7e6ae8483b74f59f5976224c0d0233b0c9f` was executed on Supabase project `iizsyphqlezesbvaiztd`, wrapped in `BEGIN TRANSACTION READ ONLY; ... COMMIT;`. **No error was returned (PASS).** Connector output did not include `RAISE NOTICE` text. A follow-up read-only SELECT at `2026-10-09 16:15:04 UTC` confirmed:

- Unexpired Memory rooms: **0**
- Current Memory RPCs: **7**
- New v2 function: **absent**
- New room language columns: **0**
- Create fingerprint: `5e9d605fe596a4a6ce7679ac28a30ad5`
- State fingerprint: `acf655257ca78625a460ab01945190a7`

These checks supersede this file's earlier statement that the full PRE script had not been executed. **They do not validate UP execution, POST behavior, backup restoration, or anonymous-client tests.** Run PRE again immediately before any authorized migration, since state can change.

**Updated coordination decision:** The SPP control room issued **CONDITIONAL GO** for a streamlined rollout without a separate isolated SQL rehearsal, but explicitly maintained **NO-GO for execution** until an SPP/Memory development freeze is confirmed, a new verified encrypted 65-table backup covers Homework, and an atomic canonical SPP migration artifact is finalized. The fresh PRE, immediate independent POST/security checks and later Antigravity anon-client acceptance remain mandatory. SPP `main@bca04ca` and 14 applied migrations are the reported baseline. No production write was authorized.
