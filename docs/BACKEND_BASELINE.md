# Prototype Backend Baseline

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

Functions are `SECURITY DEFINER`, explicitly granted to `anon`; direct table reads are not available to `anon`. The prototype uses bearer capabilities in web storage. It is not a permanent production authorization model and should be used with **synthetic identities** pending review.

Do not include actual host tokens, student tokens, secret keys or real learner records in code, issue bodies or debugging screenshots.

Production changes to RPC logic, grants, policies, schema and SPP domain integration require a separate, reviewed proposal. Read-only inspection is permitted.
