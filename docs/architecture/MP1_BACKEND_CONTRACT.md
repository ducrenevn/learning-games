# MP1 — Game-typed multiplayer backend contract (reconciled v3)

**Status (2026-10-14): SECOND OPUS DELTA RECONCILED, CONTRACT v3; DESIGN PROPOSAL, NOT IMPLEMENTATION AUTHORIZATION.** Opus initially reviewed v1 at `ea403e3` (F1–F16), then reviewed v2 at `eedaa67` and returned **APPROVED WITH REQUIRED CORRECTIONS** (B1–B4, C1–C6; no new P0s). This document incorporates those corrections. They are **not implementation-tested** and owner decisions remain pending. No backend code, SQL migration, Supabase project, role, grant, frontend release, or SPP artifact has been changed by this documentation pass. See [initial review disposition](../audits/2026-10-14-mp1-opus-reconciliation.md), [v2 delta disposition](../audits/2026-10-14-mp1-opus-v2-reconciliation.md) and [execution/review gates](MP1_REVIEW_AND_ROLLOUT.md).

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
public VOLATILE SECURITY INVOKER wrapper (PostgREST-exposed)
   | qualified call into one of four private-schema entry functions
   v
lg_v1 VOLATILE SECURITY DEFINER entry owned by restricted NOLOGIN lg_v1_owner
   | strict validation + capability digest + permission + phase + size
   | deterministic lock order + compare-and-set + private evaluation
   v
Nonexposed lg_v1 schema (restricted owner, private tables/internal functions)
   | rooms | snapshots | actors | attempts
   +---- independently constructed student-safe / teacher-safe DTO
```

**Ownership choice — B3(a), locally implementable:** A dedicated `lg_v1_owner NOLOGIN` owns the new nonexposed `lg_v1` schema, four internal SECURITY DEFINER *entry* functions, helpers, and tables. It has no privileges or inherited membership that grant access to SPP objects. `public.lg_v1_*` functions are **thin VOLATILE SECURITY INVOKER wrappers** owned by the migration/platform owner; they contain only a fixed, qualified call to the matching `lg_v1` entry. This avoids temporarily granting `CREATE` on SPP's shared `public` schema to `lg_v1_owner`. The migration role creating `lg_v1_owner` may require **`GRANT lg_v1_owner TO postgres`** to SET ROLE/transfer ownership on PostgreSQL 16+; this is a **one-way** grant. Never grant `postgres`, `service_role` or an SPP role TO `lg_v1_owner`. Locally test actual `SET ROLE`, schema ownership, role membership, and definer effective privileges. Creating local role/schema is permitted *within an owner-authorized disposable implementation task*; hosted project/role creation requires its own later approval. All new private tables have RLS enabled with no app-role policies; do not FORCE RLS for owner-definer functions.

**Grants (exact minimum):** Set `search_path = ''` on BOTH public wrappers and private definer entries; fully qualify all table/function calls. Explicitly `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated` for every new signature, then grant `anon` EXECUTE on the **four public wrappers only**, and on **exactly four** matching private `lg_v1` definer entry functions; grant `anon` `USAGE` on the nonexposed `lg_v1` schema so public SECURITY INVOKER wrappers can call those entries. **No** `anon`/`authenticated` table, sequence, helper-function, DDL or default broad schema privileges. Private entries remain inaccessible through PostgREST schema routing; they still require full bearer authorization if called directly by another SQL client. Check actual Supabase default function EXECUTE (including `PUBLIC`, `authenticated`), role inheritance, schema USAGE, owner `CREATE`, and exact-name grants. Do not modify existing shared default privileges or SPP roles. Prove all of this in local Supabase/PostgREST, including negative direct calls; this is a proposed ownership/grant design, not a statement of deployed effective ACLs.

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

**Canonical activity validation:** enforce existing Sort shape and limits independently on server: common envelope and strict unknown-field checks; max **128 KiB** and appropriate request-body cap; title/ID/targetLanguage/instruction/text length, whitespace/control/markup protections, 2–5 categories, 4–30 items, unique ID/label/text rules, referential category ID and category labels. SQL/plpgsql is the authoritative MP1-AB validator and scorer, *not* client TypeScript and not a privileged Edge Function. **Reproducible Unicode parity:** The implementation must pin the Node runtime version plus its Unicode/ICU version and generate/commit SQL character-class data for JavaScript `White_Space`, `Cc` and `Cf` using a repeatable script enumerating the pinned JS `\\p{...}` sets (PostgreSQL regex lacks that syntax). Replicate JS `.trim()`/visible-content rules; SQL `btrim` alone is not equivalent. For NFC and case-insensitive duplicates, use an explicitly pinned/verified collation and compare against `toLocaleLowerCase` fixtures; candidate is `lower(normalize(x, NFC) COLLATE "und-x-icu")`, but do not assume the collation exists or has JS-identical semantics. The actual local database and Node parity tests must prove it or force a redesign before proceeding. Enforce UTF-8 bytes, code-point length, unknown-field, malformed/control/surrogate and script-like markup cases. Run the **entire** existing JSON corpus, plus Unicode/normalization/scoring edge fixtures through TS and SQL/PostgREST; mismatches are FAIL/CANNOT PROCEED, not reasons to weaken server validation. **JSON duplicate keys are last-wins in both JS `JSON.parse` and PostgreSQL `jsonb`; accept and document that common behavior**. Still enforce original request wire-byte limits via ingress as well as canonical `octet_length(p_activity::text)` bounds. A canonical JSONB byte check alone does not prove original wire bytes.

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
  p_expected_attempt_rev bigint DEFAULT NULL   -- protocol requirement: non-NULL for sort.place / sort.submit
)
→ { roomRevision, attemptRevision?, ...actorSafeView }
```

