# Handoff — integrated release preflight (2026-10-16)

**Review target:** local branch `fix/release-preflight-20261016`, based exactly on accepted candidate `8c14b845ee4ed7892a224e9e336852255612362f`. Compare only the preflight correction diff. Do not repeat gameplay development or the 114-commit independent audit. Exact local commit, changed files and check results are returned in the task handoff; [RELEASE_PREFLIGHT](RELEASE_PREFLIGHT.md) holds the evidence and risk register.

**Current product state:** all four local games accepted on Preview; Memory online functional; Sort Individual online classroom-accepted; three Learning Games migrations including reveal lifecycle installed per owner handoff. Production merge remains pending at baseline `f8ac534026b4fcdcfa0ffa15e61890a4e5389c62`. SPP PR #12 is draft; migration-history reconciliation and legacy Memory clean-replay proof are outstanding.

**Control room next:** arrange focused independent review of documentation authority, the DE/EN/VI unfinished-host leave confirmation and cancellation preservation tests, test-worker stabilization, verification limits and pilot/public-rollout risks. Obtain the separate SPP control room's read-only hosted security/function-parity result; this branch must not duplicate that probe.

**Stop gate:** no push, merge, deploy, hosted writes, new rooms, SQL migration edits or SPP modifications. Review acceptance is followed by a separate owner release decision, including disposition of the risk register. Existing installed migrations must not be replayed or rewritten.

---

## Historical handoffs — superseded task instructions

Everything below is retained as milestone provenance. Do not execute its old “next”, approval requests or implementation assignments as the current task.

# Handoff — MP1-AB-db pending owner authorization (2026-10-14, historical)

**Accepted:** MP0 on isolated `b569d76` branch; hosted functional Memory QA completed. **Review state:** initial Opus APPROVE WITH CHANGES and second Opus APPROVED WITH REQUIRED CORRECTIONS. Control room updated [MP1 v3 backend contract](architecture/MP1_BACKEND_CONTRACT.md) and recorded [second reconciliation](audits/2026-10-14-mp1-opus-v2-reconciliation.md). No MP1 SQL, app code, local DB proof, hosted operation or merge has been performed.

**Next:** obtain explicit owner approval for **MP1-AB-db disposable-only**; then one bounded engineering implementation: new local-only Supabase scaffolding, four private tables, four POST-only entry points with secure invoker/definer boundary, Sort Individual SQL, Unicode fixture generator and ACL/secret/race/retry/purge tests. Exactly four-table scope; no app integration. Local CLI PG version recorded. If local Docker cannot run safely, STOP. No hosted Supabase read/write at all; no link, push, linked flags or SPP/Memory changes. STOP for independent SQL audit.

**Owner policy decisions needed later:** learner feedback reveal, cap, join-at-start, removed and unsubmitted attempt handling, and hosted project/abuse/retention choice. Local disposable test defaults do not decide production policy.

---

# Handoff — MP1 reviewed contract v2 (2026-10-14)

**Current state:** Opus reviewed original MP1 architecture and returned **APPROVE WITH CHANGES**. Control room reconciled F1–F16 in [MP1_BACKEND_CONTRACT](architecture/MP1_BACKEND_CONTRACT.md) v2 and [review disposition](audits/2026-10-14-mp1-opus-reconciliation.md). **No implementation is authorized**, no SQL has been installed, and accepted MP0 remains frozen.

**Read these:** [CURRENT_STATE](CURRENT_STATE.md) → [MP1_BACKEND_CONTRACT](architecture/MP1_BACKEND_CONTRACT.md) → [MP1_REVIEW_AND_ROLLOUT](architecture/MP1_REVIEW_AND_ROLLOUT.md) → [Opus disposition](audits/2026-10-14-mp1-opus-reconciliation.md).

**Next review:** brief, read-only Opus delta check focusing on F1 opaque handles, F2 SQL validator parity, F3 restricted ownership, F4 POST-only tokens, idempotent create/join, attempt revision CAS, lock order, and four-table Sort Individual slice. Return only remaining blockers or explicit acceptance, then STOP.

**Following owner gate:** approve or decline a separate *disposable-only* MP1-AB-db implementation. No remote SQL, Supabase migrations, app frontend integration, hosted writes, SPP changes, merges, or deployment. Owner policies (visibility, limits/admission/removal, hosted project choice, retention) remain pending.

**Baseline:** accepted MP0 code `b569d767e18ae0330cfbb028192470fde60a710d`; documentation-only branch `docs/lg-mp0-closure-mp1-backend-contract-20261014`. Keep legacy Memory Turns unchanged.

