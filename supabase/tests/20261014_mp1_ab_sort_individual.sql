-- Focused source-side SQL smoke checks for the disposable Sort Individual backend.
-- These checks are intentionally static and are meant for the next independent verification task.

SELECT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = 'lg_v1_owner'
) AS has_lg_v1_owner;

SELECT EXISTS (
  SELECT 1 FROM information_schema.schemata WHERE schema_name = 'lg_v1'
) AS has_lg_v1_schema;

SELECT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'lg_v1' AND table_name = 'rooms'
) AS has_rooms_table;

SELECT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'lg_v1' AND table_name = 'snapshots'
) AS has_snapshots_table;

SELECT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'lg_v1' AND table_name = 'actors'
) AS has_actors_table;

SELECT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'lg_v1' AND table_name = 'attempts'
) AS has_attempts_table;

SELECT EXISTS (
  SELECT 1
  FROM information_schema.routines
  WHERE specific_schema = 'public' AND routine_name = 'lg_v1_create'
) AS has_public_create_wrapper;

SELECT EXISTS (
  SELECT 1
  FROM information_schema.routines
  WHERE specific_schema = 'public' AND routine_name = 'lg_v1_join'
) AS has_public_join_wrapper;

SELECT EXISTS (
  SELECT 1
  FROM information_schema.routines
  WHERE specific_schema = 'public' AND routine_name = 'lg_v1_state'
) AS has_public_state_wrapper;

SELECT EXISTS (
  SELECT 1
  FROM information_schema.routines
  WHERE specific_schema = 'public' AND routine_name = 'lg_v1_command'
) AS has_public_command_wrapper;
