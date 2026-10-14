# MP1 — Game-typed multiplayer backend contract (proposal for independent review)

**Status: DRAFT TECHNICAL DESIGN, NOT APPROVED TO IMPLEMENT.** Prepared by the control room on 2026-10-14. Product modes are locked in [MULTIPLAYER_V1_CONTRACT](MULTIPLAYER_V1_CONTRACT.md); database/API shapes, policies and limits below are **recommendations subject to independent security/architecture review and product-owner approval**. No hosted SQL, source implementation, migration or merge is authorized by this document.

**Source baseline:** accepted MP0 `feat/lg-mp0-ux2-m3a-integration-20261013@b569d767e18ae0330cfbb028192470fde60a710d` (unmerged Vercel Preview), public Supabase project reference `iizsyphqlezesbvaiztd`, current Memory RPCs in `src/games/memory/api/memoryRpc.ts`. MP0 existing Memory Turns stays operational and unchanged. SPP Auth/Homework are unrelated domains. The V1 product target has exactly 11 supported combinations; only existing Memory Turns is hosted today.

## 1. Decision and alternatives

**Recommend additive, game-typed shared lifecycle with game-specific validators/transitions**, **not** (A) cloning seven room RPCs and private tables per game, nor (B) generalizing the existing Memory flip/turn hook and schema into an unrestricted JSON reducer.

- Shared: creation, admission, capability authorization, expiry, phase/revision, room reads, actor-safe projections, idempotency and bounded command dispatch.
- Game-typed: valid commands, content sanitization, answer key, state transition, evaluation and review policy. Register supported game+mode pairs in a server-side allowlist; register capabilities separately in the client for hiding unavailable options.
- RPC surface is deliberately small but strongly typed *internally*. A JSON command **must** be dispatched through an explicit server allowlist with strict per-game schema validation; it must never be accepted as an arbitrary patch to stored JSON.
- Preserve the working Memory prototype as an isolated compatibility lane. Migration of Memory Turns to the new service is **deferred**; do not create parallel active room backends invisibly. Memory Individual is a separate later vertical slice.
- Polling is the first transport, with conditional `revision` reads and jitter/backoff. No Realtime publication or schema exposure initially; consider Realtime only after independent access-control review.
- **First implementation slice recommendation:** Sort Individual, built as foundation-plus-first-game inside a disposable PostgreSQL/PostgREST environment. Its hosted activation remains separately gated. This is a recommendation, not product-owner implementation authorization.

## 2. Locked matrix (enforce at server boundary)

| Game | turns | collaborative | individual | teacher_paced |
|---|---|---|---|---|
| Memory | YES (existing prototype) | NO | YES (future) | NO |
| Sort | NO | YES | YES | YES |
| Sequence | NO | YES | YES | YES |
| Language Detective | NO | YES | YES | YES |

**Exactly 11 YES; 5 NO.** An unshipped YES must return `MODE_UNAVAILABLE` until independently tested/activated; a NO always returns `UNSUPPORTED_MODE`. Client must not offer either. `gameId`, `participationMode`, activity version and activity snapshot are immutable after creation. A browser cannot cause a mode switch or enable unsupported combinations. Client `PlayMode` (`preview|presentation|independent`) is a *local delivery* mode and must **not** be conflated with multiplayer participation mode.

## 3. Trust zones and reference data flow

```text
Teacher browser (anonymous host capability)    Student browser (anonymous student capability)
                    |                                          |
            narrow public RPCs in exposed public schema; schema-validated arguments
                    |
          locked-down SECURITY DEFINER facade
             | capability/role/phase/expiry authorization
             | atomic revision / idempotency / bounded validation
             +--- PRIVATE room/lifecycle/participants/commands/attempts
             +--- PRIVATE immutable canonical activity + answer key
             +--- STRICT game-specific transition + evaluation functions
                    |
        actor-specific SAFE JSON projection returned from RPC
```

