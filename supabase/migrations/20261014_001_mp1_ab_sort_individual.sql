-- MP1-AB Sort Individual, source-only disposable SQL backend.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lg_v1_owner') THEN
    CREATE ROLE lg_v1_owner NOLOGIN;
  END IF;
END $$;

GRANT lg_v1_owner TO postgres;

CREATE SCHEMA IF NOT EXISTS lg_v1 AUTHORIZATION lg_v1_owner;
ALTER SCHEMA lg_v1 OWNER TO lg_v1_owner;

REVOKE ALL ON SCHEMA lg_v1 FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA lg_v1 FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA lg_v1 FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA lg_v1 FROM PUBLIC;

CREATE TABLE lg_v1.rooms (
  room_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text NOT NULL UNIQUE CHECK (room_code ~ '^[A-Z0-9]{8}$'),
  game text NOT NULL CHECK (game = 'sort'),
  mode text NOT NULL CHECK (mode = 'individual'),
  status text NOT NULL CHECK (status IN ('lobby', 'active', 'review', 'finished', 'expired')),
  room_revision bigint NOT NULL DEFAULT 1,
  room_language text NOT NULL CHECK (room_language IN ('de', 'en', 'vi')),
  allow_student_language_choice boolean NOT NULL DEFAULT false,
  capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  revealed_at timestamptz
);
ALTER TABLE lg_v1.rooms OWNER TO lg_v1_owner;
ALTER TABLE lg_v1.rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE lg_v1.snapshots (
  snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL UNIQUE REFERENCES lg_v1.rooms(room_id) ON DELETE CASCADE,
  schema_version integer NOT NULL CHECK (schema_version = 1),
  activity_fingerprint text NOT NULL,
  private_activity jsonb NOT NULL,
  private_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  student_projection jsonb NOT NULL,
  teacher_projection jsonb NOT NULL,
  presentation_order jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE lg_v1.snapshots OWNER TO lg_v1_owner;
ALTER TABLE lg_v1.snapshots ENABLE ROW LEVEL SECURITY;

CREATE TABLE lg_v1.actors (
  actor_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES lg_v1.rooms(room_id) ON DELETE CASCADE,
  actor_role text NOT NULL CHECK (actor_role IN ('host', 'student')),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 80),
  token_digest text NOT NULL,
  join_fingerprint text,
  status text NOT NULL CHECK (status IN ('active', 'revoked', 'expired')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (room_id, token_digest)
);
ALTER TABLE lg_v1.actors OWNER TO lg_v1_owner;
ALTER TABLE lg_v1.actors ENABLE ROW LEVEL SECURITY;

CREATE TABLE lg_v1.attempts (
  attempt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES lg_v1.rooms(room_id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES lg_v1.actors(actor_id) ON DELETE CASCADE,
  placement jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempt_revision bigint NOT NULL DEFAULT 0,
  submitted_at timestamptz,
  submission jsonb,
  score jsonb,
  completion_status text NOT NULL DEFAULT 'in_progress' CHECK (completion_status IN ('in_progress', 'submitted', 'closed_unsubmitted')),
  submitted_room_revision bigint,
  reveal_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, actor_id)
);
ALTER TABLE lg_v1.attempts OWNER TO lg_v1_owner;
ALTER TABLE lg_v1.attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION lg_v1._mode_guard(p_game text, p_mode text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_game = 'memory' AND p_mode = 'turns' THEN 'MODE_UNAVAILABLE'
    WHEN p_game = 'sort' AND p_mode = 'individual' THEN 'OK'
    WHEN p_game IN ('sort', 'sequence', 'language-detective') AND p_mode <> 'individual' THEN 'UNSUPPORTED_MODE'
    ELSE 'UNSUPPORTED_MODE'
  END;
$$;

CREATE OR REPLACE FUNCTION lg_v1._safe_token(p_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE WHEN p_token ~ '^[a-f0-9]{64}$' THEN encode(extensions.digest(p_token, 'sha256'), 'hex') ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION lg_v1.validate_sort_activity(p_activity jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_fields text[] := ARRAY['format','schemaVersion','activityType','id','title','targetLanguage','instructions','content'];
  v_categories jsonb;
  v_items jsonb;
  v_category jsonb;
  v_item jsonb;
  v_category_id text;
  v_count_categories integer;
  v_count_items integer;
BEGIN
  IF p_activity IS NULL OR jsonb_typeof(p_activity) <> 'object' THEN
    RETURN false;
  END IF;

  IF COALESCE(p_activity->>'format', '') <> 'learning-games.activity' THEN
    RETURN false;
  END IF;
  IF COALESCE(p_activity->>'schemaVersion', '')::integer <> 1 THEN
    RETURN false;
  END IF;
  IF COALESCE(p_activity->>'activityType', '') <> 'sort' THEN
    RETURN false;
  END IF;
  IF COALESCE(p_activity->>'id', '') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RETURN false;
  END IF;
  IF COALESCE(p_activity->>'title', '') = '' OR length(COALESCE(p_activity->>'title', '')) > 120 THEN
    RETURN false;
  END IF;
  IF COALESCE(p_activity->>'instructions', '') = '' OR length(COALESCE(p_activity->>'instructions', '')) > 2000 THEN
    RETURN false;
  END IF;
  IF COALESCE(p_activity->>'targetLanguage', '') !~ '^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8}){0,3}$' THEN
    RETURN false;
  END IF;

  IF jsonb_typeof(p_activity->'content') <> 'object' THEN
    RETURN false;
  END IF;

  v_categories := p_activity->'content'->'categories';
  v_items := p_activity->'content'->'items';
  IF jsonb_typeof(v_categories) <> 'array' THEN
    RETURN false;
  END IF;
  IF jsonb_typeof(v_items) <> 'array' THEN
    RETURN false;
  END IF;

  v_count_categories := jsonb_array_length(v_categories);
  v_count_items := jsonb_array_length(v_items);
  IF v_count_categories < 2 OR v_count_categories > 5 THEN
    RETURN false;
  END IF;
  IF v_count_items < 4 OR v_count_items > 30 THEN
    RETURN false;
  END IF;

  FOR v_category IN SELECT * FROM jsonb_array_elements(v_categories)
  LOOP
    IF jsonb_typeof(v_category) <> 'object' THEN
      RETURN false;
    END IF;
    IF NOT (v_category ? 'id' AND v_category ? 'label') THEN
      RETURN false;
    END IF;
    IF COALESCE(v_category->>'id', '') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
      RETURN false;
    END IF;
    IF COALESCE(v_category->>'label', '') = '' OR length(COALESCE(v_category->>'label', '')) > 80 THEN
      RETURN false;
    END IF;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RETURN false;
    END IF;
    IF NOT (v_item ? 'id' AND v_item ? 'text' AND v_item ? 'categoryId') THEN
      RETURN false;
    END IF;
    IF COALESCE(v_item->>'id', '') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
      RETURN false;
    END IF;
    IF COALESCE(v_item->>'text', '') = '' OR length(COALESCE(v_item->>'text', '')) > 240 THEN
      RETURN false;
    END IF;
    IF COALESCE(v_item->>'categoryId', '') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
      RETURN false;
    END IF;
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_categories) AS c
      WHERE c->>'id' = v_item->>'categoryId'
    ) = false THEN
      RETURN false;
    END IF;
    IF v_item ? 'explanation' THEN
      IF COALESCE(v_item->>'explanation', '') = '' OR length(COALESCE(v_item->>'explanation', '')) > 1000 THEN
        RETURN false;
      END IF;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_categories) AS c
    GROUP BY c->>'id'
    HAVING count(*) > 1
  ) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_items) AS i
    GROUP BY i->>'id'
    HAVING count(*) > 1
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION lg_v1._sort_room_handles(p_activity jsonb)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH categories AS (
    SELECT
      category->>'id' AS authored_category_id,
      category->>'label' AS label,
      md5(concat('cat:', category->>'id', ':', encode(extensions.gen_random_bytes(16), 'hex'))) AS category_handle
    FROM jsonb_array_elements(COALESCE(p_activity->'content'->'categories', '[]'::jsonb)) AS category
  ),
  items AS (
    SELECT
      item->>'id' AS authored_item_id,
      item->>'text' AS text,
      item->>'categoryId' AS authored_category_id,
      md5(concat('item:', item->>'id', ':', encode(extensions.gen_random_bytes(16), 'hex'))) AS item_handle
    FROM jsonb_array_elements(COALESCE(p_activity->'content'->'items', '[]'::jsonb)) AS item
  )
  SELECT jsonb_build_object(
    'privateMapping', jsonb_build_object(
      'categories', COALESCE((SELECT jsonb_object_agg(authored_category_id, category_handle) FROM categories), '{}'::jsonb),
      'items', COALESCE((SELECT jsonb_object_agg(authored_item_id, item_handle) FROM items), '{}'::jsonb)
    ),
    'studentProjection', jsonb_build_object(
      'categories', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object('handle', category_handle, 'label', label)
          ORDER BY category_handle
        )
        FROM categories
      ), '[]'::jsonb),
      'items', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object('handle', item_handle, 'text', text)
          ORDER BY item_handle
        )
        FROM items
      ), '[]'::jsonb)
    )
  );
