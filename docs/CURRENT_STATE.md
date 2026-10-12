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
- [Agent map](GAME_MAP.md), [Sort mechanics draft](games/sort.md), and [teaching library](../library/README.md) now have a docs-only branch structure. *(At intake on `main`; superseded on the Wave F branch — see "Wave F implementation status" below. Still no classroom-tested JSON files and nothing on `main`.)*
- Initial candidate vertical slice: local author/import/edit/preview/play/check/retry/export/reimport, localized UI DE/EN/VI, no new backend. Final JSON contract, UX, limits and testing require owner agreement **before coding**.
- Later sequence recommended: Conversation Cards → Information Gap. Memory polish/hardening backlog remains independent.

**No permission** to merge, deploy, run SQL, change SPP Auth/Homework/RLS, add hosted RPCs, or store learner identities/results.

## Wave F implementation status (updated 2026-10-12, after independent review)
- LG-A1 Sort, LG-A2 Sequence and LG-A3 Language Detective are **implemented on branch `feat/wave-f-local-games-a1-a3-20261012`** (draft [PR #12](https://github.com/ducrenevn/learning-games/pull/12), based on docs PR #11 `6e7e27e`) and were **independently reviewed and fixed** by Claude Sonnet 5.5: [review report](audits/2026-10-12-wave-f-independent-review.md), [review packet](WAVE_F_IMPLEMENTATION_REVIEW.md).
- Verified locally: `npm ci`, typecheck, 172 tests (20 Memory unchanged), production build, and real-Chrome checks (layout 1440/768/390/360, DE/EN/VI, both modes, keyboard/focus, downloads, hostile files, touch). **Not verified:** real screen readers, Safari/Firefox, real phone/projector, Vercel hosting, Memory online play.
- The review's fix commits are **local and unpushed**. **Not merged, not deployed, not owner-tested.** Nothing on `main` or production changed. Owner hands-on acceptance and a separate release decision are the next gates.
- Wave F strings live in `src/shared/activities/i18n.ts`, isolated from Memory/M3a; reconcile with M3a PR #10 localisation after its authorised merge.

## Wave F scope update (2026-10-12; historical — written when only planning docs existed; implementation status is above)
Owner approved implementation of LG-A1 Sort, LG-A2 Sequence and LG-A3 Language Detective as **teacher-led Presentation Mode** and **individual Independent Mode** activities on existing frontend infrastructure. Detailed contracts: [Wave F](architecture/LOCAL_FIRST_ACTIVITY_CONTRACT.md), [Sort](games/sort.md), [Sequence](games/sequence.md), [Language Detective](games/language-detective.md). This docs PR itself contains no new runnable games. New control room implements all three; owner then requests Sonnet review/fixes before personal testing. No multiplayer, SQL, or hosted SPP changes authorized for this wave.