A classroom room code is a locator, **not a secret or authority**. A room bearer capability is not an SPP identity, does not prove enrollment, and must never be put into join QR/query parameters or exported teaching JSON. Public browser uses only the Supabase publishable/anon key. Client scores/results never become authoritative by declaration.

The backend sits in the same Supabase project as active SPP production; every new object must be namespaced `lg_v1_*` (or a separately reviewed dedicated private namespace), with an independent privileges and dependency audit. No mutations to SPP tables/functions/roles, no reuse of SPP Auth, no global role/GRANT changes. If isolation in the shared project cannot be proven in disposable tests, **stop and recommend a separate Supabase project** before hosted installation.

## 4. Proposed private persistence (not migration SQL)

All names/columns below are a reviewable schema *sketch*, not an installation-ready migration.

- `private.lg_v1_rooms`: immutable room ID UUID, unique high-entropy join code (minimum effective entropy and collision/guess rate to be measured), `game_id`, `mode`, server-validated `activity_version`, immutable content hash, status `lobby|active|review|finished|expired`, `phase`/round, integer `revision`, room interface language DE/EN/VI, `allow_student_language_choice`, server-created and expires-at times, locked visibility settings; no plaintext bearer secrets.
- `private.lg_v1_activity_snapshots`: room ID, immutable exact teacher-authoring activity envelope and version, plus **separate student-safe prompt projection** and **private answer/reference material**. Creation validates full 128 KiB UTF-8 cap and existing per-game limits *again on server*, not only in browser. Store reference/canonical item order for Sequence privately, even if authored item order defines the correct answer; publish an independently ordered playable item list.
- `private.lg_v1_room_actors`: room ID, unique participant ID, host/student role, display name and admission status, capability token digest (salted/keyed construction with server-only secret or appropriately sized random tokens + strong keyed digest; choose and justify in review), join/revoke/last-seen metadata. Enforce host role/participant ownership server-side and a maximum participants policy before hosted activation.
- `private.lg_v1_room_commands`: room ID, actor ID, high-entropy `command_id`, command type, validated canonical payload (strictly bounded), expected scope/revision, outcome digest/result, server timestamp. Unique (room, actor, command_id), including retries after timeout.
- `private.lg_v1_room_state`: room ID, game-specific **private** authoritative state, **public-safe projection constructed by code** (not a raw copy), state revision. Transactional updates use room row lock / optimistic expected revision.
- `private.lg_v1_attempts`: room ID + actor ID + round ID, private student state, attempt revision, submitted status/time, immutable submission snapshot(s), evaluator version and provenance. Student A must never receive Student B's attempt in response to any API, error, summary or transport payload.
- `private.lg_v1_results`: immutable evaluated outcomes linked to source submission and evaluator version; separately store review/reveal event/time and permissioned aggregates. Never overwrite raw answers when generating scores.

**Prefer private tables without exposed roles' table privileges** and narrow public RPCs. Establish effective ACL tests for `anon`, `authenticated`, `PUBLIC`, `service_role`, function owner and definer's inherited privileges; do not assume `private` schema alone guarantees isolation. If using RLS, define and test `FORCE ROW LEVEL SECURITY` compatibility with privileged definer roles; the execution role must not silently bypass intended policies. Review ownership, search path, extensions, operator resolution, temp-object spoofing and `EXECUTE` grants. Revoke default `PUBLIC` EXECUTE on newly created functions and explicitly grant only required entrypoints, with minimum privileges.

## 5. Public API proposal (name and signature approval pending)

Use a new `public.lg_v1_*` family. Arguments below are illustrative; wire payloads are capped and rejected on unknown fields. All replies are JSON objects with `version`, `roomCode`, `revision`, `status`, `serverTime` and a role-specific `view`; errors are **stable non-sensitive codes**.

