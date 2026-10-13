# Learning Games — independent architecture review briefs (2026-10-13)

**Status:** Ready-to-delegate **read-only** review briefs; no agent run/review result is claimed. The owner approved the V1 **11-combination** matrix, not its backend implementation or any proposed SQL.

## Review A — Learning Games multiplayer architecture

**Repository:** `ducrenevn/learning-games`

**Starting point:** UX-2 accepted `d99823747c2f3bfe82ee3643139f43a1d0a5a17e` (PR #18, stacked #11–#18); M3a frontend `ec5e58916406eabf7a94185d92538da535c0812c` (PR #10, parallel to stack); production `main@f8ac534026b4fcdcfa0ffa15e61890a4e5389c62` at intake, reverify. M3a migration `20261011020958_lg_m3a_memory_room_language.sql` reported installed; never reapply.

**Task:** Independently critique `docs/architecture/MULTIPLAYER_V1_CONTRACT.md` against actual code, tests, read-only SQL source and Git history. Read `AGENTS.md`, `docs/START_HERE.md`, `docs/CURRENT_STATE.md`, `docs/architecture/SYSTEM_OVERVIEW.md`, `docs/architecture/BACKEND_BASELINE.md`, `docs/architecture/LOCAL_FIRST_ACTIVITY_CONTRACT.md`, Detective v2 contract, both PRs, game engines, accepted UX-2 workspace, M3a policy/RPC files.

**Deliverables:**
1. Exact PR/commit ancestry and overlapping-file integration strategy; preserve UX-2 UI, locale flags, editor/portable JSON, and M3a `create_v2` + validated room language; recommend focused integration branch and non-destructive PR sequencing.
2. For **each of the 11 allowed combinations**, define observable state, action authority, valid commands/transitions, public/private data and results. Explain why disallowed combinations stay blocked even if client bypassed.
3. Server-authoritative room lifecycle, capability/permission boundaries, revisions/idempotency, join/rejoin, host controls, timeout/expiry, concurrent edits, answer confidentiality, projection and event transport. Distinguish anonymous room roles from SPP Auth.
4. Propose at least two backend approaches; assess existing Memory RPC compatibility and actual required new SQL/RLS/role/grants, data-retention and rollback needs. Do not modify production or assume Memory RPCs are generic.
5. Define a **minimal first implementation slice** plus sequence to full 11-combination V1, exact disposable tests, browser/hosted acceptance and security review gates. Flag any product decisions that must return to owner before coding.

**STOP:** Present findings and plan for owner approval. No edits to `main`, no PR merge, no frontend/backend code, no SQL install, no hosted Memory/other room writes, no deployment, no worktree cleanup or forced branch edits. Review scope is diagnostic only.

## Review B — SPP Homework ↔ Learning Games assignment adapter

**Repositories:** `ducrenevn/speak-practice-pro` and `ducrenevn/learning-games`

**Starting point:** SPP `main` actual committed source plus current production/contract evidence; Learning Games V1 participation contract and `docs/architecture/SPP_HOMEWORK_INTEGRATION_DISCOVERY.md`. Do not assume planning documents describe already-shipped schema.

**Task:** Independently inspect actual SPP Homework type union, assignment/delivery/attempt/result/revision, teacher/student read/write services, PostgreSQL migrations/RLS/RPC projections and publication/key isolation. Compare LG portable activity envelopes, game-specific answer keys, score rules and the UX-2 authoring flow. Read SPP `AGENTS.md`, `docs/START_HERE.md`, `docs/CURRENT_STATE.md`, `docs/contracts/HOMEWORK_ACTIVITY_EXECUTION.md`, `docs/contracts/HOMEWORK_EXERCISE_KERNEL.md` and the current code, not just architectural prose.

**Deliverables:**
1. Source-backed capabilities/restrictions and **exact mismatches** for Memory, Sort, Sequence, Detective; distinguish automatic evaluation vs teacher review.
2. Two or three adapter options with dataflow diagrams: embedding vs same-app integration vs authenticated handoff; address authentication, role/class ownership, URL token leakage, SPP student progress and save/resume.
3. Minimal typed versioned activity/attempt/result draft; public/private answer protection, authority and contract compatibility, teacher preview, frozen publication and revision semantics.
4. Concrete affected SPP/LG files, migrations/RPCs, independent tests and rollback/recovery gates. Call out conflicts with active SPP Homework UX-2 and queued ordering extension.
5. Recommend a smallest *synthetic/nonproduction* vertical slice and clearly enumerate owner approvals before touching SPP production.

**STOP:** Report recommendations only. No SPP/LG code changes, schema/SQL/RLS, hosted RPCs, Auth/real-learner access, production writes or deployment. No assumption that an SPP assignment is a live classroom room.

## Control-room synthesis after both reviews

Compare Review A and Review B, resolve shared security/data/UX seams, record accepted technical decisions against the V1 contract, and present staged implementation tasks. **Do not start implementation until the owner explicitly approves the reviewed architecture and the precise first slice.** The current accepted UX-2 and released SPP Homework products continue unaffected.
