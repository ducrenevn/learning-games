# M3a Supabase migration runbook — DRAFT / HOLD

**Target only:** Supabase `iizsyphqlezesbvaiztd` (SPP + Learning Games shared project). **No migration has been applied.** Do not run before the owner confirms SPP dev freeze, backups, and reviewed change window.

## Baseline verified read-only 2026-10-09
- `private.game_poc_memory_rooms` RLS ON; approx 17 rows at inspection; `private.game_poc_memory_players` RLS ON (~20 rows).
- Seven `public.game_poc_memory_*` RPCs, SECURITY DEFINER with empty search_path.
- Old `create(text,jsonb)` MD5 `5e9d605fe596a4a6ce7679ac28a30ad5`; `state(text,text)` MD5 `acf655257ca78625a460ab01945190a7`.
- Original `create` and `state`: EXECUTE anon, service_role and postgres; NOT authenticated. Preserve.
- Original Supabase migration history has 13 SPP migrations through `20261004160000`. This is a *new* Learning Games migration proposal, NOT an existing SPP migration.

## Planned UP
1. Add `interface_language text NOT NULL DEFAULT 'de' CHECK IN ('de','en','vi')` and `allow_student_language_choice boolean NOT NULL DEFAULT false` to **private.game_poc_memory_rooms only**. Existing rooms are locked German (safe compatibility). No data deletions.
2. Add new `public.game_poc_memory_create_v2(text,jsonb,text,boolean)`, retaining legacy `create` untouched. It validates policy, calls legacy create to preserve token issuance and validation, sets room policy in the same transaction, and returns the original capabilities.
3. Replace *only* the existing state function body; preserve its original function signature, auth before projection, hidden card semantics and grants; append `roomLanguage` and `allowStudentLanguageChoice` to authorized state JSON. No changes to `join/flip/next/skip/start`.
4. Exact-function fingerprints guard against drift; schema guard stops partial re-application. Use a transaction with `SET LOCAL lock_timeout='5s'`, `SET LOCAL statement_timeout='60s'`; fail closed.

## Freeze and review gate — owner action
- Stop concurrent SPP development and migrations, ensure clean SPP `main` and deployment baseline, verify no app errors.
- Verify correct Supabase project reference in dashboard; take a confirmed DB snapshot / PITR recovery point as available and retain the original `state()` definition.
- Review exact SQL files and diff; obtain explicit owner GO to apply. Any drift/failure = STOP, do not force.
- Current production Vercel still uses older `create` and still works after additive migration.

## Order
1. Run `00_PRE_READ_ONLY.sql` and confirm PASS; retain results and migration history.
2. Apply exactly `01_m3a_room_language_UP_DRAFT.sql` via reviewed migration runner as **one atomic migration**, not multiple dashboard snippets.
3. Run `02_POST_AND_ROLLBACK_SMOKE.sql` structural assertions and rollback-only synthetic room test; verify no rows remain.
4. Complete M3a frontend option/conditional language UI on isolated branch and test against migrated backend via **preview**, including locked and choice rooms, DE/EN/VI, QR join, refresh, and existing client.
5. Owner approves merge after green QA. Merge and monitor new Vercel release.
6. Resume SPP development only when all checks and monitoring are clean.

## Rollback
- **Preferred rollout stop:** Keep existing Vercel `main` frontend, which still calls legacy create. Failed frontend rollout → revert deployment; additive DB change is harmless to old callers.
- If DB rollback required, follow `03_MANUAL_DB_ROLLBACK_DRAFT.sql` only after confirming no new v2 rooms require language policies. It restores old state projection, drops v2 and the two columns; **destructive to stored language settings**. Never blindly run during active games.
- If deployment or SQL checks fail, halt and reconcile against live schema; do not alter any SPP migration, tables, auth, RLS or policies.

## Separate security advisory (NOT PART OF M3a)
Supabase table listing reported `private.maintenance_state` with RLS disabled. This is outside Memory and must be independently evaluated by the SPP control room; do not enable RLS as a side effect, since it can change SPP behavior.

## M3a UX contract
- No accounts, profiles or remembered global language choice.
- App selection routes show a top-right DE/EN/VI language switch (in-memory).
- Room create option: everyone same language (no student switch; server roomLanguage controls interface) OR students choose (switch appears on join/lobby).
- Vocabulary never auto-translated. The policy is immutable for the life of the room.