$$;

CREATE OR REPLACE FUNCTION lg_v1._sort_score(p_activity jsonb, p_private_mapping jsonb, p_placement jsonb)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH item_rows AS (
    SELECT
      i.item_value->>'id' AS authored_item_id,
      p_private_mapping->'items'->>(i.item_value->>'id') AS item_handle,
      p_private_mapping->'categories'->>(i.item_value->>'categoryId') AS correct_category_handle
    FROM jsonb_array_elements(COALESCE(p_activity->'content'->'items', '[]'::jsonb)) AS i(item_value)
  ), evaluated_rows AS (
    SELECT authored_item_id,
           (p_placement ->> item_handle) IS NOT NULL AS has_placement,
           COALESCE((p_placement ->> item_handle) = correct_category_handle, false) AS is_correct
    FROM item_rows
  )
  SELECT jsonb_build_object(
    'evaluator', 'scoreSort',
    'total', (SELECT count(*) FROM evaluated_rows),
    'correct', (SELECT count(*) FROM evaluated_rows WHERE is_correct),
    'complete', (SELECT bool_and(has_placement) FROM evaluated_rows),
    'perItem', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'itemId', authored_item_id,
          'correct', is_correct,
          'placed', has_placement
        )
      )
      FROM evaluated_rows
    )
  );