1. `lg_v1_create(p_game_id, p_mode, p_activity, p_room_language, p_allow_student_language_choice, p_request_id, p_host_recovery_secret)` → host capability/room code **only on authenticated request outcome**. `p_host_recovery_secret` is a random high-entropy client-side retry credential provided only in RPC body, not URL/log; server stores only a securely constructed digest. Review this idempotency mechanism before implementation.
2. `lg_v1_join(p_room_code, p_display_name, p_join_request_id, p_join_recovery_secret)` → student capability on successful authorized admission. Avoid duplicate participants on retry, even when response was lost.
3. `lg_v1_state(p_room_code, p_capability, p_since_revision?)` → actor-filtered projection, or `unchanged` plus current revision. No private answer key or peer-private state even for invalid/stale tokens.
4. `lg_v1_command(p_room_code, p_capability, p_command_id, p_expected_revision, p_kind, p_payload)` → server-validated mutation and actor-safe resulting state; separate `actor_attempt_revision` or scoped field revision for commands targeting private attempts/collaborative fields. The exact conflict protocol is fixed per command; stale edits never silently overwrite data.
5. `lg_v1_leave(p_room_code,p_capability,p_request_id)` → revoke participant/capability or mark departed, preserving submitted answers under configured retention.

Host-only commands go through the same authoritative service but are checked against explicit command permissions, not client `isHost`. Each command has a typed allowlist for `(game,mode,status,phase,role)`, limit checks, and canonical input normalization. Use one database transaction around permission read, revision check, mutation, idempotency record and response/projection; specify row locking order to avoid deadlocks. No generic `patchState`, `setScore`, `markCorrect`, `setAnswerKey`, or client `finish` bypass.

**Important retry invariant:** A lost response must not create an additional room/participant/move simply because the teacher clicks again. Duplicate `command_id` with *identical canonical input* returns the stored actor-safe result if still authorized; same ID with changed input returns `IDEMPOTENCY_CONFLICT`. Mutations that fail definitively do not create a committed command record. Create/join retry credentials must be unguessable, collision-resistant and excluded from all URLs/telemetry.

## 6. Lifecycle and permissions

- `lobby`: host can create/invite/start; students may join while capacity permits; no game mutation. Host sets language policy once at creation.
- `active`: game-specific actions; host may close submissions, skip only where relevant, or advance rounds in teacher-paced mode.
- `review`: server locks submissions/board according to game/mode; host may reveal/evaluate/release according to explicit policy. A student cannot read keys until the **authorized reveal boundary** has been committed.
- `finished`: responses and results are frozen for remaining room lifetime; explicit actor-scoped view only.
- `expired`: all commands fail with `ROOM_EXPIRED`; reads reveal no secret even if rows remain. Scheduled physical deletion/anonymization and independently verified retention are separate requirements.

Allowed transitions are enumerated and checked server-side: `lobby->active->review->finished`, with game-specific permitted shortcuts (e.g., forced finish only by authorized host, never an arbitrary browser state patch); `*->expired` when time passes. No student-controlled phase changes. Clarify whether automatic finish for Memory is a mode-specific permitted transition. State revision increments on every committed shared mutation; actor-attempt revision increments for private individual changes. A stale revision returns safe `REVISION_CONFLICT` and current permitted projection, never updates persistent state.

Admission policy must be explicit before implementation: no joining a started/finished room by new participants without a named late-join decision. Existing participants may resume by capability until expiry unless revoked. Host cannot impersonate a student by merely supplying a participant ID. Guessable room code does not enable state access. Apply measured abuse controls at edge/database boundary for anonymous create/join and rejected-token probes. Treat CAPTCHA/rate limits as separate deployable prerequisites if anonymous write endpoints are internet accessible.

## 7. Data projection rules — non-negotiable

Return only *constructed* allowlisted DTOs for students. A view assembled by deleting fields from a full private JSON object is forbidden. Before authorized reveal:

