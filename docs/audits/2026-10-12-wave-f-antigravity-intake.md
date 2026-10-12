# Antigravity Wave F — pre-smoke intake and corpus contract
**Source:** UX draft PR #13 at e96db14, stacked docs/corpus branch at its verified GitHub HEAD. First inspect AGENTS.md, Wave F local-first contract, docs/architecture/UNIFIED_GAME_EXPERIENCE_PROPOSAL.md and tests/fixtures/wave-f/corpus/{README.md,manifest.json}.

## First gate: baseline and test recovery
Check Git refs/clean worktree, run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`. Sonnet-era DOM tests were written for the old all-at-once editor; update them to the new step-based workflow, never conceal failures. Report exact test counts and failures. No merges or deployments.

## Corpus and interactive browser acceptance
Read `manifest.json`, exercise **all 15 valid and 21 invalid fixtures** with the real file picker/drop zone. For each valid file, verify import review (including teacher solution key), explicit accept, guided editor, Preview, Presentation and Independent, Download and reimport with content/answer preservation. For invalid files, verify the expected field-level error, draft unchanged, no answer leak, ability to reselect same file and then import a good one. Additionally synthesize wrong-game JSON, malformed/oversize JSON, cancelled/discarded imports and slow-read races. Include screenshots/URLs/browser/commit and console/network evidence.

Run 1440/768/390/360 layouts; touch-emulated and keyboard-only; focus retention, 44px targets, ARIA/live notices, responsive no-overflow. DE/EN/VI interface changes must not translate source language. Sort: place/clear and mobile categories under selected card. Sequence: reorder extrema, exact key and retry. Detective: zero/single/multiple errors, no automatic grading of free-text, no answer leak, Presentation typing hidden. Memory: local legacy pair gameplay and unmodified source regression. **Do not create hosted Memory online rooms without separately approved live backend writes.**

Separate technical PASS/FAIL from owner's personal UX feedback. Mark real screen reader/physical iOS/Firefox/Safari/projector tests as NOT TESTED unless performed.
