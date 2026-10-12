# Wave F UX-1 — Guided local authoring implementation (isolated Git branch)

Date: 2026-10-12. **Unreleased, isolated feature branch.** Sonnet-reviewed Wave F HEAD `5cf3276` was pushed to draft PR #12 before starting this work. UX-1 branch `feat/wave-f-ux1-guided-authoring-20261012` starts at exactly `5cf3276`; it is a separate review lane, not a merge or deployment.

## Implemented

- Choice-first per-game page: **Selbst erstellen** / **Aktivität importieren**. No invalid-template messages on first load.
- File-first separate import with `.json` format hint, size/type/content validation, file-side error, detached teacher answer-key disclosure, and explicit **Im Editor öffnen**. Existing current draft is not replaced until acceptance; beforeunload guard while an import is pending; asynchronous reads use a latest-wins token.
- Guided local editor: details + game-specific steps + review; right sticky-in-place step navigator on desktop, horizontal navigator on tablet/portrait and natural scroll on narrow mobile; editor-only scroll on desktop; persistent Back/Next and local download status. Old global edit/import/play action rows removed.
- Progressive validation: incomplete draft is not a red error; step-specific issues displayed only on attempted Next (technical paths retained in error details); review shows readiness and links to incomplete steps. Buttons do not silently ignore invalid data.
- Metadata ID derived from title for freshly created activities, modifiable in Advanced, preserved unchanged for imported files. The canonical `learning-games.activity` schema and roundtrip invariants remain untouched.
- Sort category and card stages; explanation collapsed per card. Sequence correct-order rows with accessible movement preserved, explanation collapsed. Detective sentence-first input with token segmentation, explicit text preparation and manual segment editor; visual click/tap error marking and teacher corrections on a separate step. Existing per-game engines and validators are unchanged.
- Dedicated play layout, interface DE/EN/VI, authored target language unaffected; presentation and independent gameplay semantics unchanged. No new database objects, rooms, syncing, accounts, hosted writes, or SPP integration.

## Verification evidence

- TypeScript `node node_modules/typescript/bin/tsc --noEmit` **PASS** on the reconstructed source from the uploaded ZIP.
- Ad-hoc local **jsdom** React runtime check **PASS** for all three journeys through chooser → details → game-specific authoring → review, including required Sort validation and Detective error marking. This used a temporary TypeScript transpilation harness (not the production bundler), not an actual Chrome/browser acceptance test.
- Added `tests/ux-guided.dom.test.tsx` for the new first-run, file import and guided editing interactions. **NOT EXECUTED** here: the owner's ZIP includes Windows-only optional Rollup/esbuild native dependencies, and `npm ci` cannot obtain the Linux binaries in this sandbox. A Vitest attempt terminates at startup: missing `@rollup/rollup-linux-x64-gnu`. Build and real browser checks are also **NOT EXECUTED**.
- **Existing Sonnet-era UI DOM tests need navigation updates.** They encode the removed always-visible editor (`.activity-authoring`, first-load JSON input, old toolbar, etc.), so they must not be counted as passing after this redesign. The newly added UX DOM tests also await the native-package-capable runner. Pure engine and validator tests are unchanged but have not been rerun here.
- Screenshot/layout assertions and keyboard/tab/focus proof for new guided shell need browser execution. Owner visual/usability check FIRST, Antigravity cross-browser and negative cases LATER.

## Checkout and local checks

Use the isolated branch directly; no manual patch transfer is required:

```powershell
cd 'D:\\Local Files\\Apps_Websites\\learning-games-wave-f-review'
git fetch origin
git switch --track origin/feat/wave-f-ux1-guided-authoring-20261012
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

**If the existing checkout has uncommitted work, do not switch or overwrite it.** Use a new `git worktree add` from the remote UX branch instead. The previously committed tests describing an always-visible editor are known to need reconciliation after this redesign. Treat failed tests as blockers, not accepted behavior. No production release is authorized.

## Acceptance / review sequence

1. Run the new visual design at `/games/sort`, `/games/sequence`, `/games/language-detective`; inspect chooser, guided steps, file import, review and separate play at desktop, 768, 390, 360. Owner judges copy, hierarchy and manual authoring clarity.
2. Reconcile Sonnet's old DOM UI tests against the new interaction model, preserve engine/validator regressions. Run full type/test/build and investigate failures.
3. Antigravity runs browser keyboard/touch, real phone if available, interface localization, file roundtrip/hostile import, all game modes, accessibility and Memory regression.
4. Only after passing gates, owner decides separately on push, merge or deploy. Memory source, M3a PR #10, SPP and hosted Supabase remain untouched.
