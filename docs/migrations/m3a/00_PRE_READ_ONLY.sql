-- M3a PRE — READ ONLY. Stop if any assertion fails.
-- Run against project iizsyphqlezesbvaiztd AFTER SPP dev freeze, BEFORE migration.
-- If baseline fingerprints differ, re-review; do not blindly update hashes.
DO $pre$
DECLARE v_cols int; v_count int;
BEGIN
 IF current_database() IS NULL THEN RAISE EXCEPTION 'No database'; END IF;
 IF md5(pg_get_functiondef('public.game_poc_memory_create(text,jsonb)'::regprocedure)) <> '5e9d605fe596a4a6ce7679ac28a30ad5'
 OR md5(pg_get_functiondef('public.game_poc_memory_state(text,text)'::regprocedure)) <> 'acf655257ca78625a460ab01945190a7'
 THEN RAISE EXCEPTION 'Function drift: do not apply M3a'; END IF;
 IF to_regprocedure('public.game_poc_memory_create_v2(text,jsonb,text,boolean)') IS NOT NULL
 THEN RAISE EXCEPTION 'v2 already exists'; END IF;
 SELECT count(*) INTO v_cols FROM information_schema.columns
 WHERE table_schema='private' AND table_name='game_poc_memory_rooms'
 AND column_name IN ('interface_language','allow_student_language_choice');
 IF v_cols <> 0 THEN RAISE EXCEPTION 'Unexpected language columns: %',v_cols; END IF;
 SELECT count(*) INTO v_count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname LIKE 'game_poc_memory_%';
 IF v_count <> 7 THEN RAISE EXCEPTION 'Expected seven prototype RPCs, saw %',v_count; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='private.game_poc_memory_rooms'::regclass)
 THEN RAISE EXCEPTION 'Memory RLS is not enabled'; END IF;
 IF NOT has_function_privilege('anon','public.game_poc_memory_create(text,jsonb)','EXECUTE')
 OR NOT has_function_privilege('anon','public.game_poc_memory_state(text,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.game_poc_memory_create(text,jsonb)','EXECUTE')
 THEN RAISE EXCEPTION 'Prototype RPC grants differ from reviewed baseline'; END IF;
 RAISE NOTICE 'M3a PRE PASS — no writes performed';
END
$pre$;
