-- M3a PRE — READ ONLY; fail closed on ANY prerequisite drift.
-- Target only: iizsyphqlezesbvaiztd. Verify project ID, SPP freeze, backup,
-- isolated restore proof, and ledger through the release runbook first.
-- Run immediately before the reviewed, canonically tracked migration.
DO $pre$
DECLARE
 v_cols integer;
 v_count integer;
 v_active bigint;
BEGIN
 IF to_regclass('private.game_poc_memory_rooms') IS NULL
    OR to_regclass('private.game_poc_memory_players') IS NULL THEN
   RAISE EXCEPTION 'Memory prototype tables missing; stop';
 END IF;
 IF md5(pg_get_functiondef('public.game_poc_memory_create(text,jsonb)'::regprocedure))
       IS DISTINCT FROM '5e9d605fe596a4a6ce7679ac28a30ad5'
    OR md5(pg_get_functiondef('public.game_poc_memory_state(text,text)'::regprocedure))
       IS DISTINCT FROM 'acf655257ca78625a460ab01945190a7' THEN
   RAISE EXCEPTION 'Create/state function drift; stop and re-review, never change hashes blindly';
 END IF;
 IF to_regprocedure('public.game_poc_memory_create_v2(text,jsonb,text,boolean)') IS NOT NULL THEN
   RAISE EXCEPTION 'Memory create_v2 already exists; reconcile before running';
 END IF;
 SELECT count(*) INTO v_cols FROM information_schema.columns
 WHERE table_schema='private' AND table_name='game_poc_memory_rooms'
   AND column_name IN ('interface_language','allow_student_language_choice');
 IF v_cols <> 0 THEN
   RAISE EXCEPTION 'Unexpected language columns: %; stop',v_cols;
 END IF;
 SELECT count(*) INTO v_count
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname LIKE 'game_poc_memory_%';
 IF v_count <> 7 THEN RAISE EXCEPTION 'Expected seven existing Memory RPCs, saw %',v_count; END IF;
 IF EXISTS (
   SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname LIKE 'game_poc_memory_%'
     AND (NOT p.prosecdef
       OR NOT ('search_path=""' = ANY(coalesce(p.proconfig, ARRAY[]::text[])))
       OR NOT has_function_privilege('anon',p.oid,'EXECUTE')
       OR has_function_privilege('authenticated',p.oid,'EXECUTE')
       OR EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
                  WHERE a.grantee=0 AND a.privilege_type='EXECUTE'))
 ) THEN
   RAISE EXCEPTION 'Existing Memory RPC security or grants drift; stop';
 END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='private.game_poc_memory_rooms'::regclass)
    OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='private.game_poc_memory_players'::regclass)
    OR has_table_privilege('anon','private.game_poc_memory_rooms','SELECT')
    OR has_table_privilege('anon','private.game_poc_memory_players','SELECT') THEN
   RAISE EXCEPTION 'Memory private table RLS / grants drift; stop';
 END IF;
 SELECT count(*) INTO v_active FROM private.game_poc_memory_rooms WHERE expires_at > now();
 RAISE NOTICE 'M3a PRE PASS (read-only): existing Memory RPCs=%, currently unexpired rooms=%; verify live sessions before change',v_count,v_active;
END
$pre$;