- **Sort:** categories expose `id,label`; cards expose `id,text`, **never `categoryId`** or private `explanation`. Student placements for their private attempt only; collaborative shared placement is visible but still not correctness.
- **Sequence:** prompt + independent shuffled items `id,text`, not canonical teacher order/position or private `explanation`; student-submitted order privately stored. Maintain a server-defined initial display order independent of answer key.
- **Detective:** v1 segment stream and v2 task/segment streams with stable task-local segment identifiers. Student projections **never include `issues`, model `correction`, `explanation`, or summary that reveals answers**. Student submissions include selected segment IDs, explicit no-error per task and optional correction text, scoped by task ID for v2. Teacher-authorized review yields key material only at the defined boundary.
- **Memory:** existing turn-based room uses its existing independently proven safe `PublicCard` projection; any future Memory Individual service uses server-owned pair identity, private shuffled board and scoring/reveal separately. Do not simply publish all pairs or matched hidden card values.

Before reveal, *do not leak via* validators, field counts (“3 issues remain”), sorted server arrays, completion percentages showing correctness, errors, mutation timing, aggregate heat maps, or per-student status. Never allow a student to request `view=teacher` as a string argument. Teacher views may carry private references only after exact host capability verification. After reveal, explicit projections may include only the authorized answer section and appropriate teacher-authored explanations.

## 8. Mode-specific state and command contracts

Each command family below is scoped by game and mode. Exact wire discriminants and signatures are implementation-review tasks, but no additional mode is authorized.

| Game / mode | Student mutates | Host controls | Protection/evaluation |
|---|---|---|---|
| Memory / turns | `flip(cardId)` only during assigned turn | `start,skip/advance` | Existing Memory RPCs; do not modify for MP1 |
| Memory / individual (later) | private `flip` per participant | `start,close,review` | Each private board and score; no peer cards or responses |
| Sort / collaborative | atomic `place(itemId,categoryId|null)` to shared board | `start,close,check,reveal` | Shared revision/field conflicts; answer categories private until reveal |
| Sort / individual | private `place`, then `submit` | `start,close,review,reveal` | Per-actor revision and private placements; server scores after submit |
| Sort / teacher-paced | private `place` in 1 activity-wide round, then submit | `start,closeRound,review,reveal,finish` | Host advances shared phase; peer responses private |
| Sequence / collaborative | atomic `move(itemId,afterItemId|null)` on shared order | `start,close,check,reveal` | Expected shared revision; reject stale whole-order rewrites |
| Sequence / individual | private `move`, then `submit` | `start,close,review,reveal` | Server verifies permutation and canonical answer order |
| Sequence / teacher-paced | private `move` in 1 activity-wide round, submit | `start,closeRound,review,reveal,finish` | Private attempts and host progression |
| Detective / collaborative | `toggle(taskId,segmentId)`; `proposeCorrection(taskId,segmentId,text)`; `setNoError(taskId,bool)` on shared state | `start,close,check,reveal` | Per-target revisions, conflict messages for simultaneous text edits; reference issue keys private |
| Detective / individual | same operations on private per-actor attempt, then `submit` | `start,close,review,reveal` | Server scores segment identification only; correction text ungraded |
| Detective / teacher-paced | same per-task private operations in current sentence round, then `submitRound` | `start,closeRound,review,reveal,advance` | Per-task private attempts, teacher-controlled rounds, no automatic grading of prose |

Commands must reject unknown game/mode discriminants, invalid IDs, missing/duplicated payload fields, cross-round edits, repeated submissions, attempts to edit after closure, hidden-key requests, and oversize text. `check` is a server evaluation action and its visibility policy must be explicit; not a browser-supplied correctness verdict. The host's ability to reveal private student attempts vs publish results is separately permissioned.

**Collaborative conflict policy (recommended):** Use atomic per-item commands for Sort; revisioned stable-ID move commands for Sequence; revisioned task/segment selections and per-correction-field compare-and-swap for Detective. On conflicting concurrent text edits return `FIELD_CONFLICT` with only the currently permitted shared field text and revision, never silently last-writer-wins. Explicitly test two editors at the same time.

