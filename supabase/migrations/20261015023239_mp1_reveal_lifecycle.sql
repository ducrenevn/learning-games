-- Migration: 20261015023239_mp1_reveal_lifecycle.sql
-- Additive lifecycle correction for MP1 Sort Individual:
-- 1. Expose server-authoritative resultsRevealed (revealed_at IS NOT NULL) in lg_v1.state for host and student views.
-- 2. Guard room.finish in lg_v1.command to ensure results are revealed before finish is permitted.
-- 3. Maintain existing function signatures, lg_v1_owner ownership, anon grants, and search_path = ''.

CREATE OR REPLACE FUNCTION lg_v1.state(
  p_room_code text,
  p_token text,
  p_room_rev bigint DEFAULT NULL,
  p_attempt_rev bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_room lg_v1.rooms%ROWTYPE;
  v_actor lg_v1.actors%ROWTYPE;
  v_attempt lg_v1.attempts%ROWTYPE;
  v_snapshot lg_v1.snapshots%ROWTYPE;
  v_token_digest text;
BEGIN
  IF p_room_code IS NULL OR p_room_code !~ '^[A-Z0-9]{8}$' THEN
    RAISE EXCEPTION 'INVALID_ROOM_CODE';
  END IF;
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'INVALID_TOKEN';
  END IF;

  v_token_digest := lg_v1._safe_token(p_token);

  SELECT * INTO v_room
  FROM lg_v1.rooms
  WHERE room_code = upper(p_room_code);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  IF v_room.expires_at < now() THEN
    RAISE EXCEPTION 'ROOM_EXPIRED';
  END IF;

  SELECT * INTO v_actor
  FROM lg_v1.actors
  WHERE room_id = v_room.room_id AND token_digest = v_token_digest
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF v_actor.status <> 'active' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_snapshot FROM lg_v1.snapshots WHERE room_id = v_room.room_id;

  IF v_actor.actor_role = 'student' THEN
    SELECT * INTO v_attempt FROM lg_v1.attempts WHERE room_id = v_room.room_id AND actor_id = v_actor.actor_id;
    IF p_room_rev IS NOT NULL AND p_attempt_rev IS NOT NULL
       AND p_room_rev = v_room.room_revision
       AND p_attempt_rev = COALESCE(v_attempt.attempt_revision, 0) THEN
      RETURN jsonb_build_object(
        'roomRevision', v_room.room_revision,
        'attemptRevision', COALESCE(v_attempt.attempt_revision, 0),
        'unchanged', true
      );
    END IF;
    RETURN jsonb_build_object(
      'roomRevision', v_room.room_revision,
      'attemptRevision', COALESCE(v_attempt.attempt_revision, 0),
      'roomStatus', v_room.status,
      'game', v_room.game,
      'mode', v_room.mode,
      'roomLanguage', v_room.room_language,
      'allowStudentLanguageChoice', v_room.allow_student_language_choice,
      'resultsRevealed', (v_room.revealed_at IS NOT NULL),
      'studentView', COALESCE(v_snapshot.student_projection, jsonb_build_object('categories', jsonb_build_array(), 'items', jsonb_build_array())),
      'placements', COALESCE(v_attempt.placement, '{}'::jsonb),
      'submission', CASE
        WHEN v_attempt.completion_status = 'in_progress' THEN NULL
        ELSE jsonb_build_object('status', v_attempt.completion_status, 'submittedAt', v_attempt.submitted_at)
      END,
      'result', CASE WHEN v_room.revealed_at IS NOT NULL THEN jsonb_build_object(
        'score', v_attempt.score,
        'answerFeedback', (
          SELECT jsonb_object_agg(
            v_snapshot.private_mapping->'items'->>(item->>'id'),
            v_snapshot.private_mapping->'categories'->>(item->>'categoryId')
          )
          FROM jsonb_array_elements(COALESCE(v_snapshot.private_activity->'content'->'items', '[]'::jsonb)) AS items(item)
        )
      ) ELSE NULL END
    );
  END IF;

  IF p_room_rev IS NOT NULL AND p_room_rev = v_room.room_revision THEN
    RETURN jsonb_build_object('roomRevision', v_room.room_revision, 'unchanged', true);
  END IF;

  RETURN jsonb_build_object(
    'roomRevision', v_room.room_revision,
    'roomStatus', v_room.status,
    'game', v_room.game,
    'mode', v_room.mode,
    'roomLanguage', v_room.room_language,
    'allowStudentLanguageChoice', v_room.allow_student_language_choice,
    'resultsRevealed', (v_room.revealed_at IS NOT NULL),
    'hostView', jsonb_build_object(
      'status', v_room.status,
      'resultsRevealed', (v_room.revealed_at IS NOT NULL),
      'participants', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'participantId', a.actor_id,
            'role', a.actor_role,
            'displayName', a.display_name,
            'status', a.status,
            'completionStatus', t.completion_status
          ) || CASE WHEN v_room.status IN ('review', 'finished') AND a.actor_role = 'student'
            THEN jsonb_build_object('submission', t.submission, 'score', t.score)
            ELSE '{}'::jsonb
          END
          ORDER BY a.joined_at
        )
        FROM lg_v1.actors a
        LEFT JOIN lg_v1.attempts t ON t.room_id = a.room_id AND t.actor_id = a.actor_id
        WHERE a.room_id = v_room.room_id
      ),
      'studentCount', (
        SELECT count(*) FROM lg_v1.actors WHERE room_id = v_room.room_id AND actor_role = 'student'
      ),
      'answerReference', CASE WHEN v_room.status IN ('review', 'finished') THEN (
        SELECT jsonb_object_agg(
          v_snapshot.private_mapping->'items'->>(item->>'id'),
          v_snapshot.private_mapping->'categories'->>(item->>'categoryId')
        )
        FROM jsonb_array_elements(COALESCE(v_snapshot.private_activity->'content'->'items', '[]'::jsonb)) AS items(item)
      ) ELSE NULL END
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION lg_v1.command(
  p_room_code text,
  p_token text,
  p_kind text,
  p_payload jsonb,
  p_expected_room_rev bigint DEFAULT NULL,
  p_expected_attempt_rev bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_room lg_v1.rooms%ROWTYPE;
  v_actor lg_v1.actors%ROWTYPE;
  v_target_actor lg_v1.actors%ROWTYPE;
  v_attempt lg_v1.attempts%ROWTYPE;
  v_snapshot lg_v1.snapshots%ROWTYPE;
  v_token_digest text;
  v_payload_item_handle text;
  v_payload_category_handle text;
  v_current_category_handle text;
  v_next_room_rev bigint;
  v_next_attempt_rev bigint;
BEGIN
  IF p_room_code IS NULL OR p_room_code !~ '^[A-Z0-9]{8}$' THEN
    RAISE EXCEPTION 'INVALID_ROOM_CODE';
  END IF;
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'INVALID_TOKEN';
  END IF;

  v_token_digest := lg_v1._safe_token(p_token);

  IF p_kind = 'sort.place' THEN
    SELECT * INTO v_room
    FROM lg_v1.rooms
    WHERE room_code = upper(p_room_code)
    FOR SHARE;
  ELSE
    SELECT * INTO v_room
    FROM lg_v1.rooms
    WHERE room_code = upper(p_room_code)
    FOR NO KEY UPDATE;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  SELECT * INTO v_actor
  FROM lg_v1.actors
  WHERE room_id = v_room.room_id AND token_digest = v_token_digest
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF v_actor.status <> 'active' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_snapshot FROM lg_v1.snapshots WHERE room_id = v_room.room_id;

  CASE p_kind
    WHEN 'sort.place' THEN
      IF v_actor.actor_role <> 'student' OR v_actor.status <> 'active' THEN
        RAISE EXCEPTION 'FORBIDDEN';
      END IF;
      IF v_room.status <> 'active' THEN
        RAISE EXCEPTION 'ROOM_CLOSED';
      END IF;
      IF v_room.expires_at < now() THEN
        RAISE EXCEPTION 'ROOM_EXPIRED';
      END IF;
      IF p_expected_attempt_rev IS NULL THEN
        RAISE EXCEPTION 'REVISION_CONFLICT';
      END IF;

      SELECT * INTO v_attempt
      FROM lg_v1.attempts
      WHERE room_id = v_room.room_id AND actor_id = v_actor.actor_id
      FOR UPDATE;

      IF v_attempt.submission IS NOT NULL THEN
        RAISE EXCEPTION 'FORBIDDEN';
      END IF;

      IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
        RAISE EXCEPTION 'INVALID_PAYLOAD';
      END IF;
      IF NOT (p_payload ? 'itemHandle') OR jsonb_typeof(p_payload->'itemHandle') <> 'string'
         OR NOT (p_payload ? 'categoryHandle')
         OR jsonb_typeof(p_payload->'categoryHandle') NOT IN ('string', 'null') THEN
        RAISE EXCEPTION 'INVALID_PAYLOAD';
      END IF;
      v_payload_item_handle := p_payload->>'itemHandle';
      v_payload_category_handle := p_payload->>'categoryHandle';

      IF NOT EXISTS (
        SELECT 1
        FROM jsonb_each_text(COALESCE(v_snapshot.private_mapping->'items', '{}'::jsonb)) AS mapping(authored_id, handle)
        WHERE mapping.handle = v_payload_item_handle
      ) THEN
        RAISE EXCEPTION 'INVALID_PAYLOAD';
      END IF;

      IF v_payload_category_handle IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM jsonb_each_text(COALESCE(v_snapshot.private_mapping->'categories', '{}'::jsonb)) AS mapping(authored_id, handle)
        WHERE mapping.handle = v_payload_category_handle
      ) THEN
        RAISE EXCEPTION 'INVALID_PAYLOAD';
      END IF;

      v_current_category_handle := v_attempt.placement->>v_payload_item_handle;
      IF v_current_category_handle IS NOT DISTINCT FROM v_payload_category_handle THEN
        RETURN jsonb_build_object('roomRevision', v_room.room_revision, 'attemptRevision', v_attempt.attempt_revision, 'status', 'ok');
      END IF;

      IF p_expected_attempt_rev <> v_attempt.attempt_revision THEN
        RAISE EXCEPTION 'REVISION_CONFLICT';
      END IF;

      IF v_payload_category_handle IS NULL THEN
        v_attempt.placement := v_attempt.placement - v_payload_item_handle;
      ELSE
        v_attempt.placement := jsonb_set(v_attempt.placement, ARRAY[v_payload_item_handle], to_jsonb(v_payload_category_handle), true);
      END IF;
      v_attempt.attempt_revision := v_attempt.attempt_revision + 1;
      v_attempt.updated_at := now();
      UPDATE lg_v1.attempts
      SET placement = v_attempt.placement,
          attempt_revision = v_attempt.attempt_revision,
          updated_at = now()
      WHERE attempt_id = v_attempt.attempt_id;

      RETURN jsonb_build_object(
        'roomRevision', v_room.room_revision,
        'attemptRevision', v_attempt.attempt_revision,
        'status', 'ok'
      );

    WHEN 'sort.submit' THEN
      IF v_actor.actor_role <> 'student' OR v_actor.status <> 'active' THEN
        RAISE EXCEPTION 'FORBIDDEN';
      END IF;
      IF v_room.expires_at < now() OR v_room.status = 'expired' THEN
        RAISE EXCEPTION 'ROOM_EXPIRED';
      END IF;
      IF p_expected_attempt_rev IS NULL THEN
        RAISE EXCEPTION 'REVISION_CONFLICT';
      END IF;

      SELECT * INTO v_attempt
      FROM lg_v1.attempts
      WHERE room_id = v_room.room_id AND actor_id = v_actor.actor_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'FORBIDDEN';
      END IF;
      IF v_attempt.completion_status = 'submitted' THEN
        RETURN jsonb_build_object(
          'roomRevision', v_attempt.submitted_room_revision,
          'attemptRevision', v_attempt.attempt_revision,
          'status', 'submitted'
        );
      END IF;
      IF v_room.status <> 'active' THEN
        RAISE EXCEPTION 'ROOM_CLOSED';
      END IF;
      IF p_expected_attempt_rev <> v_attempt.attempt_revision THEN
        RAISE EXCEPTION 'REVISION_CONFLICT';
      END IF;
      IF EXISTS (
        SELECT 1
        FROM jsonb_each_text(COALESCE(v_snapshot.private_mapping->'items', '{}'::jsonb)) AS item(authored_id, handle)
        WHERE NOT (v_attempt.placement ? item.handle)
          OR NOT EXISTS (
            SELECT 1
            FROM jsonb_each_text(COALESCE(v_snapshot.private_mapping->'categories', '{}'::jsonb)) AS category(authored_id, handle)
            WHERE category.handle = v_attempt.placement->>item.handle
          )
      ) THEN
        RAISE EXCEPTION 'INCOMPLETE_ATTEMPT';
      END IF;
      IF p_expected_room_rev IS NULL OR p_expected_room_rev <> v_room.room_revision THEN
        RAISE EXCEPTION 'REVISION_CONFLICT';
      END IF;

      UPDATE lg_v1.rooms
      SET room_revision = room_revision + 1,
          updated_at = now()
      WHERE room_id = v_room.room_id
      RETURNING room_revision INTO v_room.room_revision;

      UPDATE lg_v1.attempts
      SET submission = v_attempt.placement,
          score = lg_v1._sort_score(v_snapshot.private_activity, v_snapshot.private_mapping, v_attempt.placement),
          completion_status = 'submitted',
          submitted_room_revision = v_room.room_revision,
          submitted_at = now(),
          attempt_revision = v_attempt.attempt_revision + 1,
          updated_at = now()
      WHERE attempt_id = v_attempt.attempt_id;

      RETURN jsonb_build_object(
        'roomRevision', v_room.room_revision,
        'attemptRevision', v_attempt.attempt_revision + 1,
        'status', 'submitted'
      );

    WHEN 'room.start' THEN
      IF v_actor.actor_role <> 'host' OR v_actor.status <> 'active' THEN
        RAISE EXCEPTION 'FORBIDDEN';
      END IF;
      IF v_room.expires_at < now() THEN
        UPDATE lg_v1.rooms SET status = 'expired', updated_at = now() WHERE room_id = v_room.room_id;
        RAISE EXCEPTION 'ROOM_EXPIRED';
      END IF;
      IF v_room.status = 'lobby' THEN
        IF p_expected_room_rev IS NULL OR p_expected_room_rev <> v_room.room_revision THEN
          RAISE EXCEPTION 'REVISION_CONFLICT';
        END IF;
        UPDATE lg_v1.rooms
        SET status = 'active',
            room_revision = room_revision + 1,
            updated_at = now()
        WHERE room_id = v_room.room_id;
      END IF;
      SELECT * INTO v_room FROM lg_v1.rooms WHERE room_id = v_room.room_id;
      RETURN jsonb_build_object('roomRevision', v_room.room_revision, 'roomStatus', v_room.status, 'status', 'ok');

    WHEN 'room.close' THEN
      IF v_actor.actor_role <> 'host' OR v_actor.status <> 'active' THEN
        RAISE EXCEPTION 'FORBIDDEN';
      END IF;
      IF v_room.expires_at < now() THEN
        UPDATE lg_v1.rooms SET status = 'expired', updated_at = now() WHERE room_id = v_room.room_id;
        RAISE EXCEPTION 'ROOM_EXPIRED';
      END IF;
      IF v_room.status = 'review' THEN
        RETURN jsonb_build_object('roomRevision', v_room.room_revision, 'roomStatus', v_room.status, 'status', 'ok');
      END IF;
      IF v_room.status <> 'active' THEN
        RAISE EXCEPTION 'ROOM_CLOSED';
      END IF;
      IF p_expected_room_rev IS NULL OR p_expected_room_rev <> v_room.room_revision THEN
        RAISE EXCEPTION 'REVISION_CONFLICT';
      END IF;

      FOR v_attempt IN
        SELECT *
        FROM lg_v1.attempts
        WHERE room_id = v_room.room_id
          AND completion_status = 'in_progress'
          AND submission IS NULL
        ORDER BY actor_id
        FOR UPDATE
      LOOP
        UPDATE lg_v1.attempts
        SET submission = v_attempt.placement,
            score = lg_v1._sort_score(v_snapshot.private_activity, v_snapshot.private_mapping, v_attempt.placement),
            completion_status = 'closed_unsubmitted',
            submitted_at = now(),
            attempt_revision = v_attempt.attempt_revision + 1,
            updated_at = now()
        WHERE attempt_id = v_attempt.attempt_id;
      END LOOP;

      UPDATE lg_v1.rooms
      SET status = 'review',
          room_revision = room_revision + 1,
          updated_at = now()
      WHERE room_id = v_room.room_id AND status = 'active'
      RETURNING * INTO v_room;
      RETURN jsonb_build_object('roomRevision', v_room.room_revision, 'roomStatus', v_room.status, 'status', 'ok');

    WHEN 'room.reveal' THEN
      IF v_actor.actor_role <> 'host' OR v_actor.status <> 'active' THEN
        RAISE EXCEPTION 'FORBIDDEN';
      END IF;
      IF v_room.expires_at < now() THEN
        UPDATE lg_v1.rooms SET status = 'expired', updated_at = now() WHERE room_id = v_room.room_id;
        RAISE EXCEPTION 'ROOM_EXPIRED';
      END IF;
      IF v_room.revealed_at IS NOT NULL THEN
        RETURN jsonb_build_object('roomRevision', v_room.room_revision, 'roomStatus', v_room.status, 'status', 'ok');
      END IF;
      IF v_room.status <> 'review' THEN
        RAISE EXCEPTION 'ROOM_CLOSED';
      END IF;
      IF p_expected_room_rev IS NULL OR p_expected_room_rev <> v_room.room_revision THEN
        RAISE EXCEPTION 'REVISION_CONFLICT';
      END IF;
      UPDATE lg_v1.rooms
      SET revealed_at = now(),
          room_revision = room_revision + 1,
          updated_at = now()
      WHERE room_id = v_room.room_id
      RETURNING * INTO v_room;
      RETURN jsonb_build_object('roomRevision', v_room.room_revision, 'roomStatus', v_room.status, 'status', 'ok');

    WHEN 'room.finish' THEN
      IF v_actor.actor_role <> 'host' OR v_actor.status <> 'active' THEN
        RAISE EXCEPTION 'FORBIDDEN';
      END IF;
      IF v_room.expires_at < now() THEN
        UPDATE lg_v1.rooms SET status = 'expired', updated_at = now() WHERE room_id = v_room.room_id;
        RAISE EXCEPTION 'ROOM_EXPIRED';
      END IF;
      IF v_room.status = 'finished' THEN
        RETURN jsonb_build_object('roomRevision', v_room.room_revision, 'roomStatus', v_room.status, 'status', 'ok');
      END IF;
      IF v_room.status <> 'review' THEN
        RAISE EXCEPTION 'ROOM_CLOSED';
      END IF;
      IF v_room.revealed_at IS NULL THEN
        RAISE EXCEPTION 'ROOM_CLOSED';
      END IF;
      IF p_expected_room_rev IS NULL OR p_expected_room_rev <> v_room.room_revision THEN
        RAISE EXCEPTION 'REVISION_CONFLICT';
      END IF;
      UPDATE lg_v1.rooms
      SET status = 'finished',
          room_revision = room_revision + 1,
          updated_at = now()
      WHERE room_id = v_room.room_id AND status = 'review'
      RETURNING * INTO v_room;
      RETURN jsonb_build_object('roomRevision', v_room.room_revision, 'roomStatus', v_room.status, 'status', 'ok');

    WHEN 'room.remove_participant' THEN
      IF v_actor.actor_role <> 'host' OR v_actor.status <> 'active' THEN
        RAISE EXCEPTION 'FORBIDDEN';
      END IF;
      IF v_room.expires_at < now() THEN
        UPDATE lg_v1.rooms SET status = 'expired', updated_at = now() WHERE room_id = v_room.room_id;
        RAISE EXCEPTION 'ROOM_EXPIRED';
      END IF;
      IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' OR p_payload->>'participantId' IS NULL THEN
        RAISE EXCEPTION 'INVALID_PAYLOAD';
      END IF;

      SELECT * INTO v_target_actor
      FROM lg_v1.actors
      WHERE room_id = v_room.room_id AND actor_id = (p_payload->>'participantId')::uuid
      FOR UPDATE;

      IF NOT FOUND OR v_target_actor.actor_role <> 'student' THEN
        RAISE EXCEPTION 'FORBIDDEN';
      END IF;
      IF v_target_actor.status = 'revoked' THEN
        RETURN jsonb_build_object('roomRevision', v_room.room_revision, 'status', 'ok');
      END IF;
      IF v_target_actor.status <> 'active' THEN
        RAISE EXCEPTION 'FORBIDDEN';
      END IF;
      IF p_expected_room_rev IS NULL OR p_expected_room_rev <> v_room.room_revision THEN
        RAISE EXCEPTION 'REVISION_CONFLICT';
      END IF;

      UPDATE lg_v1.actors
      SET status = 'revoked', revoked_at = now(), last_seen_at = now()
      WHERE room_id = v_room.room_id AND actor_id = v_target_actor.actor_id;

      UPDATE lg_v1.rooms
      SET room_revision = room_revision + 1, updated_at = now()
      WHERE room_id = v_room.room_id
      RETURNING room_revision INTO v_room.room_revision;
      RETURN jsonb_build_object('roomRevision', v_room.room_revision, 'status', 'ok');

    ELSE
      RAISE EXCEPTION 'UNSUPPORTED_COMMAND';
  END CASE;
END;
$$;

ALTER FUNCTION lg_v1.state(text, text, bigint, bigint) OWNER TO lg_v1_owner;
ALTER FUNCTION lg_v1.command(text, text, text, jsonb, bigint, bigint) OWNER TO lg_v1_owner;
GRANT EXECUTE ON FUNCTION lg_v1.state(text, text, bigint, bigint) TO anon;
GRANT EXECUTE ON FUNCTION lg_v1.command(text, text, text, jsonb, bigint, bigint) TO anon;

