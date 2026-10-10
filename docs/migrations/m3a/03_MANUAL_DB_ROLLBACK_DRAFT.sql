-- M3a rollback, MANUAL / DESTRUCTIVE. NOT TO EXECUTE WITHOUT OWNER APPROVAL.
-- This discards v2 policy columns; never apply while v2 rooms/clients active.
-- Favor rolling back the frontend first. Run only after dedicated rollback PRE + explicit GO.
-- Safe default: require ALL Memory rooms to expire, not only non-default v2 rooms.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DO $guard$
BEGIN
 IF to_regprocedure('public.game_poc_memory_create_v2(text,jsonb,text,boolean)') IS NULL
 OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='private' AND table_name='game_poc_memory_rooms' AND column_name='interface_language')
 THEN RAISE EXCEPTION 'M3a absent/partially applied, refusing manual rollback'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns
               WHERE table_schema='private' AND table_name='game_poc_memory_rooms'
                 AND column_name='allow_student_language_choice')
 THEN RAISE EXCEPTION 'Partial M3a installation: missing allow_student_language_choice'; END IF;
 IF EXISTS(SELECT 1 FROM private.game_poc_memory_rooms WHERE expires_at > now())
 THEN RAISE EXCEPTION 'Active/unexpired Memory rooms exist: rollback prohibited'; END IF;
 IF EXISTS(SELECT 1 FROM private.game_poc_memory_rooms
           WHERE interface_language <> 'de' OR allow_student_language_choice)
 THEN RAISE EXCEPTION 'Historical rooms contain non-default policies. Destructive rollback requires a separately documented archive/waiver and new review'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='private.game_poc_memory_rooms'::regclass)
 THEN RAISE EXCEPTION 'Room RLS drift: stop'; END IF;
END
$guard$;
-- Restore the prior state projection, verbatim apart from normalized formatting.
CREATE OR REPLACE FUNCTION public.game_poc_memory_state(p_room_code text, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_room private.game_poc_memory_rooms%rowtype;
  v_hash text;
  v_player_id uuid;
  v_is_host boolean;
  v_players jsonb;
  v_cards jsonb;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid session capability' USING errcode='42501';
  END IF;
  v_hash := encode(extensions.digest(p_token,'sha256'),'hex');
  SELECT * INTO v_room FROM private.game_poc_memory_rooms
   WHERE room_code=upper(btrim(p_room_code)) AND expires_at > now();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found or expired' USING errcode='P0002';
  END IF;
  v_is_host := (v_room.host_token_hash = v_hash);
  IF NOT v_is_host THEN
    SELECT id INTO v_player_id FROM private.game_poc_memory_players
     WHERE room_id=v_room.id AND player_token_hash=v_hash;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid room capability' USING errcode='42501';
    END IF;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'name', p.display_name, 'score', p.score
  ) ORDER BY p.joined_at,p.id),'[]'::jsonb)
    INTO v_players
    FROM private.game_poc_memory_players p WHERE p.room_id=v_room.id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', (c.card->>'id')::integer,
      'matched', (v_room.matched_pairs @> jsonb_build_array((c.card->>'pair_id')::integer)),
      'visible', (
        v_room.first_pick=(c.card->>'id')::integer
        OR v_room.second_pick=(c.card->>'id')::integer
        OR (v_room.matched_pairs @> jsonb_build_array((c.card->>'pair_id')::integer))
      ),
      'value', CASE WHEN (
        v_room.first_pick=(c.card->>'id')::integer
        OR v_room.second_pick=(c.card->>'id')::integer
        OR (v_room.matched_pairs @> jsonb_build_array((c.card->>'pair_id')::integer))
      ) THEN c.card->>'value' ELSE null END
    ) ORDER BY (c.card->>'id')::integer),'[]'::jsonb)
    INTO v_cards
    FROM jsonb_array_elements(v_room.board) c(card);

  RETURN jsonb_build_object(
    'roomCode',v_room.room_code,
    'title',v_room.title,
    'status',v_room.status,
    'revision',v_room.revision,
    'isHost',v_is_host,
    'myPlayerId',v_player_id,
    'players',v_players,
    'currentPlayerId',v_room.current_player_id,
    'cards',v_cards,
    'phase',CASE
      WHEN v_room.status='lobby' THEN 'lobby'
      WHEN v_room.status='finished' THEN 'finished'
      WHEN v_room.second_pick IS NOT NULL THEN 'resolve'
      WHEN v_room.first_pick IS NOT NULL THEN 'second'
      ELSE 'first'
    END,
    'lastMatch',v_room.last_match,
    'canFlip',(v_room.status='active' AND v_room.second_pick IS NULL
      AND v_player_id IS NOT NULL AND v_room.current_player_id=v_player_id),
    'expiresAt',v_room.expires_at
  );
END
$function$;
DROP FUNCTION public.game_poc_memory_create_v2(text,jsonb,text,boolean);
ALTER TABLE private.game_poc_memory_rooms
 DROP COLUMN allow_student_language_choice,
 DROP COLUMN interface_language;
COMMIT;
