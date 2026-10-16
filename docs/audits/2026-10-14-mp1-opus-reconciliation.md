# MP1 — Opus review reconciliation (2026-10-14)

**Source:** owner-provided independent Opus report reviewing docs branch at `ea403e3`. Verdict: **APPROVE WITH CHANGES**. Reviewer made no hosted calls or edits and did not verify installed SQL, PostgreSQL version, effective grants or working disposable stack. This report is evidence of an architectural review, **not** of implementation or permission to operate on Supabase.

**Control-room disposition:** revised [MP1_BACKEND_CONTRACT](../architecture/MP1_BACKEND_CONTRACT.md) v2. Status: **review-reconciled proposal; pending owner decisions and independent examination of executable code**. Preserve 11 approved/5 forbidden combinations and legacy Memory Turns.

| ID | Opus finding | Reconciliation |
|---|---|---|
| F1 P0 | Authored IDs/order leak answers | **Accepted.** Room-scoped cryptographically random opaque item/category/task/segment handles, hidden author ID mapping, safe DTO and server-controlled shuffle. Detective text order stays pedagogically intact. |
| F2 P0 | Server validation/scoring unspecified | **Accepted with safety strengthening.** SQL/plpgsql for first slice, no Edge Function; exhaustive fixture parity incl Unicode/markup/normalization; divergence is a gate, not permission to drop checks. Account for JSONB duplicate-key loss separately. |
| F3 P0 | postgres-owned SECURITY DEFINER can access SPP | **Accepted, owner authorization pending.** Dedicated `lg_v1_owner NOLOGIN`, isolated nonexposed `lg_v1` schema, explicit revoke/grants, `search_path=''`, no effective SPP privileges, RLS with no policies. Do not install anything yet. |
| F4 P0 | GET could leak bearer into URLs/logs | **Accepted.** All capability-bearing RPCs `VOLATILE` and POST-only; negative GET test. |
| F5 P1 | Overengineered recovery/idempotency | **Accepted in principle.** Client-generated 256-bit tokens + SHA-256 digest, replay by same token/canonical input, no command log in first slice, absolute commands. **Narrow revision guard retained:** out-of-order absolute placements can still regress an answer; expected_attempt_rev CAS prevents stale overwrite. |
| F6 P1 | Unspecified locks and mixed revisions | **Accepted.** READ COMMITTED, room→actor→attempt locks, room/attempt revisions, private placements don't update shared revision, race tests mandatory. |
| F7 P1 | Lobby code grants admission | **Accepted.** Explicit admission capability while lobby open; close joins on start, host removal, capacity/entropy/abuse gate. |
| F8 P1 | Anonymous load might affect SPP | **Accepted recommendation, owner pending.** Prefer dedicated Supabase project for MP1, verify isolation and load controls before hosted installation. |
| F9 P1 | Too much speculative infrastructure | **Accepted.** One MP1-AB disposable Sort Individual SQL+foundation deliverable, four tables, no command/result/state tables until needed. |
| F10 P1 | Expiry not physical cleanup | **Accepted.** Bounded internal purge with independently tested deletion; scheduler later only with explicit approval. |
| F11 P1 | Raw SQL/constraint error leakage | **Accepted.** Stable external error vocabulary, sanitized message/detail/hint, payload leak checks. |
| F12–F16 P2 | Legacy Turns route, typed StudentSortView, projected teacher view, JSONB duplicate-key limitations, deferred Sequence move/leave | **Accepted/deferred appropriately.** Legacy Turns returns MODE_UNAVAILABLE in new facade. First Sort room never receives SortActivity with answers. Implement deferred features only in their slices. |

## Owner decisions reserved (not approved by this review)

Before any frontend app integration or hosted operation: teacher/student receipt/reveal timing; host remove; late admission rule; participant cap and code entropy; authorization to create dedicated role/schema in a disposable implementation (and later chosen hosted environment). Before hosted installation: **separate Learning Games Supabase project vs shared SPP**, abuse mitigation, data retention and cleanup cadence. Defaults in v2 are design proposals only, not user decisions.

## Checks required before development

Opus should be offered a concise v2 delta review, especially (1) rewritten identity projection, (2) SQL validator parity requirement, (3) role/schema and PostgREST facade grants, (4) token and CAS retry design, (5) lock compatibility and no SPP side effects. A focused reviewer recheck is preferred over a full architecture reset. **Even after v2 review, owner must separately authorize disposable MP1-AB-db.**

## Next scope

Write **one** isolated, disposable-only implementation of `Sort Individual` plus minimal shared lifecycle in PostgreSQL/PostgREST, *not* all 11 modes. Tests include all 16 allow/deny combinations, absent keys, negative permission probes, stale/replay, row-lock races, expiry/purge, and actual RPC boundary. STOP before hosted DDL or UI integration.
