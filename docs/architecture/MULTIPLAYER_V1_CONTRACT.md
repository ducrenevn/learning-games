# Learning Games — multiplayer participation V1 contract

**Owner-approved product decision: 2026-10-13.** This contract fixes the supported game/mode matrix and its pedagogical meaning. **Architecture/API/state shapes below are proposals for independent technical review, not authorized implementation or installed backend capabilities.**

**Baseline:** accepted UX-2 `feat/ux2-single-canvas-20261012@d99823747c2f3bfe82ee3643139f43a1d0a5a17e`; M3a frontend PR #10 `ec5e589` remains separately gated. The M3a room-language migration is reported installed and must not be reapplied. The UX-2 accepted UI and local modes must not be redesigned. No merge, deploy, migration, remote rooms or production-data operations are authorized by this document.

## 1. Terminology and separation

- **Game/activity**: teacher-authored validated content, independent game rules and optional scoring.
- **Participation mode**: who can act on which online state and when: `turns`, `collaborative`, `individual`, `teacher_paced`.
- **Delivery context**: local Presentation, local Independent Practice, live classroom room, or (future) SPP Homework/Classwork assignment. An asynchronous assignment is **not** a fifth multiplayer mode.
- **Room settings**: language policy, timer, score display, reveal behavior etc. Each applies only where meaningful for the particular game/mode. Do not construct an all-purpose menu or treat settings as new modes.

## 2. Locked V1 compatibility matrix

| Game | Turns | Collaborative | Individual | Teacher-paced |
| --- | :---: | :---: | :---: | :---: |
| Memory | YES | — | YES | — |
| Sort | — | YES | YES | YES |
| Sequence | — | YES | YES | YES |
| Language Detective | — | YES | YES | YES |

**Exactly 11 supported game/mode combinations** (Memory 2; Sort 3; Sequence 3; Detective 3). Unsupported modes are **not offered**, not greyed out. No speculative combinations, including the previously discussed optional Sort/Sequence turn-taking, in V1. No team competition or additional competitive variants in V1. New combinations require explicit owner/pedagogical review and tests.

Each game's *registration/capability declaration* should be the authoritative source for mode visibility; any client-side choices must also be validated by the authoritative room-creation boundary. The chosen mode is immutable for a running room. V1 may initially ship validated slices; the full V1 target remains these 11 combinations, and incomplete combinations must not appear as working.

## 3. Participation semantics

### A. Turns — one player owns the current action
- One server-designated active player can mutate gameplay while others observe; the host may recover/skip according to approved rules.
- Memory retains match/flip/score semantics and existing host/student capability distinction.
- Stale actions are rejected safely; turn ownership cannot be asserted from browser state.

### B. Collaborative — one shared state, many contributors
- All eligible students observe and interact with **one** shared board. Server arbitrates concurrent edits, revisions and ordering.
- Sort: item-to-category placements are shared; correct category keys remain concealed before check/reveal.
- Sequence: one shared ordering of steps; two simultaneous moves cannot silently clobber each other.
- Detective: selected error segments and proposed corrections are shared; simultaneous correction-text edits require an explicit conflict policy (e.g., per-field revision/reject/recover), not last-writer-wins data loss.
- Teacher controls check/reveal unless separately approved; reveal and scoring cannot expose keys early.

### C. Individual — same task, separate private work
- Every participant receives the same *canonical task content* and has an independent attempt/board; game-specific random presentation (such as Memory card order) may differ when explicitly designed.
- Student responses are private to the student and authorized teacher before submission; other learners see no peer attempts by default.
- Teacher may set a server-authoritative deadline/timer when suitable; students explicitly submit, or timeout behavior is specified before implementation.
- Room can move to review/results when submissions close. Scores, accuracy and time are separate measurements and shown only if appropriate and clearly explained; do not equate ungraded language production with a correctness score.
- This live-room individual experience is distinct from purely browser-local Independent Practice.

### D. Teacher-paced — private responses with shared host-controlled progression
- All students respond independently within the current teacher-selected round; the teacher controls progression, submission closure and answer reveal.
- Sort and Sequence: **one complete activity = one round in initial V1**. Splitting a task into subsets or successive challenges is deferred and would require a separate content/round contract.
- Language Detective: natural rounds are sentences/tasks; v1 single passage can be one round and v2 tasks may advance sentence-by-sentence. Preserve the approved v1/v2 import/export and task-ID contracts.
- A teacher may reveal aggregate response patterns only after a deliberate review action; no live answer leakage to students.
- Do not confuse teacher-paced with collaborative: each student owns a private answer, not a shared editor.

## 4. Existing local experiences are permanent independent entrypoints

