# MP1 — Game-typed multiplayer backend contract (reconciled v2)

**Status (2026-10-14): REVIEW RECONCILED; DESIGN PROPOSAL, NOT IMPLEMENTATION AUTHORIZATION.** Opus independently reviewed v1 at `ea403e3` and returned **APPROVE WITH CHANGES** (F1–F16). This document incorporates technical corrections and identifies *owner decisions still pending*. No backend code, SQL migration, Supabase project, role, grant, frontend release, or SPP artifact has been changed by this documentation pass. See [review disposition](../audits/2026-10-14-mp1-opus-reconciliation.md) and [execution/review gates](MP1_REVIEW_AND_ROLLOUT.md).

**Verified source baseline:** MP0 feature `feat/lg-mp0-ux2-m3a-integration-20261013@b569d767e18ae0330cfbb028192470fde60a710d` (Preview accepted, **unmerged and unreleased**). Hosted Memory Turns uses `game_poc_memory_*`; M3a `game_poc_memory_create_v2` has been installed. MP0 hosted functional smoke completed two synthetic rooms, *not* hostile RPC proof or physical expiry purge. The new multiplayer service is not installed. Existing hosted SPP project reference: `iizsyphqlezesbvaiztd`; whether to install MP1 there is **UNDECIDED**.

## 1. Product contract stays locked

The owner-approved [MULTIPLAYER_V1_CONTRACT](MULTIPLAYER_V1_CONTRACT.md) has **11 supported combinations and 5 forbidden**:

| Game | Turns | Collaborative | Individual | Teacher-paced |
|---|:---:|:---:|:---:|:---:|
| Memory | YES (existing legacy service) | NO | YES (future) | NO |
| Sort | NO | YES | YES | YES |
| Sequence | NO | YES | YES | YES |
| Language Detective | NO | YES | YES | YES |

A supported but unimplemented combination returns `MODE_UNAVAILABLE`; forbidden returns `UNSUPPORTED_MODE`. In the new `lg_v1_create` API, **Memory Turns explicitly returns `MODE_UNAVAILABLE`**, because its working legacy RPC remains sole authority until an independently approved migration. New MP1 initially enables **Sort Individual only**. No unshipped combination appears available in the UI.

Local `preview`/`presentation`/`independent` (`src/shared/activities/contract.ts`) remain offline delivery contexts; they must never be confused with multiplayer `individual` or teacher-paced modes. Teacher-owned portable JSON contains **no** room identity, capability, student attempt or result. The SPP Homework adapter is an independent later decision; anonymous room membership is not SPP Auth.

## 2. Architecture decision — lean typed service

Choose **one additive, game-typed room lifecycle**, not clones of Memory’s turn-specific RPCs and not an unrestricted generic JSON reducer. Internally dispatch with a static allowlist `CASE` on `(game, mode, kind, role, lifecycle status)`; no dynamic SQL and no caller-supplied SQL identifiers. Game-specific SQL validators/evaluators own content, rules and safe DTO builders. Entry RPCs are narrow and VERSIONED. Polling first, not Realtime.

**MP1-AB-db is one usable disposable-DB deliverable**: shared foundational operations plus complete Sort Individual SQL/test proof. There is **no speculative foundation-only MP1-A**, no general round engine in this slice and no command/event history table. Memory Turns remains unchanged. MP1-AB-client (separate later authorization) renders a typed `StudentSortView` and performs actor-scoped polling.

## 3. Trust boundaries and projection security

```text
Anonymous teacher/student browser, synthetic test only before public release
   | POST JSON to public lg_v1_* facades (no GET for any capability-bearing call)
   | only publishable/anon key; high-entropy bearer in request BODY
   v
SECURITY DEFINER facade owned by restricted NOLOGIN lg_v1_owner
   | strict validation + capability digest + permission + phase + size
   | deterministic lock order + compare-and-set + private evaluation
   v
Nonexposed lg_v1 schema (restricted owner, private tables/internal functions)
   | rooms | snapshots | actors | attempts
   +---- independently constructed student-safe / teacher-safe DTO
```