**Teacher-paced initial bounds:** Sort and Sequence use exactly one entire activity round; Detective v1 one round, v2 each `task.id` one round in immutable order. Student answers are private until review. No speculative subsets, live dashboards with answers or multi-round Sort/Sequence in V1.

## 9. Evaluation and result envelope

Evaluation must occur on the trusted backend using frozen canonical content and private keys, with version-pinned pure validators/evaluators. Result envelope proposal:
```json
{
  "gameId": "sort",
  "mode": "individual",
  "activitySchemaVersion": 1,
  "evaluatorVersion": "sort-v1",
  "roomRevision": 12,
  "actorAttemptRevision": 4,
  "submissionId": "opaque-server-id",
  "submittedAt": "server-utc-timestamp",
  "status": "submitted",
  "metrics": { "correct": 3, "total": 4 },
  "grading": { "kind": "deterministic", "scope": "item-placement" },
  "revealed": false
}
```
Responses must be role-filtered: do not return private per-item correctness, model answers, or peers' metrics to unauthorized actors before an explicit check/reveal decision. ScoreSort is exactly category assignment equality; Sequence exact positional ordering; Detective only teacher-tagged issue detection and no-error per sentence. **Detective free-text corrections must remain raw, ungraded, teacher-reviewable, never an LLM or string-match correctness grade.** Even `matchesModel` is comparison feedback, not authoritative score.

Do not present ranking/leaderboards/timed scoring or team competition without an approved disclosure/product rule. Snapshots and result provenance must survive evaluator upgrades within the configured room retention; no backdating or rewriting already-submitted attempts.

## 10. Default policies proposed for owner decision (NOT locked)

To keep the first slice small, propose: (a) anonymous **synthetic-only** beta rooms until abuse protections are reviewed; (b) short ephemeral 3-hour expiry aligned with existing Memory prototype observation, but do **not** assume expiry implies physical row deletion; (c) no configurable timer, leaderboard, peer submissions or auto-reveal in Slice 1; (d) explicit student `submit`, host `close` and `reveal` boundaries; (e) initial student count cap chosen after capacity testing, not guessed; (f) no new participant admission after `start`; (g) retry/rejoin within validity using same bearer capability; (h) versioned snapshots and results; (i) no persistent account linkage or homework grade exports. Owner/reviewer must accept or amend these policies prior to implementation.

**Open decision requiring explicit resolution:** who can see their own correctness feedback immediately on submit and when can teacher see each student's response? Recommended secure default: submissions freeze, student sees *receipt only* until host starts review, teacher can inspect submitted responses after closure, and only an explicit host reveal exposes model answers/correctness to students. Do not ship inconsistent scoring feedback across modes by accident.

## 11. Build slices, each independently gated

**MP1-A — foundation in disposable DB only:** versioned room schema, restricted roles/RPCs, typed allowlist, admission, room-language policy, capability digest and safe state/projection, deterministic creation/join retries, expiry and revision contracts. No hosted installation and no app integration.

**MP1-B — Sort Individual:** server-validated Sort snapshot split, server-owned private placements/submit, evaluation + host review/reveal, one React room client reusing only proven shared UI and locale. This is the recommended first complete vertical slice. Fail-closed tests for teacher key confidentiality and student-to-student isolation.

**MP1-C — Sort Teacher-paced:** one complete activity round, host close/reveal/progress; per-student private responses.

**MP1-D — Sort Collaborative:** shared placements and atomic item commands; conflict tests.

**MP1-E — Sequence Individual → Teacher-paced → Collaborative:** server-private canonical order, initial shuffle and permutation checks; racing reorder commands.

**MP1-F — Detective Individual → Teacher-paced → Collaborative:** v1/v2 task IDs, per-task no-error, free-text preserved/ungraded; field conflict resolution.

**MP1-G — Memory Individual:** new safe per-student Memory board path while leaving installed Memory Turns on the prototype. Full V1 = all 11 supported pairs (10 new, 1 existing), not necessarily one backend implementation. Whether to migrate Turns is separate work.

