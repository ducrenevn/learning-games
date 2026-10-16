# Sort UI micro-polish — correction branch (2026-10-16)

Branch `fix/sort-ui-micro-polish-20261016`, based on `08800e8`. Local commit only; not pushed, not merged, not deployed. Awaiting owner visual approval.

- **Teacher action groups:** Lobby, Active, Review and Finished host screens in the Sort online room wrap their primary and leave actions in `.action-group` (one column, 14px gap). The primary action stays full width, while "Raum verlassen" retains its natural compact width (`justify-self: start`). The Sort screens no longer rely on the `.setup-grid` margin workaround. That workaround remains for the Memory lobby.
- **Room language label:** the Sort room's language selector is labelled Sprache / Language / Ngôn ngữ (`languageLabel`) instead of the category word. The flag controls and room language policy are unchanged.
- **Information icon:** no permanent border or fill. A 40px target shows a brand-tint circle on hover (fine pointers only), on keyboard focus, and on press. The copper `:focus-visible` ring is kept. Tap highlight is transparent.
- **Information note:** positioned by `HintPopover` as a fixed box beside the icon. Above by default, below when there is no room above, right-aligned and kept inside the viewport. Re-anchored on scroll and resize. The note is no longer pinned to the top of the screen on mobile.
- **Verification:** typecheck, 482/482 tests (38 files, including the new `tests/hint-popover.dom.test.tsx` and `tests/sort-room-polish.dom.test.tsx`), and build pass. Browser checks ran against local Vite with all Supabase RPCs answered from fixtures, so no hosted room was touched. Not verified: real phones, Safari/Firefox, screen readers, real touch devices.

---

# MP1 contract v3 — second Opus delta reconciled (2026-10-14)

The second Opus review of v2 `eedaa67` found no new P0, but required four P1 fixes (B1 locks and host polling; B2 exact attempt CAS; B3 SQL owner/wrapper privileges; B4 retry before admission check) and six refinements C1–C6. All are reconciled as **design-only** in [MP1_BACKEND_CONTRACT](architecture/MP1_BACKEND_CONTRACT.md) and [second review audit](audits/2026-10-14-mp1-opus-v2-reconciliation.md). Next step requires product-owner authorization for isolated disposable-only MP1-AB-db implementation and real SQL/PostgREST proof. No MP1 SQL, SPP access, hosted changes or application code modifications have occurred.

---

# Control-room update — MP1 Opus design review (2026-10-14)

- Original backend draft `ea403e3` was independently reviewed by Opus: **APPROVE WITH CHANGES**. No hosted SQL, deployed ACLs or local Supabase startup was verified in that review.
- Reconciled v2 is now in [MP1_BACKEND_CONTRACT](architecture/MP1_BACKEND_CONTRACT.md), with all F1–F16 dispositions documented in [Opus reconciliation](audits/2026-10-14-mp1-opus-reconciliation.md). The architecture is **still a proposal**, not an approved implementation or new installed backend.
- Main changes: opaque student handles so authored IDs don't reveal answers; SQL-first validation and strict fixture parity; restricted `lg_v1_owner` + unexposed schema; POST-only VOLATILE capability RPCs; high-entropy client bearer + create/join retry; actor-scoped CAS revisions; four-table disposable Sort Individual slice and bounded expiry purge. A reviewer-recommended no-revision placement was **not** adopted due to stale request rollback risk.
- Next: focused independent v2 delta review, then separate owner approval for a strictly disposable MP1-AB-db implementation. Product decisions about results, admission/capacity, role creation and hosted Supabase location remain owner-held. MP0 `b569d76` remains frozen and unmerged.

---

# CURRENT STATE — 2026-10-14 MP0 closure and MP1 design

## Authoritative current control-room state

- **MP0 accepted (engineering and hosted functional QA):** branch `feat/lg-mp0-ux2-m3a-integration-20261013` final source `b569d767e18ae0330cfbb028192470fde60a710d`, **not merged or production-released**. Built on accepted UX-2 `d998237` with M3a Memory `create_v2` language-policy integration. Includes all four local UX-2 games and Memory online Turns.
- **Vercel Preview:** `https://learning-games-k7194h9ue-rene-s-projects1.vercel.app` READY at exact `b569d76`; Vercel deployment ID `dpl_AMZ5NxPKyHZypFCZJXCrxuF7qF14`. Last independently verified Production `main@f8ac534` was unchanged at audit; reverify live refs before operations.
- **Verification sources:** implementer reported typecheck, build, 454/454 tests; AG reported 42/42 Chromium browser scenarios, and two **real hosted synthetic Memory rooms** with two synthetic students each, both interface-language policies, polling, normal turns, reconnect, score and game completion. Two hosted rooms were intentionally created through existing RPCs; no SQL/DDL or SPP records were touched according to AG. See [2026-10-14 MP0 hosted acceptance](audits/2026-10-14-mp0-hosted-acceptance.md) for exact provenance and limitations.
- **Not proven:** hostile server permission probes; physical room-row deletion (server `expiresAt` is only metadata); physical devices, Safari/Firefox/screen readers, internet abuse resilience. Minor Join input id/name semantic note remains backlog. No need to reopen MP0 for these unless they become release-critical.
- **MP1 draft contract prepared by control room:** [MP1_BACKEND_CONTRACT](architecture/MP1_BACKEND_CONTRACT.md) and [MP1_REVIEW_AND_ROLLOUT](architecture/MP1_REVIEW_AND_ROLLOUT.md). The [owner-locked V1 11-combination matrix](architecture/MULTIPLAYER_V1_CONTRACT.md) is separate from **proposed** backend architecture. All MP1 code, SQL, Supabase installation, frontend integration and release **remain unapproved**.
- **SPP Homework adapter:** independent discovery only; see [SPP_HOMEWORK_INTEGRATION_DISCOVERY](architecture/SPP_HOMEWORK_INTEGRATION_DISCOVERY.md). No SPP Auth/Homework coupling to anonymous room tokens.
- **Current work:** independent technical/security evaluation of MP1 draft, then owner-approved isolated disposable MP1-A foundation proof and Sort Individual. Continue on this docs branch for review; do not silently merge the docs into the code branch.

