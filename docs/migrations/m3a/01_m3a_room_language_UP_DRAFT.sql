-- M3a ROOM LANGUAGE POLICY — DRAFT ONLY. DO NOT APPLY UNTIL SPP IS FROZEN AND APPROVED.
-- Target Supabase project: iizsyphqlezesbvaiztd (shared with Speak Practice Pro).
-- Only private.game_poc_memory_rooms and public.game_poc_memory_* routines may change.
-- A reviewed migration runner must execute this file atomically in one transaction.
-- No credentials or synthetic users are embedded in this migration.

-- Fail closed if underlying shared-prototype functions or structure changed since review.
DO $guard$
DECLARE
  v_create_md5 text;
  v_state_md5 text;
BEGIN
  SELECT md5(pg_get_functiondef('public.game_poc_memory_create(text,jsonb)'::regprocedure))
    INTO v_create_md5;
  SELECT md5(pg_get_functiondef('public.game_poc_memory_state(text,text)'::regprocedure))
    INTO v_state_md5;
  IF v_create_md5 IS DISTINCT FROM '5e9d605fe596a4a6ce7679ac28a30ad5'
    OR v_state_md5 IS DISTINCT FROM 'acf655257ca78625a460ab01945190a7' THEN
    RAISE EXCEPTION 'M3a baseline drift: re-review exact create/state function definitions before applying';
  END IF;
  IF to_regprocedure('public.game_poc_memory_create_v2(text,jsonb,text,boolean)') IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='private' AND table_name='game_poc_memory_rooms'
        AND column_name IN ('interface_language','allow_student_language_choice')
    ) THEN
    RAISE EXCEPTION 'M3a already present or partially installed: stop and reconcile';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='private' AND c.relname='game_poc_memory_rooms'
      AND c.relkind IN ('r','p') AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'M3a prerequisite missing: private Memory room table with RLS';
  END IF;
END
$guard$;

-- Legacy rooms and legacy create() always receive a safe German, locked default.
-- Both values are immutable after room creation by contract (no update RPC).
ALTER TABLE private.game_poc_memory_rooms
  ADD COLUMN interface_language text NOT NULL DEFAULT 'de'
    CONSTRAINT game_poc_memory_language_valid CHECK (interface_language IN ('de','en','vi')),
  ADD COLUMN allow_student_language_choice boolean NOT NULL DEFAULT false;

-- Keep existing two-argument create RPC untouched; no PostgREST overload ambiguity.
-- v2 calls the legacy server-authoritative validation and allocation path.
CREATE FUNCTION public.game_poc_memory_create_v2(
  p_title text,
  p_pairs jsonb,
  p_language text,
  p_allow_student_language_choice boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_created jsonb;
  v_code text;
BEGIN
  IF p_language IS NULL OR p_language NOT IN ('de','en','vi') THEN
    RAISE EXCEPTION 'Language must be de, en or vi' USING errcode='22023';
  END IF;
  IF p_allow_student_language_choice IS NULL THEN
    RAISE EXCEPTION 'Student language choice must be true or false' USING errcode='22023';
  END IF;

  v_created := public.game_poc_memory_create(p_title, p_pairs);
  v_code := v_created->>'roomCode';

  UPDATE private.game_poc_memory_rooms
  SET interface_language=p_language,
      allow_student_language_choice=p_allow_student_language_choice
  WHERE room_code=v_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'New Memory room disappeared before configuring language';
  END IF;

  RETURN v_created;
END
$function$;

-- Match existing prototype security: anon can execute; PUBLIC/authenticated cannot.
REVOKE ALL ON FUNCTION public.game_poc_memory_create_v2(text,jsonb,text,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.game_poc_memory_create_v2(text,jsonb,text,boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.game_poc_memory_create_v2(text,jsonb,text,boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.game_poc_memory_create_v2(text,jsonb,text,boolean) TO service_role;

-- Replace ONLY state projection. Preserve all existing authorization and hidden-card
-- projection behavior. The additional fields are visible only after a valid token check.
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
    'expiresAt',v_room.expires_at,
    'roomLanguage',v_room.interface_language,
    'allowStudentLanguageChoice',v_room.allow_student_language_choice
  );
END
$function$;

-- Existing state() signature/owner/grants are preserved by CREATE OR REPLACE.
-- Nothing here changes game turns, players, tokens, scoring, or SPP tables.