**Security decision proposal, requires owner approval for creating role/schema:** `lg_v1_owner NOLOGIN` owns **only** MP1 objects and facade functions; it has no membership or privileges enabling access to SPP objects. Private `lg_v1` schema is not exposed by PostgREST and is **not** the shared `private` schema. All new private tables have RLS enabled and **no direct policies** for app roles, as a defense-in-depth boundary. Do not `FORCE ROW LEVEL SECURITY` with an owner-definer design. Explicitly review effective definer bypass/ownership privileges and role memberships, not merely whether RLS is marked ON.

All `public.lg_v1_*` facades: own by `lg_v1_owner`, `SECURITY DEFINER`, `SET search_path = ''`, every object name fully qualified, fixed safe SQLSTATE/codes, bounded inputs, **VOLATILE** (even read-only `state`), explicit `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated` then `GRANT EXECUTE ... TO anon` only where warranted. Inspect role-specific/default privileges rather than assume `PUBLIC` revoke is sufficient. Internal functions and tables receive no effective `anon` or `authenticated` usage/execute/select. Changes to global default privileges or existing SPP role memberships are **not** implied or allowed. Pin and verify built-in cryptographic function availability and qualification against the actual disposable/hosted PostgreSQL version.

**No credentials in URL:** all capability-bearing RPCs MUST accept **POST only**; `VOLATILE` function volatility is required to prevent PostgREST GET invocation, with negative GET tests and URL/log scans. Never put tokens in QR links, query strings, thrown errors, screenshots or diagnostic telemetry. Client `sessionStorage` is a session-scoped bearer holder, not user identity proof.

**Room code is an admission credential during an open lobby**, not just a locator. It is intentionally shareable via QR and does not authorize room **state/mutation** after join. Use cryptographically secure nonambiguous room-code generation; choose alphabet, entropy, collision retry and throttling only after abuse/capacity review. Host closes new joining at `start`. Only a valid host capability can `remove_participant`, revoke student access and preserve/freeze prior submitted data according to retention policy.

## 4. Opaque student handles — mandatory F1

The **entire authored identity pattern** may leak answers. Do not reuse authored `card-N`, `step-N`, `segment-N`, category IDs, task IDs, or authoring order in student DTOs, action arguments or student-visible errors.

At room creation, server generates random, opaque, room-scoped handles for every identity domain: Sort item and category handles; Sequence item handles; Detective task and **task-local** segment handles; future Memory card/pair handles. Store immutable handle → authored ID mapping in private snapshot metadata. Choose a handle namespace distinct from author-provided IDs and use independent randomness; never derive handles from row index or authored key. **Permute the initial presentation on the server** independently of authored order (Sort cards and category order; Sequence cards; Detective preserves sentence/segment text reading order while remapping all handles, since changing word order changes the pedagogy). For Sequence explicitly reject an already-correct initial shuffled order; avoid inferring order from random handle lexicographic sorting.

All student mutations reference **opaque handles**, resolved and validated server-side against this exact room and role. Unknown/cross-room handles return generic safe errors; cannot enumerate authored IDs from lookup errors. Server projection must be constructed from an explicit allowlist, **not** generated by stripping confidential keys from a full teacher activity JSON.

**Tests:** a fixture with naturally ordered `step-N`, clustered `card-N`, and edited Detective `segment-N`; assert no authored identifier or answer-correlated ordering appears in DTOs, logs, errors or browser props. Statistical unpredictability is not proved by one run: add independent random-seed/repeated-generation checks and membership/invariance tests. For the Sort first slice prove handles are stable across polling/reconnect but random across independent rooms.

## 5. Four tables for first slice (proposed; SQL schema must be reviewed)

