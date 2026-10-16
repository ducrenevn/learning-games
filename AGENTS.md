# Learning Games — Working Rules

1. Read `docs/START_HERE.md`, `docs/CURRENT_STATE.md`, `docs/architecture/SYSTEM_OVERVIEW.md`, `docs/ROADMAP.md` before substantial work.
2. Working software outranks optimistic documentation. Verify code and tests; report unverified browser/hosted behavior explicitly.
3. Keep game engines independent. Shared components are promoted only when two games actually need them.
4. Never modify Speak Practice Pro's (SPP) speaking, Auth, Homework or database schema as an incidental game task. Hosted DDL requires separately approved migration.
5. Online Memory uses installed `public.game_poc_memory_*` RPCs (including `create_v2`); Sort Individual uses installed `public.lg_v1_*` RPCs. No new backend work is implied. Anonymous capability tokens are not identity assurance or a permanent learning-record solution.
6. No service-role keys in browser code; only public publishable keys. Avoid logging room capabilities or leaking them into QR URLs.
7. Keep the working Canva Code version intact as a reference while the port reaches parity.
8. Never claim tests, Vercel, Realtime, or SPP integration passed unless they were actually performed.
9. Source changes should include relevant documentation updates and tests; review `docs/IMMEDIATE_NEXT_PROMPT.md` when handing off.
10. Current release gate: integrated Preview accepted → bounded preflight corrections → owner-arranged independent correction review → separate release decision. SPP integration remains separately gated.

Preserve unrelated and uncommitted work. Commit, push, merge to `main` or other deployment-linked branches, deploy, or write to hosted systems only with explicit task approval; a push may initiate a Vercel production deployment.

## Tool and environment entrypoint

- This Vercel site uses **SPP's shared Supabase** for legacy Memory and Sort Individual RPCs, not a separate database or Supabase Auth. Three Learning Games migrations, including the reveal lifecycle correction, are installed per owner handoff. No further SPP migration, Auth or Homework write is authorized; see `docs/architecture/BACKEND_BASELINE.md`.
- Canva is a presentation/original prototype reference; do not assume a configured Canva coding-agent tool. Verify actual active tools and targets for hosted work.

## Current release state (2026-10-16)
- Frozen accepted candidate: `8c14b845ee4ed7892a224e9e336852255612362f`; all four local games accepted on Preview, Memory online functional, Sort Individual online classroom-accepted. Production merge is pending.
- SPP PR #12 remains draft with migration-history reconciliation outstanding. Legacy Memory clean replay remains unproven. See `docs/CURRENT_STATE.md` and `docs/RELEASE_PREFLIGHT.md`.
- This preflight permits local corrections, verification and a local commit only. No push, merge, deploy, hosted writes, new rooms, SQL or SPP changes. Preserve applied migration files byte-for-byte.

## Agent routing
- Start at `docs/START_HERE.md`. Lesson-planning agents read the **short** `docs/GAME_MAP.md` and a relevant `library/` entry, not all long game specifications.
- `docs/games/` holds game mechanics and schema proposals; `library/<game>/` holds evolving lesson ideas and, after schema approval, real reusable JSON. No example is an app preset by default.

## Historical authorizations — superseded status, not current instructions
The following records describe earlier scope and do not reopen completed work or grant release/hosted permission. On 2026-10-12 LG-A1 initially had planning-only approval, with Sequence deferred; Memory M3a PR #10 then had a separate release lane. Later development and integrated Preview acceptance supersede those status claims.

### Approved development wave (2026-10-12)
The owner authorized **implementation** of three local-first games (LG-A1 Sort, LG-A2 Sequence, LG-A3 Language Detective), using two delivery experiences: teacher-guided Presentation and student Independent Mode. Follow `docs/architecture/LOCAL_FIRST_ACTIVITY_CONTRACT.md` and per-game specs. This does **not** authorize new Supabase objects, remote sync, merged/deployed refs or SPP/Auth/Homework changes. Implementation → owner-arranged Sonnet review/fixes → owner manual testing → separate release decision. Do not mistake authorization to develop on an isolated branch for production permission.