**Tokens created by browser, not database:** `crypto.getRandomValues` produces **256 bits / 64 random hex characters** for host and participant capabilities. Send token only in POST body. Server stores `sha256(token)` with global uniqueness and rejects wrong format. **B4 retry lookup order:** after minimum token format and room lookup checks, `create` and `join` first find an existing actor by digest (under the appropriate room/actor locking), check room expiry/revocation and exact canonical original-input fingerprint, then return the existing actor-safe room/seat even if `start` closed admission or the room reached capacity. A different payload/token-room pairing returns `IDEMPOTENCY_CONFLICT` or a non-enumerating error. If expired, return `ROOM_EXPIRED` even for a retry. **Only a genuinely new capability** proceeds to validation, admission-window/capacity/rate limits and insertion. This prevents an ambiguous successful join retry from losing an already held seat. The client retains its token *before* the first request and never automatically creates another token on uncertain outcomes. The token is never returned by the server; TLS, session storage isolation, expiry and redaction are mandatory.

**Commands (Sort Individual):** student `sort.place(itemHandle,categoryHandle|null)` and `sort.submit`; host `room.start`, `room.close`, `room.reveal`, `room.finish`, `room.remove_participant`. No client-supplied correctness, score, grader, participant role or arbitrary state JSON. Unavailable modes/actions are denied from server CASE allowlist. Every payload rejects extra keys, invalid types, bad handles and oversize strings.

**B2 exact attempt revision protocol (only mechanism):** `sort.place` is an absolute assignment, not a toggle. For BOTH `sort.place` and `sort.submit`, `p_expected_attempt_rev` MUST be a non-null integer matching the student's most recently acknowledged `attempt_revision` (the SQL signature may retain NULL for host commands but the per-kind dispatcher rejects NULL for these student commands). In the locked attempt transaction: **(1)** verify phase, capability and target; **(2)** if current placement already equals the requested target, return success/no-op at the current revision **without revision bump**, including a lost-response retry; **(3)** otherwise if expected revision is stale, return safe `REVISION_CONFLICT`; **(4)** else commit placement and increment attempt revision. A place retry after an intervening different placement may conflict but must **never rewind** it. `sort.submit`: if already submitted and same actor/immutable submission, return the existing safe receipt with no new mutation; otherwise require exact attempt revision, validate full placements, freeze and bump attempt revision plus room revision. The **client queues one in-flight command per attempt**, waits for the new attempt revision, then sends the next; on conflict it refreshes own state and reissues only after reconciling the intended final value. No per-item monotonic-sequence alternative, no command log. Revoked or expired actors cannot obtain receipts from retry. Host lifecycle commands are no-ops only when the exact authorized target and semantics are already satisfied; never replay new private data.

**Capability scope:** `roomCode` is required alongside bearer but no role field is trusted from client; server selects actor by digest, verifies room, active status and role. `lg_v1_state` is a true read (even though declared VOLATILE) and MUST NOT update last_seen or mutate rows. Poll rate limit/backoff is a client plus gateway decision; private attempts don't bump global `room_revision`.

## 7. Transaction and lifecycle rules

