# Current State — 2026-10-12 documentation reconciliation

## UX-2 single-canvas implementation — AUTHORITATIVE (2026-10-13)
**Branch:** `feat/ux2-single-canvas-20261012` (pushed to origin; based on design review `e892b31`; not merged, not deployed). The working checkout is this branch; the UX-2 design worktree was retired after its contents were committed (`876e28d`).

**Implemented on the branch (owner corrections 1–8 of the UX-2 authorization):**
- Single-canvas authoring for Sort, Sequence and Language Detective: one page with title, instructions, items and play actions; `Ausprobieren` (independent) and `Präsentieren` (teacher-led). An invalid activity is never launched; the first missing field is focused and named.
- Compact import: loaded file strip, game-specific teacher preview, raw JSON only behind an advanced disclosure, explicit acceptance, safe rejection.
- Global DE/EN/VI flag toggle in the app bar; Join Room card and four-game grid fixed.
- Memory: per-player colour plus symbol and initial, matching scoreboard marks; compact pair table with paste. Local engine and online contracts unchanged.
- Sequence: slim rows, keyboard and tap reordering, Enter and multiline paste to add steps; pointer drag via `@dnd-kit` (spike passed; cost about +17 kB gzip).
- Sort: teacher edits bins directly (a card's bin is its answer); learner sees a separate bank and empty bins. Mobile: categories stacked left, scrollable bank right, info popover, tap-to-place.
- Language Detective v2 (`schemaVersion: 2`, `content.tasks[]`): stacked sentence tasks, independent marking and per-sentence feedback. v1 files import, edit, play and export unchanged. Contract: [DETECTIVE_V2_CONTRACT](architecture/DETECTIVE_V2_CONTRACT.md).
- **Detective v2 limits are approved by the owner** (1–10 sentences, 2–40 words each, 200 words total, 12 errors per sentence, 30 in total).

**Verification performed (2026-10-13, local only):**
- `npm run typecheck`: pass. `npm test`: 22 files, **332/332** pass. `npm run build`: pass. `git diff --check`: clean.
- Browser smoke (Playwright, system Chrome, Vite dev server, not hosted): **74/74 checks** at 1440×900, 1024×768, 768×1024, 390×844, 360×740 and 1280×560. Covered: no horizontal scroll and no page errors for Sort, Sequence and Detective play; mobile Sort categories left and bank right, the info popover on screen, tap-to-place at 390 and 360, a 30-card / 5-category bank that scrolls inside itself; Detective v2 with three sentences at desktop and 390 (per-sentence badges, aggregate, no answer key before reveal, reveal inside each card, Vietnamese interface with German authored text unchanged); v1 single passage and the 80-segment / 12-error boundary file; Memory local play board renders.
- Evidence: `docs/audits/ux2-design/evidence/` (before/after entry screens, after-state matrix, smoke results, reproducible `tools/smoke.mjs`).

**Not verified:** real phones, Safari/Firefox, screen readers, real-device touch (emulated touch only), hosted Vercel, Memory online rooms and any Supabase/SPP path (none were touched). The before-capture covers entry screens only, because the old wizard flow cannot be driven by the new smoke script.

**Known cosmetic issue:** on the Detective player at 390 px the "Zum Editor" link and the title wrap onto two lines. Not fixed; logged for the owner smoke test.

**Gates still open (owner):** hands-on visual and pedagogical smoke test; a draft PR (not created here: no `gh` on this machine, so the compare link is `https://github.com/ducrenevn/learning-games/pull/new/feat/ux2-single-canvas-20261012`); then a separate merge/deploy decision. Memory M3a PR #10 remains a separate release gate.

**Historical:** the "Wave F" sections below describe the earlier `feat/wave-f-local-games-a1-a3-20261012` branch and are kept for history. UX-2 supersedes its UI, not its contracts.
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

## Wave F UX-1 guided editor (2026-10-12; feature-branch review)
After Sonnet's reviewed `5cf3276` was pushed to draft PR #12, the owner approved a guided authoring redesign. The redesign is developed separately on `feat/wave-f-ux1-guided-authoring-20261012`, based directly on that reviewed commit. See [UX-1 implementation notes](audits/2026-10-12-wave-f-ux1-implementation.md). New chooser, file-first import, step-by-step authoring and detached local play are in review. TypeScript and a limited jsdom smoke passed during preparation; full Vitest/build/browser acceptance remains open. No production merge/deploy or backend/SPP/Memory changes are authorized.