**`lg_v1.rooms`**: `room_id uuid`, unique invitation code, `game=sort`, `mode=individual`, lifecycle (`lobby|active|review|finished|expired`), `room_revision bigint`, server language `de|en|vi`, `allow_student_language_choice boolean`, capacity, `created_at`, `expires_at`, and a bounded state machine. No generic mutable game blob, no speculative rounds. Server-generated non-identifying room code.

**`lg_v1.snapshots`**: exactly one frozen validated activity per room; schema version and canonical content fingerprint; **private** authored activity with Sort `categoryId` and explanations, immutable mapping for random opaque item/category handles, immutable allowlisted student prompt/cards DTO (or components to build it). Protect explanations and other possible solution text until authorized review, even for host projected screens.

**`lg_v1.actors`**: host/student actor ID, room ID, display name/admission/revoked status, globally unique `sha256` digest of a high-entropy client-generated capability, join content fingerprint, joined timestamp. Hashed tokens are bearer capabilities, **not password hashes**: SHA-256 is acceptable only because token entropy is 256 random bits. No plaintext token storage. Participant removal marks/revokes access. Do not log raw token or digest. A room-code guess can request admission **only while lobby open**; room state reads still require valid capability.

**`lg_v1.attempts`**: room ID and actor ID, private placement JSON mapped to opaque handles, `attempt_revision`, submission status/time, frozen raw submission, deterministic evaluation metrics with pinned `sort-v1` evaluator version, reveal visibility and current/frozen data. No peer attempt visibility; no speculative stand-alone results table.

No `commands`, `room_state`, or `results` table in MP1-AB. Add shared `room_state` only for collaborative mode later; rounds only when Detective teacher-paced proves need; immutable append/history only when an explicit product/retention use case is approved. Long-term persistence is not the goal of anonymous classrooms.

**Canonical activity validation:** enforce existing Sort shape and limits independently on server: common envelope and strict unknown-field checks; max **128 KiB** and appropriate request-body cap; title/ID/targetLanguage/instruction/text length, whitespace/control/markup protections, 2–5 categories, 4–30 items, unique ID/label/text rules, referential category ID and category labels. SQL/plpgsql is the authoritative MP1-AB validator and scorer, *not* client TypeScript and not a privileged Edge Function. Current TS Unicode/NFC rules have no trivial `char_length` equivalent. **Parity is a release gate:** run the complete existing valid/invalid corpus and targeted tricky Unicode, invisible/control, normalization, markup and duplicate-ID fixtures against both; if outcomes diverge, fix the server, explicitly version/limit the supported canonical subset, or return for reviewed design decision. Do **not** silently drop safety checks just because React renders text inertly. `jsonb` cannot reveal duplicate keys already collapsed by the parser; document the limitation, check raw body limits at ingress and define handling of ambiguous duplicate-key input before hosted release. Never claim `octet_length(p_activity::text)` alone enforces the original request's wire-byte limit.

## 6. Public API — four VOLATILE POST-only functions

Signatures below are *proposed contract shapes*, not final SQL:

```text
public.lg_v1_create(
  p_game text, p_mode text, p_activity jsonb,
  p_room_language text, p_allow_student_language_choice boolean,
  p_host_token text
)
→ { roomCode, roomRevision, roomLanguage, allowStudentLanguageChoice, ...safeHostView }

public.lg_v1_join(
  p_room_code text, p_display_name text, p_player_token text
)
→ { roomCode, participantId, roomRevision, ...safeStudentView }

public.lg_v1_state(
  p_room_code text, p_token text,
  p_room_rev bigint DEFAULT NULL, p_attempt_rev bigint DEFAULT NULL
)
→ { roomRevision, attemptRevision?, unchanged?, ...actorSafeView }

public.lg_v1_command(
  p_room_code text, p_token text,
  p_kind text, p_payload jsonb,
  p_expected_room_rev bigint DEFAULT NULL,
  p_expected_attempt_rev bigint DEFAULT NULL
)
→ { roomRevision, attemptRevision?, ...actorSafeView }
```

