# Prototype Backend Baseline

## Shared migration history reconciliation (read-only, 2026-10-30)

All three Learning Games migrations present in `ducrenevn/learning-games@main` are **byte-identical by Git blob SHA** to corresponding committed files in `ducrenevn/speak-practice-pro@main`: `20261011020958`, `20261014`, `20261015023239`. The SPP mirror PR #12 is now **closed and unmerged**; its incomplete historical branch is **not** evidence that the mainline source is missing. The shared Supabase ledger has **22** migrations total, with these three included. This reconciles earlier release-era PR #12 TODO wording below; no SQL edit, reinstall, history repair or schema action is required. Legacy Memory reproducibility and runtime quota/retention controls remain separate, unproven/qualified risks.

## Shipped and independently inspected backend (2026-10-16)

Learning Games v1 is in Production at `main@360f641ba05943f17b78d1993890f2ec865b5ea4`. Online Memory Turns and Sort Individual use the existing shared SPP Supabase project `iizsyphqlezesbvaiztd`; there are **no new hosted database changes in release PR #19**.

| Installed migration source (immutable) | Ledger version | Purpose |
| --- | --- | --- |
| `20261011020958_lg_m3a_memory_room_language.sql` | `20261011020958` | Memory room-language policy / `create_v2` |
| `20261014_001_mp1_ab_sort_individual.sql` | `20261014` | Sort Individual four tables + RPC |
| `20261015023239_mp1_reveal_lifecycle.sql` | `20261015023239` | Results reveal lifecycle and finish guard |

Read-only connected Supabase audit confirmed **17 migration ledger entries**, exact committed/live function bodies for `lg_v1.state` and `lg_v1.command`, anonymous EXECUTE on intended four internal entries plus four public wrappers only, no anonymous table DML/SELECT grants, and RLS enabled on all four MP1 tables. A separate Supabase Dashboard browser inspection reloaded and confirmed Data API exposed schemas `public` and `graphql_public` only; `lg_v1` and `private` are **not exposed**. The Dashboard's "Automatically expose new tables" setting was enabled; track for the shared-project owner.

No historical migration files may be rewritten or replayed. Legacy Memory's original installation DDL is not wholly recoverable from the current migration chain; a clean install remains unproven. [SPP PR #12](https://github.com/ducrenevn/speak-practice-pro/pull/12) was still draft and missing the third migration on its remote branch at the last check; coordinate before any SPP `db push`. The ongoing exposure/retention/validation limitations are in [release closure](../releases/2026-10-16-v1-production.md) and [risk register](../RELEASE_PREFLIGHT.md).

## Legacy Memory inventory and safety rules

Supabase project reference: `iizsyphqlezesbvaiztd` (SPP production project, so be careful).

Existing prototype, not a hosted migration from this repo:
- `private.game_poc_memory_rooms`
- `private.game_poc_memory_players`
- `public.game_poc_memory_create(p_title text,p_pairs jsonb)`
- `public.game_poc_memory_join(p_room_code text,p_display_name text)`
- `public.game_poc_memory_state(p_room_code text,p_token text)`
- `public.game_poc_memory_start(p_room_code text,p_host_token text)`
- `public.game_poc_memory_flip(p_room_code text,p_player_token text,p_card_id integer,p_expected_revision bigint)`
- `public.game_poc_memory_next(p_room_code text,p_token text,p_expected_revision bigint)`
- `public.game_poc_memory_skip(p_room_code text,p_host_token text,p_expected_revision bigint)`

The legacy baseline records functions as `SECURITY DEFINER`, granted to `anon`, with no direct `anon` table reads; this is not a new verification of live grants. The prototype uses bearer capabilities in web storage. It is not a permanent production authorization model and should be used with **synthetic identities** pending review.

Do not include actual host tokens, student tokens, secret keys or real learner records in code, issue bodies or debugging screenshots.

Production changes to RPC logic, grants, policies, schema and SPP domain integration require a separate, reviewed proposal. Read-only inspection is permitted.

## M3a language-policy note (2026-10-12)
The later Memory language migration is reported applied and verified. See [CURRENT_STATE](../CURRENT_STATE.md); do not recreate or reapply it as part of LG-A1 documentation, sorting, or migration planning.

## Shared Supabase migration history

Learning Games migrations are authored and retained in `supabase/migrations/` in Learning Games. The intended shared-history rule is to mirror each migration byte-for-byte with its exact versioned filename in SPP's authoritative `supabase/migrations/` directory. That reconciliation remains outstanding in draft SPP PR #12; it is not authorized work for this preflight. Any future hosted apply must have separate approval and run from the SPP repository after history/target verification. Never use migration repair to compensate for missing local history, and never reapply an already-installed migration.
