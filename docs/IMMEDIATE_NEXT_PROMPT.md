# Handoff — UX-2 owner smoke test (2026-10-13)
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


## Next architecture planning track — approved scope, NOT implementation authorization (2026-10-13)

The owner approved a future **four-game multiplayer V1** with 11 supported game-mode combinations, and SPP Homework reuse as the preferred assignment direction. Read [MULTIPLAYER_V1_CONTRACT](architecture/MULTIPLAYER_V1_CONTRACT.md), [SPP_HOMEWORK_INTEGRATION_DISCOVERY](architecture/SPP_HOMEWORK_INTEGRATION_DISCOVERY.md), and [review briefs](audits/2026-10-13-multiplayer-v1-review-briefs.md). The next action for this track is **two independent READ-ONLY architecture reviews**, followed by a control-room synthesis and owner sign-off. Do not conflate this new planning track with the still-gated UX-2/M3a frontend integration; no coding, PR merges, deployment, hosted RPC or production schema changes are authorized.
