-- M3a POST structural checks. READ ONLY. Requires UP completed.
DO $post$
DECLARE v_bad bigint; v_total bigint;
BEGIN
 IF to_regprocedure('public.game_poc_memory_create_v2(text,jsonb,text,boolean)') IS NULL
 THEN RAISE EXCEPTION 'v2 missing'; END IF;
 IF NOT (SELECT p.prosecdef FROM pg_proc p WHERE p.oid='public.game_poc_memory_create_v2(text,jsonb,text,boolean)'::regprocedure)
 THEN RAISE EXCEPTION 'v2 is not SECURITY DEFINER'; END IF;
 IF NOT has_function_privilege('anon','public.game_poc_memory_create_v2(text,jsonb,text,boolean)','EXECUTE')
 OR has_function_privilege('authenticated','public.game_poc_memory_create_v2(text,jsonb,text,boolean)','EXECUTE')
 OR EXISTS (SELECT 1 FROM aclexplode((SELECT proacl FROM pg_proc WHERE oid='public.game_poc_memory_create_v2(text,jsonb,text,boolean)'::regprocedure)) WHERE grantee=0 AND privilege_type='EXECUTE')
 THEN RAISE EXCEPTION 'v2 grants wrong'; END IF;
 SELECT count(*),count(*) FILTER(WHERE interface_language NOT IN ('de','en','vi') OR interface_language IS NULL OR allow_student_language_choice IS NULL)
 INTO v_total,v_bad FROM private.game_poc_memory_rooms;
 IF v_bad<>0 THEN RAISE EXCEPTION 'Invalid language settings in % rooms',v_bad; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='private.game_poc_memory_rooms'::regclass)
 THEN RAISE EXCEPTION 'Memory RLS disabled'; END IF;
 RAISE NOTICE 'M3a POST structural PASS; rooms=%',v_total;
END
$post$;

-- Transactional functional smoke. This section intentionally inserts and then ROLLS
-- BACK synthetic rooms. Run as a single transaction in an SQL editor/session.
BEGIN;
DO $smoke$
DECLARE v jsonb; s jsonb; old_room jsonb; old_state jsonb;
BEGIN
 v := public.game_poc_memory_create_v2('M3a TEMP test', '[{"left":"A","right":"B"},{"left":"C","right":"D"}]'::jsonb, 'vi', true);
 s := public.game_poc_memory_state(v->>'roomCode',v->>'hostToken');
 IF s->>'roomLanguage'<>'vi' OR s->>'allowStudentLanguageChoice'<>'true'
 THEN RAISE EXCEPTION 'v2 state did not reflect room policy'; END IF;
 IF s ? 'hostToken' OR s ? 'pairs' OR s ? 'host_token_hash'
 THEN RAISE EXCEPTION 'Sensitive data in state'; END IF;
 old_room := public.game_poc_memory_create('M3a legacy TEMP', '[{"left":"A","right":"B"},{"left":"C","right":"D"}]'::jsonb);
 old_state := public.game_poc_memory_state(old_room->>'roomCode',old_room->>'hostToken');
 IF old_state->>'roomLanguage'<>'de' OR old_state->>'allowStudentLanguageChoice'<>'false'
 THEN RAISE EXCEPTION 'Legacy default failed'; END IF;
 BEGIN
   PERFORM public.game_poc_memory_create_v2('Reject TEMP','[{"left":"A","right":"B"},{"left":"C","right":"D"}]'::jsonb,'xx',false);
   RAISE EXCEPTION 'Invalid language unexpectedly accepted';
 EXCEPTION WHEN sqlstate '22023' THEN NULL;
 END;
 BEGIN
   PERFORM public.game_poc_memory_state(v->>'roomCode',repeat('0',64));
   RAISE EXCEPTION 'Unauthorized state unexpectedly accessible';
 EXCEPTION WHEN sqlstate '42501' THEN NULL;
 END;
 RAISE NOTICE 'M3a POST functional PASS — rolling back synthetic rooms';
END
$smoke$;
ROLLBACK;

-- FOLLOW UP OUTSIDE SQL: test anon RPC via real hosted preview client,
-- joining as two synthetic students; confirm no token in QR or logs.