**B1 transaction and locking by operation:** READ COMMITTED, fixed order room → actor → attempt, and re-check phase/capacity/authorization **after acquiring locks**. `sort.place`: room `FOR SHARE`, actor read/lock as required, own attempt `FOR UPDATE`. `join`, `sort.submit`, **every host command** (including `room.start`, `room.close`, `room.reveal`, `room.finish`, `room.remove_participant`): acquire room `FOR NO KEY UPDATE` **before reading roster/phase or attempting a room revision UPDATE**; then actor/attempt in fixed order. `create` inserts its new room/host atomically; existing-token retries follow B4. `lg_v1_state` acquires **no row lock and makes no writes**. The `join` exclusive-enough room lock serializes capacity checks so two joins cannot exceed cap or deadlock on SHARE→UPDATE lock upgrade. `sort.submit` serializes host-visible status update and close; `room.close` waits for in-flight `place`/`submit`, freezes any remaining attempts and rejects later writes. Test same-row lock and update behavior with two real DB sessions; don't rely on intuition.

Use **two revisions**: `room_revision` for **roster, lifecycle, reveal, removal and submission receipts visible to host**, and `attempt_revision` for one student's own placements and submission. `join` and `submit` MUST increment `room_revision`; otherwise a polling host can be told `unchanged` despite a newly admitted student or submitted answer. Student private **place** never increments room revision. `lg_v1_state` can say unchanged only when *the actor-visible room view AND their permitted private attempt view* are unchanged; host view includes roster/submission statuses (not hidden learner drafts). A student may still observe a shared revision change due to another student's submit but must never see that student's answer. Conflict returns actor-safe revisions/view only.

**Lifecycle**: `lobby → active → review → finished`, plus server-time expiry from any phase. Joining closes at start (proposed owner choice), an already-admitted active participant may reconnect until expiry/revocation. Sort Individual: host starts; students privately place/submit **only with all cards placed**; an early submit with any unplaced item returns `INCOMPLETE_ATTEMPT` without freezing. Host `room.close` freezes unsubmitted attempts as `closed_unsubmitted`, evaluates unplaced items as incorrect, and records distinct completion status from an explicit student submit. It transitions the room to `review` with all attempts immutable. Host may then `room.reveal` (set committed `revealed_at`/flag on the room without an extra table; bump room revision), and `room.finish`. Removal immediately revokes student capability, but **retains a submitted/closed attempt until room purge**; a removed student cannot read it. These are **provisional disposable constants** requiring owner approval before client integration. New admission is closed after start, existing non-revoked actors may reconnect. Server must reject impossible state transitions and distinguish freeze from reveal.

**Errors:** map expected validation and permission cases to a small stable vocabulary, e.g. `INVALID_INPUT`, `ROOM_UNAVAILABLE`, `ROOM_EXPIRED`, `UNAUTHORIZED`, `MODE_UNAVAILABLE`, `UNSUPPORTED_MODE`, `IDEMPOTENCY_CONFLICT`, `REVISION_CONFLICT`, `ALREADY_SUBMITTED`, `RATE_LIMITED`. Public facades must prevent PostgreSQL `message/detail/hint` or constraint/secret reflection. Catch unexpected errors at external facade only and produce generic safe `INTERNAL_ERROR` without leaking private payloads, while preserving internal diagnostics with redaction and avoiding indiscriminate error swallowing. Negative tests search entire HTTP error body, not just `message`, for private IDs, keys, tokens and answers.

## 8. Student and teacher projections; Sort v1 evaluation

**StudentSortView** is a separate TS/DTO type, never `SortActivity` or an opaque copy of it. It includes room-scoped **opaque** category handles/labels and item handles/text, shuffled presentation, own placement handles, own attempt revision, shared state/language settings and **only permitted** results/reveal fields. Before reveal, never return original `categoryId`, authored `id`, category mapping, item explanations, per-item correct/incorrect, peer attempt, or answer-correlated order/metadata. Check React props, serializable DTO, PostgREST payload, error and HTML render paths.

**C5 host projection (server-side rule):** During `lobby` and `active`, the host DTO contains safe content, roster and submission receipts/statuses but **no answer-key material or private student answers**. In `review`/`finished` the host DTO **may** include private canonical answer reference and frozen learner submissions after host bearer authorization; the browser additionally requires an explicit teacher toggle to reveal these on a projected display. This is **not** a new server room phase: the UI toggle only controls projector visibility; the authoritative backend state controls when secret fields can leave the server. Students receive only the submission receipt until the committed `room.reveal`; other students' submissions remain private.

**Scoring:** Explicit `sort.submit` requires valid placement on **every** item; it freezes immutable raw answers and runs `scoreSort`-equivalent server evaluation against private mapping with pinned evaluator version. `room.close` freezes incomplete/unsubmitted attempts as `closed_unsubmitted`, evaluates with missing placements counted wrong, and preserves that distinct provenance for teacher review. Browser cannot send its own score/evaluator. A student receives only a receipt until teacher commits `room.reveal`; post-reveal answer feedback remains actor-scoped, never peer-private. Submitted attempts of removed students are retained privately until purge and inaccessible to revoked capabilities. Four tables suffice.

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