**Important:** Older sections below preserve historical implementation reports as originally recorded, including now-stale phrases such as “local only”, “not yet hosted” and older test counts. This 2026-10-14 section supersedes those status claims. Do not treat historical proposed instructions as current authorization.

---

# Current State — 2026-10-12 documentation reconciliation

## UX-2 + Memory M3a room integration — LG-MP0 (2026-10-13, local branch)
**Branch:** `feat/lg-mp0-ux2-m3a-integration-20261013`, created from the accepted UX-2 SHA `d998237`. Integration commit `3f1854b` is on origin (verified with `git ls-remote`). Not merged, not promoted to Production. No hosted SQL, RPC, room or SPP write was performed. A Vercel Preview for `3f1854b` reached READY, as reported by the owner; this environment could not verify it.

- **Create Room:** a dialog asks for the room language (default: the teacher's current interface language) and whether students may choose. Confirming calls the existing `game_poc_memory_create_v2` with `p_language` and `p_allow_student_language_choice`. Cancelling makes no RPC call and keeps the editor draft.
- **Language policy:** every room state is validated (`roomLanguage` and `allowStudentLanguageChoice`). A missing or malformed policy shows a localized error instead of falling back to browser language. Mutation responses that omit the policy reuse only the previously validated policy.
- **One-language rooms** enforce the room language on every render. **Student-choice rooms** apply the room language once per visit, so polling never overwrites a participant's selection. Choices stay in memory only.
- **Language controls:** the global flag toggle is hidden on room routes and is shown on the join page, which is now localized. A student-choice room renders one control inside the room; a forced room renders none.
- **Localization:** join, lobby, play, results, board/scoreboard labels, share panel, room errors and the configuration dialog are in DE/EN/VI. Room errors are reduced to stable keys, so raw backend text is never shown.
- **Tests:** 29 new tests in `tests/memory-room-language.dom.test.tsx` and `tests/room-language-policy.test.ts`. They mock the Supabase `rpc` boundary, so the real `memoryRpc` argument shapes and policy assertion run. Full suite: 33 files, 436 tests passing. Typecheck and build pass.
- **Browser (local Vite, RPCs intercepted):** 17 checks at 1280 and 390 px: dialog cancel and confirm, host and student lobbies, one language control per room, no horizontal overflow, no page errors.
- **Not verified:** a real hosted Memory room, a real multi-device session, Vercel, Safari/Firefox, screen readers. The Memory game engine, `useMemoryRoom` turn/flip logic and the SPP backend are unchanged.

**Source-audit correction (LG-MP0 correction commit on the same branch, after `3f1854b`):**
- **F1, student language carried from Join:** a flag pick on the Join page is recorded as the student's explicit choice (`chosenLocale`, held in memory) and passed to the room as router navigation state. In a student-choice room it is the starting language. Without a pick the room language is used. Forced rooms always enforce the room language. Nothing is stored in localStorage, accounts or the backend. Because router state lives in browser history, a browser reload of the same room keeps the starting choice.
- **F2, create-room dialog focus:** focus enters the dialog on the selected option. Tab and Shift+Tab stay inside it. Escape closes it when not busy. Cancel and Escape return focus to the Create Room button. Confirmed creation does not focus the departed page. Controls are disabled while busy, and focus rests on the dialog during that time.
- **F3, forced-room first render:** the hook returns the language to render, so the first render already uses the room language. No previous-language frame is rendered for the room text.
- **Tests:** 13 new regression tests (F1: 4, F2: 6, F3: 3). Two of them were checked by temporarily breaking the Tab trap and the Join hand-over. Full suite: 33 files, 449 tests passing. Typecheck, build and `git diff --check` pass. A short local browser smoke (9 checks, Vite with intercepted RPCs) passed.
- **Residuals (non-blocking):** the Create Room button is restored by capturing it at click time. Safari does not focus buttons on click, so restoration there is unverified. Header flags are outside the inert editor and remain reachable by a screen-reader virtual cursor while the dialog is open. The flag highlight may show the previous language for one frame in a room.
- **F5, unsaved work and room creation:** the Workspace hands `onOnline` an `OnlineSession` (`unsaved`, `acknowledgeLeave`). Creating a room from unsaved edits asks the teacher once, before any room RPC. A declined prompt or a failed creation creates nothing and keeps the editor. Only the successful path acknowledges its own navigation, so the guard does not prompt again. Every other navigation stays guarded. An unedited, imported activity creates a room without a prompt, as before. Tests: 5 new in `tests/memory-room-unsaved.dom.test.tsx`; two defects were reintroduced to confirm that tests fail. Full suite 454 passing. A native-dialog browser smoke passed 6/6.
- **Still not verified:** a real hosted Memory room, Safari/Firefox, screen readers, real multi-device play.

## UX-2 single-canvas implementation — AUTHORITATIVE (2026-10-13)

**UX-2 correction pass (2026-10-13, same branch):** findings, commits, verification and open owner decisions are in [the correction log](audits/2026-10-13-ux2-correction-pass.md). Detective, Sort, Sequence and Memory layout and copy corrections are committed; the Detective refinement awaits the owner's visual opinion; annotation preservation (B2) is not implemented.
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
