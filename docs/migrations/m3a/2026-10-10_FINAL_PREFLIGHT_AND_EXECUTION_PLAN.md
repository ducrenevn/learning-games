# M3a FINAL PREFLIGHT & EXECUTION PLAN — October 10, 2026

**Verdict:** READ-ONLY PRE PASS; PREPARATION GO; **PRODUCTION SQL NO-GO UNTIL SPECIFIC OWNER AUTHORIZATION**.

## Authority and scope

- Receiving authority: SPP control room at `ducrenevn/speak-practice-pro main@72656c6ada22a1fc80e71541f15fc850ba8b4288`. Homework P2a-6d live and owner smoke passed.
- Learning Games clean database-only review: `review/m3a-database-release-ready-20261010`, based on `main@f8ac534026b4fcdcfa0ffa15e61890a4e5389c62`; no frontend files modified.
- Shared project: `iizsyphqlezesbvaiztd`, PostgreSQL 17.11.
- The isolated-database rehearsal waiver is **conditional**. Fresh current-schema backup, quiet SPP/Memory window, canonical migration and explicit execution GO remain required.

## Live preflight evidence

At **2026-10-10 16:30:39 UTC (23:30:39 ICT)**, ran the exact reviewed `00_PRE_READ_ONLY.sql` (GitHub blob `4a98c7e6ae8483b74f59f5976224c0d0233b0c9f`) inside a read-only transaction. SQL completed without error.

| Inspection | Observed |
| --- | --- |
| Applied migration ledger | 14, through `20261007071753_p2a1_homework_sql_rls_rpc_foundation` |
| Tables in public/private/auth/supabase_migrations | 65 |
| Memory historical rooms / players | 17 / 20 |
| Unexpired Memory rooms | 0 at the inspection instant |
| Language columns | 0 |
| New create_v2 function | Absent |
| Legacy functions | Seven; exact fingerprints, grants, SECURITY DEFINER and empty search_path verified by PRE |
| Memory private tables | RLS and denial of direct anon table SELECT verified by PRE |

A successful SELECT/PRE is not proof of backup completeness, durable freeze, SQL migration behavior, or anonymous browser tests. No writes were made.

## SQL artifact and reconciliation

Reviewed UP script: `docs/migrations/m3a/01_m3a_room_language_UP_DRAFT.sql` (source copied without changes from reviewed M3a PR #5). It adds exactly two columns to `private.game_poc_memory_rooms`, `public.game_poc_memory_create_v2(text,jsonb,text,boolean)`, and two authorized fields to existing `public.game_poc_memory_state(text,text)`. Keeps legacy room creation/other Memory RPCs and SPP tables untouched.

Comparison of live `state` definition to reviewed replacement shows its existing projection/authorization logic preserved; only intended response fields are added, with formatting normalization. Existing PRE guards catch drift.

**Canonical source target must be `ducrenevn/speak-practice-pro/supabase/migrations`, not this Learning Games review folder.** Reserve a filename/version through the installed SPP Supabase CLI (`supabase migration new ...`), do not invent one here. Copy the *approved exact UP body* into that migration, inspect whether its nested `BEGIN;`/`COMMIT;` are compatible with the chosen runner, and confirm the migration is recorded atomically in `supabase_migrations.schema_migrations` rather than as an untracked dashboard execution. Do not assume a multi-statement MCP `apply_migration` automatically preserves this guarantee; SPP operator must select and verify the exact method. Record SHA-256 checksum, SPP commit and PR before the window.

## Mandatory execution gates

1. **Owner-approved recovery checkpoint:** new encrypted, transaction-consistent backup spanning all **65 current tables**, including `public`, `private`, `auth`, `supabase_migrations`; independently verify inventory/table counts, ciphertext integrity, recoverability and off-repo key storage. Old 58-table archive is inadequate. Full isolated restore may be deferred only under accepted risk waiver.
2. **Quiet window/freeze:** SPP owner confirms no competing SPP Homework classroom writes, Antigravity browser dogfood, Memory rooms, or backend agents/migrations during the window; inspect locks/active queries and reconfirm zero unexpired rooms immediately before UP. Idle snapshot alone is not a freeze.
3. **Canonical artifact:** SPP migration filename reserved; reviewed exact SQL/hash registered in Git and reconciled to `main@72656c6` or successor; explicit confirmation DDL and ledger entry are atomic, no double-wrapped transaction behavior or separate ledger commit.
4. **Specific GO:** owner explicitly authorizes **that version/checksum**, exact target project, named operator, window and recovery method. This preparation GO is not execution approval.

## Operator sequence (only AFTER all gates)

- Verify project ID/version and current migration history, backup, SPP production health and actual quiet window.
- Re-execute the complete `00_PRE_READ_ONLY.sql` in a read-only transaction. Any drift or nonzero unexpired rooms → STOP; do not force.
- Apply **one reviewed, canonical, atomically tracked** UP. No additional SPP changes and no maintenance `writes_open` changes.
- Independently confirm exactly one new migration version, two columns, correct defaults and check constraint, new `create_v2` security/grants/empty search path, preserved legacy fingerprints/grants/RLS, unchanged historic row counts/data/other SPP schema.
- Run `02_POST_AND_ROLLBACK_SMOKE.sql` structural checks; synthetic functional transaction must end in ROLLBACK and leave zero synthetic rooms/players. Do not classify privileged SQL smoke as anon-role evidence.
- Verify old production Memory `create` and SPP Homework teacher/student existing paths remain healthy without creating real student data.
- Authorized Antigravity host + 2 students browser/anon API tests on a preview of PR #6: locked DE/EN/VI, language-choice room, QR, refresh, correct/mismatch, scores, completion, hidden cards, authorization.
- Only after full QA and separate owner authorization, consider frontend merge/deploy to `main`; monitor. Ordinary SPP teaching resumes after the coordinated window when safe.

## Stop and recovery

- Any failed PRE/SQL/POST or unexpected schema/rights/data change → **STOP**, preserve logs and inspect transaction/ledger state. Do not rerun partially applied SQL.
- Preferred mitigation is retaining/redeploying legacy Learning Games production frontend (still uses old create). The M3a DB change is additive and backwards compatible when applied correctly.
- `03_MANUAL_DB_ROLLBACK_DRAFT.sql` is destructive of stored language policies, prohibits unexpired rooms, and is never an automatic rollback.
- If SPP Homework regression or data loss occurs, escalate to the SPP owner/control room and follow the verified backup/recovery process; do not toggle global write gate speculatively.

## Unverified as of this report

- Fresh 65-table encrypted backup: **not verified here**.
- SPP migration filename/version, atomic runner and artifact checksum: **not finalized**.
- Sustained quiet window: **not established**.
- Specific owner GO to apply production SQL: **not granted**.
- Production M3a UP/POST/anon browser acceptance: **not executed**.