**Owner decisions pending before client integration/hosted rollout (not before local disposable coding):** hosted Supabase project (recommended: **new dedicated Learning Games project** to isolate anonymous write/poll load from SPP), participant cap, invitation code alphabet/entropy, new-room/create/join rate limits, response visibility policy, retention period and actual purge schedule. Do not treat Word-of-Opus as owner approval.

For disposable proof implement `lg_v1.purge_expired(p_limit)`, callable **internally by an owner-authorized maintenance operation only**, bounded and tested with correct dependency order and lock safety. Optional opportunistic bounded purge on `create` may reduce backlog but does **not** replace a reliable separately authorized scheduled cleanup (such as `pg_cron`, if installed and scoped safely). `expires_at` prevents reads/mutations at runtime; physical deletion/anonymization remains separate and must be verified. No blanket scheduler permissions, background jobs or direct grants to app roles.

Room quota and anonymous rate enforcement cannot be assumed from SQL without a trustworthy client-network origin. Before public internet exposure, implement verified gateway/edge throttling and whole-system quotas; if hosted alongside SPP, demonstrate circuit breakers and load isolation or choose a new project. Limit polling cadence, body bytes, participant count, lifecycle duration, state sizes and exception work.

## 11. Disposable MP1-AB-db and proof plan

**This is the next proposed engineering task after separate owner authorization**, not an instruction automatically approved by accepting this document.

- One isolated implementation branch/worktree based on exact accepted MP0 source (or reviewed docs baseline with identical `src/`), no edits to existing Memory RPC files. Candidate migration `supabase/migrations/<unique_timestamp>_lg_v1_sort_individual.sql` **not installed remotely**; local disposable Supabase only.
- Run local `npx supabase start` after checking Docker safety/resource limits; **pin and record the local Supabase CLI's default PostgreSQL major/minor and extension/collation inventory**. Do **not** read/query the hosted SPP DB in this task, even read-only. Hosted version comparison belongs to a later *separately authorized* hosted preflight. If disposable Docker/local Supabase cannot start safely, STOP; do not substitute any remote database. **Hard local-only guard:** no `supabase link`, no `supabase db push`, no `--linked`, no remote project reference in `supabase/config.toml`, and no `SUPABASE_ACCESS_TOKEN`/remote DB URL required for tests.
- Four tables + four VOLATILE POST RPCs, role/schema, Sort Individual private projection, frozen submit and host lifecycle/removal, bounded purge, restrictive ACLs. No new Realtime publication, hosted migration, command/event table or SPP integration.
- pgTAP/SQL ACL and ownership tests and real PostgREST `supabase-js` anon integration tests. Test **all 16 matrix combinations**, including legacy Memory Turns `MODE_UNAVAILABLE` in new service; effective wrapper/entry role ownership/grants, role membership direction and no SPP access; GET refused; full Unicode/corpus parity; private key and opaque-handle leakage; revoked/expired capabilities; **concurrent joins at capacity; close vs place; concurrent submissions; join+submit room-revision polling; no deadlocks; required expected-attempt revision; lost-response no-op and client queue semantics; retry existing actors after start/full capacity/expiry; incomplete submit; closed_unsubmitted scoring; retained inaccessible removed submissions; reveal host/student DTO gates**; expiry and bounded purge; stable sanitized error bodies.
- Locally reported functional tests must include exact commands/results; feature-code tests do not replace disposable SQL/PostgREST proof. Independently review **executable SQL and grants** before any hosted installation.
- **STOP after local proofs and source audit.** No production deployment, no hosted SQL/DDL, no SPP read/write, no change to existing Memory Turns and no release.

## 12. Hosted gates (after independent executable SQL review)

Separate owner choices: (1) approve dedicated role/schema **in the selected environment**, (2) new Learning Games Supabase vs shared SPP project, (3) participant/capacity and abuse controls, (4) submit/feedback/reveal visibility, (5) retention/purge. Verify actual hosted database version, role/default ACLs, schema and PostgREST configuration **read-only**, and backup/recovery or safe isolation. Explicit owner authorization needed to install reviewed migration. Deploy only to approved target, run bounded synthetic hosted QA, verify old Memory RPC path unaffected, and require a separate merge/release GO. SPP/Auth/Homework tables remain forbidden as incidental changes.

**Next:** [MP1_REVIEW_AND_ROLLOUT](MP1_REVIEW_AND_ROLLOUT.md) for exact reviewer recheck and executable implementation gate. Original v1 design can be viewed in Git history at `ea403e3`. No SQL or source implementation was undertaken during this reconciliation.
