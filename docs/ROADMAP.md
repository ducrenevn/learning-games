# Roadmap — updated 2026-10-12
**Verify GitHub and [CURRENT_STATE](CURRENT_STATE.md).**

- M0 app foundation — completed.
- M1 Memory local / online game parity — completed 2026-10-09; [acceptance](audits/2026-10-09-m1-qa-report.md).
- M2 Memory Vercel hosted acceptance — completed 2026-10-09; [acceptance](audits/2026-10-09-m2-hosted-acceptance.md).

## Parallel lanes
**M3a — Memory multilingual release:** backend migration applied (per prior reported verification); draft [PR #10](https://github.com/ducrenevn/learning-games/pull/10) requires targeted final-browser DE/VI checks and separate owner merge/deploy approval. Older stacked PRs aren't a bulk merge path.

**M3 — Memory hardening backlog:** matched-pair player indicators, cross-platform emoji, performance/rate limits and anonymous room lifecycle. Outside LG-A1.

**LG-A1 — Sort (next playable activity, PLANNING ONLY):**
1. **Authorized now:** short Game Map, separated mechanics and teaching library, structure for future real reusable JSON.
2. **Owner contract gate:** finalize portable schema/version/limits, authoring and play/check/retry UX, accessible touch/keyboard, test/acceptance.
3. **After separate coding approval:** local Sort vertical slice with import/validate/edit/preview/play/export/reimport and DE/EN/VI UI; Memory regression.
4. **After separate release approval:** browser/user testing and deployment. No online Sort room, new database RPC or SPP migration in LG-A1.

**Candidates after Sort:** Conversation Cards (role privacy), then Information Gap (complementary visibility and answer checking). Require independent contracts/migrations for hosted online versions. Quick Response, Language Detective, Listen & Reconstruct remain candidates.

**SPP integration:** identities, long-term results, Homework and Auth remain separate future proposals requiring explicit owner approval.