---

# Handoff — MP1 contract review (2026-10-14)

**Task owner:** Product owner coordinates independent reviewer; control room owns MP1 draft and reconciles findings.

**Baseline:** `ducrenevn/learning-games` MP0 feature `feat/lg-mp0-ux2-m3a-integration-20261013@b569d767e18ae0330cfbb028192470fde60a710d` (accepted **Preview**, no Production merge). Docs-only planning branch `docs/lg-mp0-closure-mp1-backend-contract-20261014` carries closure + review proposal. Live `main`/deployment refs must be reverified. Installed M3a Memory migration must **not** be replayed.

## Next assignment — independent review, NOT implementation

Have Opus independently evaluate:
1. [Locked product/mode matrix](architecture/MULTIPLAYER_V1_CONTRACT.md);
2. [Concrete MP1 proposed backend contract](architecture/MP1_BACKEND_CONTRACT.md);
3. [Review scope, evidence demands and owner gates](architecture/MP1_REVIEW_AND_ROLLOUT.md);
4. [Installed Memory baseline](architecture/BACKEND_BASELINE.md), [MP0 hosted evidence](audits/2026-10-14-mp0-hosted-acceptance.md), game validators/engines and Detective v2 model.

Return APPROVE / APPROVE WITH CHANGES / REJECT with specific P0/P1/P2 findings, evidence, exact contract edits, security proof requirements and smallest disposable MP1-A plan. Prefer a bounded **review of concrete design**, not a fresh unlimited architecture brainstorming run. **Read-only:** no repo edits, branch changes, hosted SQL, game-room writes, SPP/Auth/Homework work or deployment.

## After reviewer result
Control room reconciles findings and updates this docs branch. Product owner authorizes (or declines) a separate isolated MP1-A disposable-only implementation task. First proposed full mode: Sort Individual. Explicit new approval required for any hosted SQL/migration or merge/release.

**Historical UX-2 instructions below are superseded by this handoff.**

---

# Handoff — UX-2 owner smoke test (2026-10-13)
> **Newer branch:** `feat/lg-mp0-ux2-m3a-integration-20261013` integrates the M3a room-language policy into UX-2. Integration commit `3f1854b` is on origin, and a source-audit correction commit follows it on the same branch. Vercel Preview status is owner-reported. Not merged, not promoted to Production. See the LG-MP0 sections of [CURRENT_STATE](CURRENT_STATE.md).
**Supersedes the 2026-10-12 Wave F acceptance handoff for the Learning Games UI.** The Wave F branch is historical; its review gates still apply to that branch only.

## State
- Working checkout: `D:Local FilesApps_Websiteslearning-games`, branch `feat/ux2-single-canvas-20261012`, pushed to origin. Read [CURRENT_STATE](CURRENT_STATE.md#ux-2-single-canvas-implementation--authoritative-2026-10-13) for what is implemented and verified.
- Verified locally: typecheck, 332/332 Vitest tests, production build, `git diff --check`, and a 74-check Playwright smoke at six viewports (1440, 1024, 768, 390, 360 and 1280×560). Evidence lives in `docs/audits/ux2-design/evidence/`.
- Not verified: real phones, Safari/Firefox, screen readers, hosted Vercel, Memory online rooms, any Supabase/SPP path (not touched).

## Owner decisions already taken
- Detective v2 limits: 1–10 sentences, 2–40 words per sentence, 200 words per activity, 12 errors per sentence, 30 errors per activity. v1 files (including the 80-segment, 12-error boundary) keep importing, playing and exporting unchanged.

## Next steps (owner)
1. **Hands-on smoke test** of the single-canvas flows in DE, EN and VI: Sort (mobile categories left, bank right, info popover, tap and drag), Sequence (reorder, Enter, paste), Detective (stacked sentences, separate marks, reveal), Memory local (ownership marks). Do not create live Memory rooms.
2. **Known cosmetic issue to judge:** on the Detective player at 390 px, the "Zum Editor" link and the title wrap onto two lines.
3. **Open a draft PR** for `feat/ux2-single-canvas-20261012` (no `gh` on this machine; compare link: https://github.com/ducrenevn/learning-games/pull/new/feat/ux2-single-canvas-20261012). Do not merge or deploy without a separate owner decision. A push can start a Vercel build.
4. Memory M3a PR #10 remains a separate release gate; do not fold it into this branch.

## Constraints (unchanged)
No Supabase, SPP, hosted RPC or multiplayer backend change. No service-role keys in browser code. Keep game engines independent. Keep the Canva reference intact.