Each slice: exact source baseline → isolated worktree and docs → local/disposable schema + PostgREST permission proof → independent reviewer at security-critical boundaries → separately approved hosted migration → AG synthetic browser test → separate owner merge/release decision. No stage is implicitly authorized by acceptance of this document.

## 12. Mandatory security/disposable proof matrix

Before hosted SQL, prove in disposable PostgreSQL matching hosted **major version** and PostgREST behavior:

1. All 11 allowed and 5 forbidden combinations, plus feature-unavailable mode rejection.
2. No direct grants for `anon`/`authenticated` on private tables, views, sequences; no `PUBLIC` function EXECUTE; only intended RPCs exposed.
3. Positive/negative capability tests (missing, expired, revoked, wrong room, replayed, student acting as host, cross-student access, guessed code).
4. Missing/malformed/oversize/unknown JSON fields rejected; wrong schema versions and Detective v1/v2 boundaries.
5. Sort `categoryId` and explanation, Sequence canonical order/explanation, Detective issue/correction/explanation/summary absent from student read **and error/retry responses** before authorization.
6. Concurrent mutations (simultaneous item placements, Sequence moves, two correction text writers), conflict response, serializable state, deterministic revisions and no lost updates.
7. Idempotent create/join/mutation under lost replies, duplicate command ID with different payload, and uncertain timeout recovery.
8. Submission freeze, evaluator version pinning, correct teacher reveal, teacher-paced round gating, privacy of peer attempts and results, reconnect and no duplicate participation.
9. Simulated expiry **and actual retention cleanup job** independently (expiry metadata is not proof of deletion); check lifecycle with missing workers.
10. No mutation/grant/redefinition of SPP objects; exact schema diff and rollback strategy; no privileges bleed through executor roles or `search_path`.
11. Resource abuse: code enumeration, create/join throttling, per-room sizes/participants, payload/mutation rate, polling load and retention.
12. Privacy-safe telemetry: room code and bearer capability redacted; no raw teacher answer keys or student attempts in logs/exceptions.

**Release gate:** Independent Opus security/architecture review of precise schema, role ownership, RPC signatures, permission matrix, projection builders, transaction locking/idempotency, tests and migration/rollback **before building or installing hosted backend**. The review may recommend a different project or strategy. Owner decides after review.

## 13. Acceptance evidence and migration protocol

Produce (a) exact SQL migration proposal with checksums, (b) reviewed migration and rollback/forward-fix plan; data-loss or nonreversible operations require separate authorization, (c) disposable proof with test commands/output and ACL/row-privacy reports, (d) snapshot of hosted PostgreSQL version and actual effective grants/RLS ownership read-only, (e) verified backup/recovery path plus SPP freeze/coordination, (f) staged installation/deployment and precise room testing with synthetic identities, (g) old Memory RPC regression, and (h) no writes to SPP tables or Auth.

Do **not** treat the hosted Memory smoke as hostile-adversary proof. The 2026-10-14 AG test verified ordinary role UI behavior, two room completions and three-browser synchronization; it did not exhaust unauthorized RPC probes. It observed `expiresAt` approximately three hours out, not a purge job.

## 14. Independent review questions

The reviewer should explicitly answer: Is the additive shared typed lifecycle safer/smaller than per-game isolated RPCs given this Supabase environment? Can strict answer projections survive independent local content schemas? Are proposed retry credentials and bearer digests sufficient or overly complex? Are transaction/revision semantics deadlock-safe and compatible with PostgREST? Does `SECURITY DEFINER` privilege configuration actually restrict all private data? What first-slice preconditions require changing the project or approving rate-limit/retention policy? Are the 11 combinations and teacher-paced semantics complete without premature abstractions? See [MP1_REVIEW_AND_ROLLOUT](MP1_REVIEW_AND_ROLLOUT.md).

**STOP:** Documentation only. Do not implement SQL, APIs, backend or frontend under this draft.
