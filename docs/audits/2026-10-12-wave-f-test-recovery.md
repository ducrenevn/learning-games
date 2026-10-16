# Wave F guided UX — DOM test migration (2026-10-12)

**Scope:** test-only recovery following the approved Wave F UX-1 redesign and Memory unification; stacked after draft Memory PR #15 (`692f14d`). No app/runtime source changes, no hosted calls, no migrations, no merges or deployments.

## Cause of the supplied failure log

Owner's Windows Vitest run reported **105 failed, 132 passed (237 tests, 10 failing files)**. Repeated errors included missing input fields before choosing Create, a null file input before choosing Import, and unavailable old toolbar buttons before reaching Review. Old DOM tests assumed the pre-UX all-at-once editor. The new workflow explicitly starts at a chooser and separates activity details, game-specific authoring steps, review and detached play. Duplicate label queries sometimes matched two legitimate navigation buttons (e.g. header and in-game Back to editor).

These old test assumptions **must not** be repaired by adding the crowded toolbar back, skipping tests, relaxing validators or changing answer secrecy. Pure game/validation contracts are preserved.

## Test recovery

- `tests/helpers/dom.tsx`: import through the *actual* chooser -> file picker -> detached review -> **Open in editor** flow; explicit helpers navigate to guided steps and Review. The import helper does not bypass validation or dismiss unsaved-edit dialogs silently.
- `tests/workspace.dom.test.tsx`: tests real file intake (wrong game, malformed, oversize, retry, long error lists, explicit acceptance, draft preservation), progressive step validation, browser-close guard, target-language and interface localization, review-only download and detached play. Checks are against the new UX rather than old IDs/toolbars.
- `tests/sort-editor.dom.test.tsx`, `tests/sequence-editor.dom.test.tsx`, `tests/detective-editor.dom.test.tsx`: check real individual editor steps, limits, answer-key integrity, stable unique IDs, disclosures, keyboard focus and downloaded JSON. Detective is sentence-first and marks errors on its own step. No tests fabricate direct editor visibility by mounting all panels at once.
- Sort, Sequence, Detective player and `pages.dom.test.tsx`: retain existing gameplay, scoring, accessibility, secrecy and language assertions; navigate through new Import and Review before play, and use the real step navigator after returning to authoring.
- `tests/ux-guided.dom.test.tsx`: disambiguate toolbar/footer navigation with a scoped semantic region rather than assuming a unique button name across multiple areas.

## Evidence and limits

- Source TypeScript: `npm run typecheck` — **PASS** in isolated reconstructed source (TypeScript files and tests).
- Custom **offline** React/jsdom diagnostic runner using installed Testing Library, React, and TypeScript transpilation: **110/110** migrated component-flow assertions completed (9 DOM files: editor, gameplay, workspace, pages, guided UX). It is **not Vitest**, does not run the normal Vite bundler, and is NOT a claim of the complete test suite passing. Offline runner could not load Supabase's ESM module under its CJS transpilation, so `app.dom.test.tsx`, `memoryWorkspace.dom.test.tsx`, pure Vitest suites, bundling and hosted/network behavior **remain unverified here**.
- `npm test`/`npm run build`: **NOT VERIFIED** in this Linux sandbox (user's archived `node_modules` lacked functional Linux Rollup/esbuild binaries; npm registry network unavailable). Run the Windows test suite on a clean checkout and report its exact count. Fix genuine remaining defects; do not suppress or delete cases to force green.
- No real Chrome, Firefox, Safari, device or screen-reader acceptance was run for this test-only change. Antigravity must still perform comprehensive browser/corpus testing after the clean test/build gate.

## Windows verification gate

```powershell
cd 'D:\Local Files\Apps_Websites\learning-games-wave-f-review'
git status --short
git fetch origin
# If the worktree is clean, switch to the test-recovery review branch.
git switch --track origin/test/wave-f-guided-dom-recovery-20261012
npm ci
npm run typecheck
npm test
npm run build
```

If `git status --short` is not empty, do not discard changes: use a separate worktree. **Stop on any failure** and send the full failure log for a targeted correction. Only once this test gate is clean should Antigravity begin the comprehensive four-game browser smoke. Do not merge or deploy on the strength of this audit alone.
