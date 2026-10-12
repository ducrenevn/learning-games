# Current State — 2026-10-12 documentation reconciliation
## Verified repository baseline at intake
- `main`: `f8ac534026b4fcdcfa0ffa15e61890a4e5389c62`. Production: https://learning-games-rho.vercel.app/.
- **Memory only** on main: local game and hosted anonymous room gameplay. M1/M2 previously verified with three participants and a physical phone; see [M1 report](audits/2026-10-09-m1-qa-report.md), [M2 report](audits/2026-10-09-m2-hosted-acceptance.md).
- Older current-state documents were written before M3a and did not reflect the newer release lane.

## Memory M3a — independent release gate
- SPP migration `20261011020958_lg_m3a_memory_room_language.sql` **reported applied and verified**; do not recreate or reapply.
- Earlier frontend `e06c3acbce6c4694dc01566ea97fada76865c409` received owner-reported Antigravity three-browser DE/EN/VI, recovery and mobile acceptance.
- [PR #10](https://github.com/ducrenevn/learning-games/pull/10) was **open, draft, unmerged** at `ec5e58916406eabf7a94185d92538da535c0812c`. Owner-reported typecheck, 32 tests, build, CI and selector inspection PASS; final corrected HEAD still needs targeted locked DE/VI/browser integration check before **separately authorized** merge/deploy.
- Older stacked M3a PRs #3, #5, #6, #9 remain open; not a bulk-merge route. Live backend migration does not imply frontend release.

## Next game / LG-A1
- Owner-selected for **planning**: generic **Sort categorization**, with teacher-authored categories/items, one defensible destination per item. German articles and Kasus are *pedagogical examples*, not fixed app presets. Sequence/ordering is separately deferred.
- [Agent map](GAME_MAP.md), [Sort mechanics draft](games/sort.md), and [teaching library](../library/README.md) now have a docs-only branch structure. No actual playable Sort and no approved final JSON schema or classroom-tested JSON files.
- Initial candidate vertical slice: local author/import/edit/preview/play/check/retry/export/reimport, localized UI DE/EN/VI, no new backend. Final JSON contract, UX, limits and testing require owner agreement **before coding**.
- Later sequence recommended: Conversation Cards → Information Gap. Memory polish/hardening backlog remains independent.

**No permission** to merge, deploy, run SQL, change SPP Auth/Homework/RLS, add hosted RPCs, or store learner identities/results.
