# M3a read-only baseline and isolated-rehearsal gate — 2026-10-09

**Status: READ-ONLY BASELINE VERIFIED; ISOLATED REHEARSAL NOT EXECUTED; PRODUCTION MIGRATION ON HOLD.**

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

These are direct SQL SELECT/catalog inspections and API migration listings, **not** execution of the `00_PRE_READ_ONLY.sql` DO block itself. That entire script must still run at the approved change window.

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
3. **Isolated SQL rehearsal.** On a disposable PG17/Supabase-compatible database constructed from a *sanitized* or synthetic baseline matching the seven legacy RPCs and tables, execute the full `00_PRE_READ_ONLY.sql` → `01_m3a_room_language_UP_DRAFT.sql` → `02_POST_AND_ROLLBACK_SMOKE.sql` sequence. Verify exact function creation, privilege isolation, legacy compatibility, student state, null/invalid input, hidden cards, and rollback of synthetic tests. Confirm no leaked test records.
4. **Rehearsal of operational fallback.** Simulate an UP failure and confirm atomic transaction rollback; review `03_MANUAL_DB_ROLLBACK_DRAFT.sql` separately, never run it on production as a convenience.
5. **Fresh production PRE.** Immediately before any owner-approved production migration, verify project ID, latest migration history, drift hashes, table/RLS/grants, unexpired rooms, backup readiness, and clean SPP app status.
6. **Owner-approved application.** Only the SPP owner/control room initiates the canonically tracked, atomic migration. A read-only audit or this document is **not** approval to apply it.
7. **POST and real anonymous-client QA.** After migration, perform structural POST, transactional synthetic smoke, then full role-accurate anon/browser host + two students testing (locked DE/EN/VI, individual language choice, refresh/rejoin, match/mismatch, auto-next, scoring, completion, no hidden-value/token leakage, legacy client). Hand step 3 testing to Antigravity only after migration gates pass and its environment is authorized.
8. **Deploy gate.** Frontend PR #6 requires `create_v2`; it cannot safely be deployed before the backend. Keep production Memory on legacy frontend until verified. Check staging/preview and monitor after owner approval.

## Environment and execution evidence

This control-room environment did **not** have a Docker daemon or `psql` client available, so **no executable isolated PostgreSQL test was run**. No migrations, DDL, POST synthetic writes, backups, restores, or SPP changes were performed. Do not mark M3a database-ready solely on the read-only observations.

See `README_DRAFT.md` and the numbered PRE / UP / POST / ROLLBACK scripts in this directory.
