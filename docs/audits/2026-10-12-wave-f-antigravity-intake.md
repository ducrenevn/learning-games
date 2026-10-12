# Antigravity intake — unified UX and Wave F corpus

**Status: ready to plan, not yet a passed smoke.** GitHub Wave F UX1 draft PR #13 is based on Sonnet-reviewed PR #12. The corpus branch (to be verified at intake) contains 20 valid and 28 invalid JSON fixtures for four implemented game types; the legacy Memory text fixture is retained alongside Memory JSON v1.

## First verify refs, branch and test environment

- Do not assume local Windows worktree equals GitHub: use `git status`, `git branch -vv`, `git rev-parse HEAD`, fetch and compare refs before tests.
- Read `AGENTS.md`, `docs/architecture/UNIFIED_GAME_EXPERIENCE_PROPOSAL.md`, `docs/architecture/LOCAL_FIRST_ACTIVITY_CONTRACT.md`, `docs/audits/2026-10-12-wave-f-ux1-implementation.md` and corpus README/manifest.
- Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build` on a verified, isolated target. Old DOM tests describe the pre-redesign editor and must be updated rather than deleted to conceal failures.
- Do not touch SPP, Supabase, production deployment, Memory RPCs or unmerged M3a PR #10. No merge without owner decision.

## Corpus test campaign

For each `valid` fixture in the manifest: launch matching game, import via real file picker/drop, inspect entire authoring content and hidden solution key in teacher review, accept, step through every editor stage, preview, Present, Practice, download/reimport, compare authored text and answer key. Change DE → EN → VI at different stages; target-language content must remain invariant. Exercise/attempt states must never export.

For each `invalid` fixture: import within matching game; verify exact localized error visible near file intake, no current draft replacement, no stale response or answer leak, no broken picker re-selection. Also generate malformed, oversized, wrong-game files, file-read races, cancelled confirmation and same-file retry. Use multiple browsers independently; document evidence with screenshots/video, console/network logs, URL, commit SHA and device viewport. Never send source to network.

**Viewport matrix**: desktop 1440, tablet 768, phone 390 and 360 (touch emulation). Keyboard only and focus retention across steps, import, Check, Reveal, Retry and back; check 44 px interactive targets, screen-reader semantics, no horizontal overflow, high readability for teacher projection. Real Safari/Firefox/physical phone or true screen reader if available; distinguish simulated from physical evidence.

**Game checks:** Sort category selection under a chosen card on mobile; correct placement and clearing. Sequence moves to extremes, preserves correct order on export, shuffled start. Language Detective clean passage explicit "No errors", one and several issues, free-text suggestions never graded, no solutions before Check/Reveal, teacher Presentation hides typing boxes. Memory JSON import, structured pairs and legacy bulk entry; local two-player and independent single-player play; existing join links and online room screens remain reachable. Memory frontend entry and LocalMemory UI have changed, but engine, RPC, MemoryJoin and MemoryRoom are unchanged; diff-confirm and check regression. Do not create online rooms or call hosted Memory RPCs during this smoke without separate explicit permission. Mock room creation for UI-only button behavior.

## Report format

Per fixture report expected/observed outcome, errors, artifact, target browser/viewport, exact source branch/commit. Separate (1) build/test, (2) browser import round-trips, (3) game play and accessibility, (4) visual/pedagogical opinion reserved for owner. Flag must-fix, enhancement and not-tested rather than broad unsourced PASS.

## Added acceptance for Memory unification

Verify the same Create activity / Import activity choice for all four games, with a third Join game link **only** in Memory. For Memory fixtures, verify imported pair count, teacher-only pair review, guided editor, legacy text conversion, download and binary-safe reimport, optional category preservation, local player names/scores/turns and language switch DE/EN/VI. Verify no room tokens, identities or scores in portable JSON. For a one-pair locally valid draft, the online-room button must be disabled; a >=2-pair draft may show the action but no hosted RPC call occurs until an explicit click. Review PR #10 separately; never assume its localized online room feature is integrated.