$$;

CREATE OR REPLACE FUNCTION lg_v1.create(
  p_game text,
  p_mode text,
  p_activity jsonb,
  p_room_language text,
  p_allow_student_language_choice boolean,
  p_host_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_mode_guard text;
  v_token_digest text;
  v_room_code text;
  v_room lg_v1.rooms%ROWTYPE;
  v_snapshot_id uuid;
  v_actor_id uuid;
  v_room_handles jsonb;
  v_student_projection jsonb;
  v_private_mapping jsonb;
BEGIN
  v_mode_guard := lg_v1._mode_guard(p_game, p_mode);
  IF v_mode_guard = 'MODE_UNAVAILABLE' THEN
    RAISE EXCEPTION 'MODE_UNAVAILABLE';
  ELSIF v_mode_guard = 'UNSUPPORTED_MODE' THEN
    RAISE EXCEPTION 'UNSUPPORTED_MODE';
  END IF;

  IF p_host_token IS NULL OR p_host_token !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'INVALID_TOKEN';
  END IF;
  IF p_room_language NOT IN ('de', 'en', 'vi') THEN
    RAISE EXCEPTION 'INVALID_LANGUAGE';
  END IF;
  IF p_activity IS NULL OR lg_v1.validate_sort_activity(p_activity) = false THEN
    RAISE EXCEPTION 'INVALID_ACTIVITY';
  END IF;
  v_token_digest := lg_v1._safe_token(p_host_token);

  SELECT a.room_id INTO v_room.room_id
  FROM lg_v1.actors a
  WHERE a.token_digest = v_token_digest AND a.actor_role = 'host'
  LIMIT 1;
  IF FOUND THEN
    SELECT * INTO v_room FROM lg_v1.rooms WHERE room_id = v_room.room_id;
    RETURN jsonb_build_object(
      'roomCode', v_room.room_code,
      'roomRevision', v_room.room_revision,
      'roomLanguage', v_room.room_language,
      'allowStudentLanguageChoice', v_room.allow_student_language_choice,
      'roomStatus', v_room.status,
      'mode', v_room.mode,
      'game', v_room.game
    );
  END IF;

  LOOP
    v_room_code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM lg_v1.rooms WHERE room_code = v_room_code);
  END LOOP;

  INSERT INTO lg_v1.rooms (
    room_code,
    game,
    mode,
    status,
    room_revision,
    room_language,
    allow_student_language_choice,
    capacity,
    expires_at
  ) VALUES (
    v_room_code,
    'sort',
    'individual',
    'lobby',
    1,
    p_room_language,
    p_allow_student_language_choice,
    20,
    now() + interval '24 hours'
  ) RETURNING * INTO v_room;

  v_room_handles := lg_v1._sort_room_handles(p_activity);
  v_student_projection := v_room_handles->'studentProjection';
  v_private_mapping := v_room_handles->'privateMapping';

  INSERT INTO lg_v1.snapshots (
    room_id,
    schema_version,
    activity_fingerprint,
    private_activity,
    private_mapping,
    student_projection,
    teacher_projection,
    presentation_order
  ) VALUES (
    v_room.room_id,
    1,
    md5(p_activity::text),
    p_activity,
    v_private_mapping,
    v_student_projection,
    jsonb_build_object(
      'categories', jsonb_build_array(),
      'items', jsonb_build_array()
    ),
    (
      SELECT jsonb_agg(item->>'handle')
      FROM jsonb_array_elements(v_student_projection->'items') AS item
    )
  ) RETURNING snapshot_id INTO v_snapshot_id;

  INSERT INTO lg_v1.actors (
    room_id,
    actor_role,
    display_name,
    token_digest,
    join_fingerprint,
    status
  ) VALUES (
    v_room.room_id,
    'host',
    'Host',
    v_token_digest,
    md5(p_activity::text),
    'active'
  ) RETURNING actor_id INTO v_actor_id;

  RETURN jsonb_build_object(
    'roomCode', v_room.room_code,
    'roomRevision', v_room.room_revision,
    'roomLanguage', v_room.room_language,
    'allowStudentLanguageChoice', v_room.allow_student_language_choice,
    'roomStatus', v_room.status,
    'hostActorId', v_actor_id,
    'game', v_room.game,
    'mode', v_room.mode
  );