Preserve UX-2's single-canvas authoring, JSON import/export, Presentation and Independent Practice, mobile behavior and DE/EN/VI switcher. Remote room state, player capabilities, submissions and results must never be serialized into exported portable teaching files. No account is required for anonymous live rooms. Do not silently enroll anonymous room participants as SPP students.

## 5. Shared room architecture — proposed technical contracts for review

Common server-validated concepts (names/types to be finalized by review):
- Room: unique code, game ID, activity snapshot/version/hash, declared participation mode, host-controlled language policy, lifecycle `lobby -> active -> review -> finished/expired`, revision, expiry and ownership/capabilities.
- Actor: host or participating student (and possible display-only viewer *only if later approved*); bearer room capability is **not** SPP identity.
- Command: typed per-game action with actor capability, room ID, expected revision or scoped revision, idempotency/correlation as needed; server validates actor, phase, game/mode compatibility, payload shape and limits.
- Student-safe projection: room policy, published prompts, safe state and own response. Do **not** send correct placements, canonical order or Detective issue/correction keys to learner clients before authorized reveal.
- Host projection: authorized private answer reference, participant statuses and review controls, with strict authorization even when using SECURITY DEFINER.
- Results: typed, provenance-marked game outcomes and an explicit evaluation/reveal version; preserve raw answers and timestamps before derived outcomes; design how late joins, disconnects and timeouts affect validity.
- Reconnect: resume from a room capability where valid, resync server-authoritative state, avoid duplicate participation/submissions, and surface expiry/revocation gracefully.
- Language: merge M3a's **server-authoritative** same-language vs student-choice policy into UX-2's **single** DE/EN/VI locale provider and accepted flag UI. Author-supplied target-language content is never translated when the interface language changes.

Keep `src/games/{game}/` engines independent. Share room lifecycle, authorization, join, localization, event/revision transport and reusable results envelope **only once the contracts are proven across modes**. Avoid a universal game reducer; shared room infrastructure must not ingest unvalidated game-specific commands.

## 6. Security and deployment gates

Current `game_poc_memory_*` RPCs are **Memory-specific**, not an authorized shared-games transport. The installed M3a `game_poc_memory_create_v2` language-policy contract must be reconciled without reapplying its migration.

Before any new backend work, independently decide whether to extend isolated prototype RPCs or introduce a genuinely game-typed room service. Propose exact schema, grants, RLS/SECURITY DEFINER behavior, strict validation, answer-key storage, per-mode confidentiality and replay/idempotency controls. Use only synthetic participants in hosted acceptance. Learning Games and SPP share a production Supabase instance; obtain fresh verified backup/recovery evidence, separate schema/security review and **explicit owner authorization** before hosted SQL or writes.

No SPP Auth, Speaking, Homework, student-data handling, Cloudinary or production Vercel changes are authorized by this contract.

## 7. Acceptance gates — proposed, not yet executed

1. Exact Git ancestry and UX-2/M3a overlap audit; selective M3a frontend integration preserving all local modes; one locale provider; correct Memory `create_v2` and room-policy enforcement.
2. Local: typecheck, complete Vitest suite, build, portable JSON corpus and round trips, Detective v1/v2 behavior, accessible keyboard/touch, browser smoke across desktop/tablet/360–390px and DE/EN/VI.
3. Mode contract tests: all 11 allowed, all 5 disallowed; game-specific action/phase/permission matrices; server rejects unsupported mode even if the UI is bypassed.
4. Disposable DB/service tests: revision races, concurrent edits, private results, hidden keys, optimistic conflict UX, duplicate commands, room expiry, reconnect, host controls and synthetic permission abuse.
5. Separate owner-approved hosted tests: multi-browser/device and reconnect, late join/timeout, locked and independent language rooms, teacher check/reveal, individual privacy, scoring, room cleanup. A local preview is not hosted proof.
6. Independent security/architecture review, owner visual/teacher acceptance, documentation reconciliation, then explicit merge/deploy GO.

## 8. Decisions still open for technical/pedagogical review

These are deliberately **not** owner-locked: whether optional timers/leaderboards ship in V1 and for which combinations; collaborative undo/conflict resolution; host editing while live; teacher-paced answer exposure/anonymous aggregation; whether results are ephemeral and for how long; whether submission is explicit or timer-closed; tie/scoring policy; maximum participants and state size; polling vs Realtime and its RLS implications; compatibility of existing hosted Memory schema with a generic transport. Resolve before coding each slice, keeping the V1 matrix stable.

**Next step:** two independent read-only architecture reviews described in [the review briefs](../audits/2026-10-13-multiplayer-v1-review-briefs.md). Assignment architecture is separately covered in [SPP integration discovery](SPP_HOMEWORK_INTEGRATION_DISCOVERY.md).
