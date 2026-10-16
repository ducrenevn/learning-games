# Prototype Backend Baseline

## Current installed baseline — 2026-10-16

The owner release handoff reports **three Learning Games migrations installed on shared SPP Supabase**, including the reveal lifecycle correction. Frozen frontend candidate `8c14b845ee4ed7892a224e9e336852255612362f` has functional Memory online and classroom-accepted Sort Individual online on Preview; Production merge is pending. This preflight does not independently inspect hosted SQL, grants or migration history. The separate SPP control room owns the read-only security/function-parity probe.

| Installed migration source in this repository | Purpose |
| --- | --- |
| `20261011020958_lg_m3a_memory_room_language.sql` | Legacy Memory room-language policy / `game_poc_memory_create_v2` |
| `20261014_001_mp1_ab_sort_individual.sql` | Sort Individual `lg_v1_*` foundation |
| `20261015023239_mp1_reveal_lifecycle.sql` | Server-authoritative reveal lifecycle correction |

These files are immutable applied history: do not edit or replay them. Legacy Memory tables/functions predate this repository's migration chain; **a clean replay of the complete legacy Memory backend remains unproven**. SPP PR #12 remains draft, with the migration-history mirror/reconciliation outstanding. File presence here is not evidence of complete SPP migration history. See [release risks](../RELEASE_PREFLIGHT.md).

The current application uses existing `game_poc_memory_*` and `lg_v1_*` public RPCs only. Anonymous room capabilities are not SPP identity. No hosted writes, new rooms, SQL changes or SPP/Auth/Homework modifications are authorized by this preflight.

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