END;
$$;

CREATE OR REPLACE FUNCTION lg_v1.join(
  p_room_code text,
  p_display_name text,
  p_player_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_room lg_v1.rooms%ROWTYPE;
  v_token_digest text;
  v_actor lg_v1.actors%ROWTYPE;
  v_attempt_id uuid;
  v_join_fingerprint text;
  v_active_student_count bigint;
BEGIN
  IF p_room_code IS NULL OR p_room_code !~ '^[A-Z0-9]{8}$' THEN
    RAISE EXCEPTION 'INVALID_ROOM_CODE';
  END IF;
  IF p_player_token IS NULL OR p_player_token !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'INVALID_TOKEN';
  END IF;
  v_token_digest := lg_v1._safe_token(p_player_token);
  v_join_fingerprint := md5(trim(p_display_name));

  SELECT * INTO v_room
  FROM lg_v1.rooms
  WHERE room_code = upper(p_room_code)
  FOR NO KEY UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  SELECT * INTO v_actor
  FROM lg_v1.actors
  WHERE room_id = v_room.room_id AND token_digest = v_token_digest
  FOR UPDATE;

  IF v_room.expires_at < now() THEN
    UPDATE lg_v1.rooms SET status = 'expired', updated_at = now() WHERE room_id = v_room.room_id;
    RAISE EXCEPTION 'ROOM_EXPIRED';
  END IF;

  IF FOUND THEN
    IF v_actor.status <> 'active' THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    IF v_actor.join_fingerprint IS DISTINCT FROM v_join_fingerprint THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN jsonb_build_object(
      'roomCode', v_room.room_code,
      'participantId', v_actor.actor_id,
      'roomRevision', v_room.room_revision,
      'roomStatus', v_room.status,
      'displayName', v_actor.display_name,
      'role', v_actor.actor_role
    );
  END IF;

  IF p_display_name IS NULL OR length(trim(p_display_name)) < 1 OR length(p_display_name) > 80 THEN
    RAISE EXCEPTION 'INVALID_NAME';
  END IF;

  IF v_room.status <> 'lobby' THEN
    RAISE EXCEPTION 'ROOM_CLOSED';
  END IF;

  SELECT count(*) INTO v_active_student_count
  FROM lg_v1.actors
  WHERE room_id = v_room.room_id AND actor_role = 'student' AND status = 'active';
  IF v_active_student_count >= v_room.capacity THEN
    RAISE EXCEPTION 'ROOM_FULL';
  END IF;

  INSERT INTO lg_v1.actors (
    room_id,
    actor_role,
    display_name,
    token_digest,
    join_fingerprint,
    status
  ) VALUES (
    v_room.room_id,
    'student',
    trim(p_display_name),
    v_token_digest,
    v_join_fingerprint,
    'active'
  ) RETURNING * INTO v_actor;

  INSERT INTO lg_v1.attempts (room_id, actor_id, placement, attempt_revision, submission, score, reveal_visible)
  VALUES (v_room.room_id, v_actor.actor_id, '{}'::jsonb, 0, NULL, NULL, false)
  RETURNING attempt_id INTO v_attempt_id;

  UPDATE lg_v1.rooms
  SET room_revision = room_revision + 1, updated_at = now()
  WHERE room_id = v_room.room_id
  RETURNING * INTO v_room;

  RETURN jsonb_build_object(
    'roomCode', v_room.room_code,
    'participantId', v_actor.actor_id,
    'roomRevision', v_room.room_revision,
    'attemptRevision', 0,
    'roomStatus', v_room.status,
    'displayName', v_actor.display_name,
    'role', 'student'
  );
END;
$$;

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
    'hostView', jsonb_build_object(
      'status', v_room.status,
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

CREATE OR REPLACE FUNCTION public.lg_v1_create(
  p_game text,
  p_mode text,
  p_activity jsonb,
  p_room_language text,
  p_allow_student_language_choice boolean,
  p_host_token text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
VOLATILE
SET search_path = ''
AS $$
  SELECT lg_v1.create(p_game, p_mode, p_activity, p_room_language, p_allow_student_language_choice, p_host_token);
$$;

CREATE OR REPLACE FUNCTION public.lg_v1_join(
  p_room_code text,
  p_display_name text,
  p_player_token text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
VOLATILE
SET search_path = ''
AS $$
  SELECT lg_v1.join(p_room_code, p_display_name, p_player_token);
$$;

CREATE OR REPLACE FUNCTION public.lg_v1_state(
  p_room_code text,
  p_token text,
  p_room_rev bigint DEFAULT NULL,
  p_attempt_rev bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
VOLATILE
SET search_path = ''
AS $$
  SELECT lg_v1.state(p_room_code, p_token, p_room_rev, p_attempt_rev);
$$;

CREATE OR REPLACE FUNCTION public.lg_v1_command(
  p_room_code text,
  p_token text,
  p_kind text,
  p_payload jsonb,
  p_expected_room_rev bigint DEFAULT NULL,
  p_expected_attempt_rev bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
VOLATILE
SET search_path = ''
AS $$
  SELECT lg_v1.command(p_room_code, p_token, p_kind, p_payload, p_expected_room_rev, p_expected_attempt_rev);
$$;

REVOKE ALL ON FUNCTION public.lg_v1_create(text, text, jsonb, text, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lg_v1_join(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lg_v1_state(text, text, bigint, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lg_v1_command(text, text, text, jsonb, bigint, bigint) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION lg_v1.create(text, text, jsonb, text, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION lg_v1.join(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION lg_v1.state(text, text, bigint, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION lg_v1.command(text, text, text, jsonb, bigint, bigint) FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA lg_v1 TO anon;
GRANT EXECUTE ON FUNCTION public.lg_v1_create(text, text, jsonb, text, boolean, text) TO anon;
GRANT EXECUTE ON FUNCTION public.lg_v1_join(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.lg_v1_state(text, text, bigint, bigint) TO anon;
GRANT EXECUTE ON FUNCTION public.lg_v1_command(text, text, text, jsonb, bigint, bigint) TO anon;

GRANT EXECUTE ON FUNCTION lg_v1.create(text, text, jsonb, text, boolean, text) TO anon;
GRANT EXECUTE ON FUNCTION lg_v1.join(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION lg_v1.state(text, text, bigint, bigint) TO anon;
GRANT EXECUTE ON FUNCTION lg_v1.command(text, text, text, jsonb, bigint, bigint) TO anon;

CREATE OR REPLACE FUNCTION lg_v1.purge_expired_rooms(p_limit integer DEFAULT 50)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted integer;
BEGIN
  WITH expired AS (
    SELECT room_id
    FROM lg_v1.rooms
    WHERE status IN ('lobby', 'active', 'review')
      AND expires_at < now()
    ORDER BY expires_at ASC
    LIMIT p_limit
  )
  UPDATE lg_v1.rooms r
  SET status = 'expired', updated_at = now()
  FROM expired e
  WHERE r.room_id = e.room_id
  RETURNING 1 INTO v_deleted;

  RETURN COALESCE(v_deleted, 0);
END;
$$;

ALTER FUNCTION lg_v1._mode_guard(text, text) OWNER TO lg_v1_owner;
ALTER FUNCTION lg_v1._safe_token(text) OWNER TO lg_v1_owner;
ALTER FUNCTION lg_v1.validate_sort_activity(jsonb) OWNER TO lg_v1_owner;
ALTER FUNCTION lg_v1._sort_room_handles(jsonb) OWNER TO lg_v1_owner;
ALTER FUNCTION lg_v1._sort_score(jsonb, jsonb, jsonb) OWNER TO lg_v1_owner;
ALTER FUNCTION lg_v1.create(text, text, jsonb, text, boolean, text) OWNER TO lg_v1_owner;
ALTER FUNCTION lg_v1.join(text, text, text) OWNER TO lg_v1_owner;
ALTER FUNCTION lg_v1.state(text, text, bigint, bigint) OWNER TO lg_v1_owner;
ALTER FUNCTION lg_v1.command(text, text, text, jsonb, bigint, bigint) OWNER TO lg_v1_owner;
ALTER FUNCTION lg_v1.purge_expired_rooms(integer) OWNER TO lg_v1_owner;
ALTER FUNCTION public.lg_v1_create(text, text, jsonb, text, boolean, text) OWNER TO postgres;
ALTER FUNCTION public.lg_v1_join(text, text, text) OWNER TO postgres;
ALTER FUNCTION public.lg_v1_state(text, text, bigint, bigint) OWNER TO postgres;
ALTER FUNCTION public.lg_v1_command(text, text, text, jsonb, bigint, bigint) OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION lg_v1._mode_guard(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION lg_v1._safe_token(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION lg_v1._sort_room_handles(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION lg_v1._sort_score(jsonb, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION lg_v1.validate_sort_activity(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION lg_v1.purge_expired_rooms(integer) FROM PUBLIC, anon, authenticated;