**Tokens created by browser, not database:** `crypto.getRandomValues` produces **256 bits / 64 random hex characters** for host and participant capabilities. Send token only in POST body. Server stores `sha256(token)` with global uniqueness and rejects wrong format. Create/join retries use the **same token** and canonical validated input fingerprint and return same actor/room on exact match; altered payload with same token returns `IDEMPOTENCY_CONFLICT`. The client must retain the token *before* first request and preserve it on uncertain network outcomes, rather than automatically creating a new room/student. It is never returned by the server in responses or URL. Because the token is a bearer, an attacker who steals it can impersonate the actor; TLS, storage isolation, leak avoidance and expiry are required.

**Commands (Sort Individual):** student `sort.place(itemHandle,categoryHandle|null)` and `sort.submit`; host `room.start`, `room.close`, `room.reveal`, `room.finish`, `room.remove_participant`. No client-supplied correctness, score, grader, participant role or arbitrary state JSON. Unavailable modes/actions are denied from server CASE allowlist. Every payload rejects extra keys, invalid types, bad handles and oversize strings.

**Idempotent but order-safe:** `sort.place` is an *absolute placement*, not a toggle. However, absolute commands can still arrive out of order; a late earlier placement **must not overwrite** a later placement of the same item. Therefore the control room keeps a narrowly scoped **expected_attempt_rev comparison** (or demonstrably equivalent per-item monotonic sequence), with `REVISION_CONFLICT` and safe resync on stale commands. A literal duplicate that leaves current assignment unchanged can be no-op; an uncertain retry after later changes returns conflict instead of rewinding state. Host lifecycle commands are idempotent no-ops only when the *same authorized target state and semantics* remain valid; `reveal` and `submit` are one-way freeze transitions and never replay private data to a revoked caller. This uses **no command log** for the first slice. Reviewer recommendation "no expected revision for place" is not adopted because it risks late-request stale overwrite; Opus can review the narrower CAS.

**Capability scope:** `roomCode` is required alongside bearer but no role field is trusted from client; server selects actor by digest, verifies room, active status and role. `lg_v1_state` is a true read (even though declared VOLATILE) and MUST NOT update last_seen or mutate rows. Poll rate limit/backoff is a client plus gateway decision; private attempts don't bump global `room_revision`.

## 7. Transaction and lifecycle rules

**Transaction isolation:** READ COMMITTED. Fixed lock hierarchy across all mutations: room (`FOR SHARE` for student commands, `FOR NO KEY UPDATE` for host lifecycle) → actor → attempt (`FOR UPDATE`). Review actual PostgreSQL lock compatibility with concurrent state/commands and prove it with two-session tests; do not treat prose as concurrency proof. Host `close` conflicts with in-flight student row-share lock, waits to acquire and freezes updates; later `place` rechecks phase and rejects. Student placement locks their own attempt, so Student A cannot block Student B's independent attempt (apart from brief room/DB resource contention).

Use **two revisions**: `room_revision` for roster/lifecycle/reveal and `attempt_revision` for one student's own placements/submission. `state` accepts both and returns unchanged only if **both** the actor-visible room view and own attempt view are unchanged. Avoid cross-student polling invalidation: private placement must not bump room revision. On conflict, provide stable safe error + current actor-safe revisions/view for resynchronization; do not expose peer attempt or answer key in errors.

**Lifecycle**: `lobby → active → review → finished`, plus server-time expiry from any phase. Joining closes at start (proposed owner choice), an already-admitted active participant may reconnect until expiry/revocation. Sort Individual: host starts; students privately place/submit; host closes (hard-freezes unsubmitted attempts as specified by reviewed policy); host enters review and may reveal; host finishes. Server must reject impossible or repeated phase transitions that would change semantics. Removal is host-only and revokes bearer; exact effect on previously submitted work depends on retention policy. Teacher's projected screen should default to student-safe content until deliberate private review.

