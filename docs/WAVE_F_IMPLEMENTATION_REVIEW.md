# Wave F implementation review packet — LG-A1 / LG-A2 / LG-A3
**Base:** documentation PR #11 @ 6e7e27e; **branch:** feat/wave-f-local-games-a1-a3-20261012.
**Scope:** frontend local files and in-memory attempts only; no Memory source changes, no backend, SQL, SPP or deployment. NOT RELEASED.

## Navigation
- /games/sort — categorize teacher-defined cards; click/tap/keyboard select card, click category tray, Check, Retry, Reveal.
- /games/sequence — reorder cards with Move Up/Down; Check, Retry, Reveal.
- /games/language-detective — select suspect text segments, optionally type own correction, explicitly indicate no issues, Check, Reveal for comparison. **Typed corrections are never machine-graded.**
Each page has New, Import, author metadata and game content, Preview, Present, Independent Practice and JSON Download.
Activities exist locally in the browser; downloadable files must be distributed by the teacher. No auto-share, persistence or account.

## Portable content
Exact format learning-games.activity, schemaVersion 1, activityType sort|sequence|language-detective, id, title, targetLanguage, instructions, game-specific content. Unknown properties rejected; 128 KiB max incoming JSON. Teacher text rendered inertly. Categories and card IDs form referential constraints, Sequence serialized row order is correct answer, Detective flagged segment IDs are the objective key. Export excludes user attempts and session state.

## Review focus / limitations
- **Mandatory external proof:** run npm ci, npm run typecheck, npm test, npm run build, browser walkthrough in DE/EN/VI at 1440/768/390/360 and keyboard/screen reader. Current work was authored through GitHub connector without a local checkout, package installation or browser runner; do not infer these checks passed from committed tests.
- Confirm TypeScript structural contracts in generic Workspace, finite-safe import handling and any ARIA interaction concerns. Inspect async import race: check dirty-edit guard if files are slow and while mode changes.
- No drag/drop (tap/click and keyboard controls are primary).
- Blank New forms are intentionally invalid until supplied with usable exercise content; example specs are not built-in presets.
- No persistence on reload. Browser file download does not prove OS file saved.
- No per-student network state, classroom turns, account, analytics, or teacher collection.
- Existing M3a localization PR #10 remains unmerged and was not cherry-picked; shared Wave F i18n is scoped to these games only.
- Visual layout and touch/keyboard behavior require interactive human validation.

## Acceptance gates (do NOT mark complete without evidence)
1. A1: 2–5 categories, 4–30 cards, unique IDs/text, correct references, safe JSON roundtrip; check/retry/reveal.
2. A2: 3–20 cards, exact serialized answer order, shuffled start, accessible order changes, check/retry/reveal.
3. A3: 4–80 segments, 0–12 issue records, duplicate-reference rejection, explicit no-error case, model corrections only revealed after Check; never grade text suggestions.
4. Editor, import/export/reimport, local Presentation and Independent modes in all three.
5. DE/EN/VI interface switching keeps authored target language and content invariant.
6. Tab/Enter/Space, visible focus, screen-reader announcements, touch, 390/360 overflow, high readability on projector.
7. Full Memory regression, no SPP, SQL, RPC, multiplayer modifications.
8. Sonnet review and fixes; OWNER acceptance; separate release authorization.

## Sonnet reviewer handoff
Review branch feat/wave-f-local-games-a1-a3-20261012 based on docs PR #11 @6e7e27e against AGENTS.md, Wave F local-first contract, three game specs, and this file. Independently inspect every new file and its tests, run npm ci/typecheck/test/build, test 3 full browser journeys, deep-check import/export, malicious or oversized files, accessible keyboard/touch/390px, DE/EN/VI, no answer leaks/false grading and Memory regression. Fix issues on the same isolated branch in reviewable commits; provide exact tests and evidence. Do not merge, deploy or touch Supabase/SPP or Memory multiplayer. Stop for owner manual testing and a separate release decision.
