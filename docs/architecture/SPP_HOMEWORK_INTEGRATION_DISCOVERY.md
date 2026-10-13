# Learning Games ↔ Speak Practice Pro Homework — integration discovery

**Planning-only discovery, 2026-10-13.** No connector, shared Auth/RLS change, SQL, code or installation is approved. This is not an assignment-release contract.

## Product direction (owner-approved)

Use SPP Homework/Classwork as the **assignment delivery and history authority** where possible, rather than creating an additional asynchronous assignment tracker in Learning Games. Asynchronous assignments are **delivery**, not a fifth live participation mode. The existing local games and anonymous live rooms remain independent.

Suggested ownership split:
- **SPP:** authenticated teachers/students/classes, recipients and publication, immutable pinned content, draft/submitted attempts, revision/history, teacher review, release and correction.
- **Learning Games:** game activity schema/engine, interactive rendering, game-specific response format and explainable evaluation proposals.
- **Explicit versioned integration adapter (unimplemented):** approved public task snapshot, private teacher key/evaluator contract, safe launch context and return of response/evidence through trusted SPP submission APIs.

Never treat a Learning Games room code or capability token as SPP Auth, and never let an arbitrary Learning Games client write an SPP Homework result.

## Source inspection, October 13

Inspected on SPP `main`:
- `AGENTS.md`, `docs/START_HERE.md`, `docs/CURRENT_STATE.md`, `docs/DATA_AND_SECURITY.md`
- `docs/contracts/HOMEWORK_ACTIVITY_EXECUTION.md`, `docs/contracts/HOMEWORK_AI_IMPORT.md`, `docs/contracts/HOMEWORK_EXERCISE_KERNEL.md`
- `src/models/homework.ts`, `src/lib/supabase/homeworkAuthoringService.ts`, `src/lib/supabase/homeworkMappers.ts`

**Observed:**
- SPP Homework is reported active in production for private teacher/student use. It has authenticated access, teacher-owned drafts, class/recipient delivery, immutable published snapshots, resumable attempts, deterministic results for eligible tasks, teacher feedback, result corrections and successor revision attempts. These are SPP's responsibilities, not a new Learning Games backend.
- The **actual implemented type union** in `src/models/homework.ts` is `single_choice | gap_fill | short_response`. The deterministic subset is `single_choice | gap_fill`. `ordering` is separately planned, not proof that Sequence can be embedded today.
- The teacher-side `saveDraft`/`publish` operations use existing authenticated Homework RPCs with scoped private keys. Publication currently creates deliveries immediately; future scheduled publication is separately gated.
- `docs/contracts/HOMEWORK_AI_IMPORT.md` restricts current AI-0 importing to a new **SPP assignment proposal** with exactly those three exercise types. Learning Games JSON is a **different envelope and game schema** and is not currently a valid SPP Homework import profile.
- The SPP execution contract requires publicly safe prompts, separately protected answer keys, versioned evaluation, frozen submissions, authoritative server checks and explicit review/release. Language Detective's learner-entered correction comparison is **not an automatic correctness score**; preservation/review is mandatory.
- The SPP contract has some older proposal wording; source model and current-state records outrank prospective examples. This read-only inspection does not prove an LG/SPP launch or submission integration, because none was exercised or built.

## Adapter questions — resolve before accepting implementation

1. **Delivery:** Should SPP render Learning Games through a safe embedded runner, use a same-origin/module integration, or link to a tightly scoped standalone runner? Compare accessibility, back/forward/resume, identity, private keys and browser-origin constraints.
2. **Auth:** How does a Learning Games runner obtain an authenticated, delivery-specific execution context **without** passing reusable SPP tokens or secrets in URL/query/QR? Must remain SPP-validated.
3. **Schema:** Should SPP add a typed `learning_game` activity with supported game ID + schema version + public content and **separate private key**, or register four explicit SPP exercise variants? Do not accept opaque unvalidated JSON without an approval process.
4. **Validation/size:** Reconcile Learning Games portable 128 KiB file/Detective v1+v2 with SPP assignment limits and the currently enforced PostgreSQL public/private JSON limits. Detect mismatches; reject rather than truncate or auto-convert.
5. **Attempts:** Exact per-game response structures, stable IDs, save/resume across browsers, expected revision conflict behavior, explicit final submission, timer semantics if any, and how a single SPP activity attempt maps to game progress.
6. **Grading:** Which outcomes are deterministic and server-verifiable against private keys; which are teacher-reviewed? Preserve raw inputs and evaluated version, never trust client-reported scores as SPP grade.
7. **Versions:** Pin activity schema, evaluator, content/private answer key and student-facing rendering at publication; ensure existing submissions survive subsequent game upgrades.
8. **Privacy:** SPP authenticated per-student deliveries vs Learning Games anonymous live room; do not link participants or retain room results without explicit learner/teacher authorization and retention contract.
9. **Migration/surface:** What smallest isolated feature addition is required in SPP and in Learning Games? What existing UI/service/migration/read model is actually reusable?
10. **Proof:** Disposable SQL/RLS proof, malicious payload rejection, private-key leakage scans, cross-role and cross-class isolation, student save/resume/submission/revision, historic result stability, teacher review and no changes to Speaking.

## Recommended sequence

1. Complete UX-2/M3a local integration and stabilize Learning Games portable activity contracts; this does **not** require SPP assignment integration.
2. Perform an **independent read-only SPP adapter design review** on `main` and compare the existing Homework SQL/RLS/services, read/write projections, evaluator authority and privacy boundary.
3. Present two or three minimal integration options and a recommended scope, with explicit migration and rollback/backup needs. Owner approves one integration contract.
4. Build one small nonproduction end-to-end proof with **synthetic identities**, backed by isolated tests, without production writes.
5. Only after separate owner approval integrate further game types, SPP UI, SQL, hosted testing and production release. Do not advance the SPP Homework UX-2 development track incidentally.

**Important:** A live collaborative/teacher-paced room is not automatically an SPP assignment. Linking *results* from live anonymous rooms into authenticated Homework is an additional, separately reviewed requirement.