**Errors:** map expected validation and permission cases to a small stable vocabulary, e.g. `INVALID_INPUT`, `ROOM_UNAVAILABLE`, `ROOM_EXPIRED`, `UNAUTHORIZED`, `MODE_UNAVAILABLE`, `UNSUPPORTED_MODE`, `IDEMPOTENCY_CONFLICT`, `REVISION_CONFLICT`, `ALREADY_SUBMITTED`, `RATE_LIMITED`. Public facades must prevent PostgreSQL `message/detail/hint` or constraint/secret reflection. Catch unexpected errors at external facade only and produce generic safe `INTERNAL_ERROR` without leaking private payloads, while preserving internal diagnostics with redaction and avoiding indiscriminate error swallowing. Negative tests search entire HTTP error body, not just `message`, for private IDs, keys, tokens and answers.

## 8. Student and teacher projections; Sort v1 evaluation

**StudentSortView** is a separate TS/DTO type, never `SortActivity` or an opaque copy of it. It includes room-scoped **opaque** category handles/labels and item handles/text, shuffled presentation, own placement handles, own attempt revision, shared state/language settings and **only permitted** results/reveal fields. Before reveal, never return original `categoryId`, authored `id`, category mapping, item explanations, per-item correct/incorrect, peer attempt, or answer-correlated order/metadata. Check React props, serializable DTO, PostgREST payload, error and HTML render paths.

**Host projection:** role-authorized control state, roster and submission receipts. Host screen can be projected, so hide teacher-private answer keys and student submissions by default; explicit host review action and UI boundary necessary for private review. Teacher may inspect individual submissions only after closure under proposed default (owner to decide); no automatic public score display.

**Scoring:** when `sort.submit` freezes a complete set of valid placements, server recomputes from frozen private canonical `categoryId` mapping, with algorithm semantically equivalent to `scoreSort`. Submission cannot spoof correctness or evaluation version. A student receives only a submission receipt until teacher `room.reveal` (proposed, owner pending). An immutable frozen answer snapshot plus pinned evaluator version is stored on the attempt row; correctness visible only after explicit reveal. Multiple students are fully isolated before the reveal boundary; even after reveal, no peer private attempt unless explicitly permitted by product policy.

## 9. Future 10 combinations: mode boundaries (NOT built now)

| Combination | Safe student action | Host authority | Sensitive state |
|---|---|---|---|
| Memory Turns | legacy `flip` on designated turn | legacy `start/skip/next` | existing safely projected cards; no migration |
| Memory Individual | private flip/finish | start/close/reveal | private randomized board/pair key |
| Sort Collaborative | atomic place shared card | start/close/check/reveal | private category answer; shared placements |
| Sort Teacher-paced | same private placement as Individual, single activity-round | start/close/reveal/finish | private responses; no generic round table |
| Sequence Individual | private item reordering/submit | start/close/reveal | private canonical answer order |
| Sequence Teacher-paced | same private order, one activity-round | start/close/reveal/finish | private responses |
| Sequence Collaborative | shared `move(item,after)` command (decide semantics in its slice) | start/close/reveal | revisioned shared order |
| Detective Individual | `setSelected(task,seg,bool)`, `setCorrection(task,seg,text)`, `setNoError(task,bool)`, submit | start/close/reveal | private issue keys / corrections |
| Detective Teacher-paced | same private actions within current task | start/closeTask/reveal/advance | task-local IDs, private responses, rounds later |
| Detective Collaborative | same absolute actions on shared fields | start/close/reveal | field-CAS for correction text, private model key |

Those are 10 *new* combinations plus the existing legacy Memory Turns = 11 target. **Detective free-text corrections are NEVER machine graded**: only teacher-authored error segment identification/no-error logic is deterministic; typed language remains raw and teacher-reviewable. No speculative timers, leaderboards, role teams, broad undo or universal reducer. Version-specific v1 flat passage vs v2 task/segment contracts preserved; opaque task-local IDs cannot leak teacher edits.

## 10. Capacity, abuse and retention

**Owner decisions pending:** hosted Supabase project (recommended: **new dedicated Learning Games project** to isolate anonymous write/poll load from SPP), participant cap, invitation code alphabet/entropy, new-room/create/join rate limits, response visibility policy, retention period and actual purge schedule. Do not treat Word-of-Opus as owner approval.

For disposable proof implement `lg_v1.purge_expired(p_limit)`, callable **internally by an owner-authorized maintenance operation only**, bounded and tested with correct dependency order and lock safety. Optional opportunistic bounded purge on `create` may reduce backlog but does **not** replace a reliable separately authorized scheduled cleanup (such as `pg_cron`, if installed and scoped safely). `expires_at` prevents reads/mutations at runtime; physical deletion/anonymization remains separate and must be verified. No blanket scheduler permissions, background jobs or direct grants to app roles.

Room quota and anonymous rate enforcement cannot be assumed from SQL without a trustworthy client-network origin. Before public internet exposure, implement verified gateway/edge throttling and whole-system quotas; if hosted alongside SPP, demonstrate circuit breakers and load isolation or choose a new project. Limit polling cadence, body bytes, participant count, lifecycle duration, state sizes and exception work.

## 11. Disposable MP1-AB-db and proof plan

**This is the next proposed engineering task after separate owner authorization**, not an instruction automatically approved by accepting this document.

- One isolated implementation branch/worktree based on exact accepted MP0 source (or reviewed docs baseline with identical `src/`), no edits to existing Memory RPC files. Candidate migration `supabase/migrations/<unique_timestamp>_lg_v1_sort_individual.sql` **not installed remotely**; local disposable Supabase only.
- Run `npx supabase start` after checking local Docker safety/resource constraints. Determine hosted PostgreSQL major version **read-only** before claiming version parity. If Docker/local Supabase cannot start safely, STOP; no substitution with hosted test database.
- Four tables + four VOLATILE POST RPCs, role/schema, Sort Individual private projection, frozen submit and host lifecycle/removal, bounded purge, restrictive ACLs. No new Realtime publication, hosted migration, command/event table or SPP integration.
- pgTAP/SQL ACL and ownership tests and real PostgREST `supabase-js` anon integration tests. Test **all 16 matrix combinations**, including legacy Memory Turns `MODE_UNAVAILABLE` in new service, student capability negative tests, role definer restrictions, direct table/internal function calls denied, invalid JSON corpus + Unicode parity, private answer-key leakage, opaque handles across room creation/reconnect, host screen safe projection, join closure, cap/revocation, GET refusal, create/join lost-response retries, attempt revision/no stale rollback, simultaneous students and close/placement race, submission freeze, safe error bodies, expiry and bounded physical purge.
- Locally reported functional tests must include exact commands/results; feature-code tests do not replace disposable SQL/PostgREST proof. Independently review **executable SQL and grants** before any hosted installation.
- **STOP after local proofs and source audit.** No production deployment, no hosted SQL/DDL, no SPP read/write, no change to existing Memory Turns and no release.

## 12. Hosted gates (after independent executable SQL review)

Separate owner choices: (1) approve dedicated role/schema **in the selected environment**, (2) new Learning Games Supabase vs shared SPP project, (3) participant/capacity and abuse controls, (4) submit/feedback/reveal visibility, (5) retention/purge. Verify actual hosted database version, role/default ACLs, schema and PostgREST configuration **read-only**, and backup/recovery or safe isolation. Explicit owner authorization needed to install reviewed migration. Deploy only to approved target, run bounded synthetic hosted QA, verify old Memory RPC path unaffected, and require a separate merge/release GO. SPP/Auth/Homework tables remain forbidden as incidental changes.

**Next:** [MP1_REVIEW_AND_ROLLOUT](MP1_REVIEW_AND_ROLLOUT.md) for exact reviewer recheck and executable implementation gate. Original v1 design can be viewed in Git history at `ea403e3`. No SQL or source implementation was undertaken during this reconciliation.
