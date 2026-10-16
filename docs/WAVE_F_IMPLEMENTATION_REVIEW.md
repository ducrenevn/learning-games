# Wave F implementation review packet — LG-A1 / LG-A2 / LG-A3
**Base:** documentation PR #11 @ 6e7e27e; **branch:** feat/wave-f-local-games-a1-a3-20261012.
**Scope:** frontend local files and in-memory attempts only; no Memory source changes, no backend, SQL, SPP or deployment. **NOT RELEASED. NOT OWNER-TESTED.**
**Status 2026-10-12:** independently reviewed and fixed by Claude Sonnet 5.5 in local commits — full report, evidence and owner checklist: [wave-f independent review](audits/2026-10-12-wave-f-independent-review.md). The review commits are **not pushed**; publishing, merging and deploying each need separate owner approval.

## Navigation
- /games/sort — select a card (click/tap/Enter); its category choices appear directly under it; the category boards above also accept the selected card ("Place here"). Check (enabled when every card is placed), Retry, Reveal. Per-card verdict is text, not colour.
- /games/sequence — reorder cards with Move Up/Down (focus follows the card; positions are announced); Check, Retry, Reveal.
- /games/language-detective — select suspect text segments, optionally type own correction (Independent/Preview only), explicitly choose "No errors", Check (per-segment verdict), Reveal for comparison. **Typed corrections are never machine-graded.**
Each page has New, Import, author metadata and game content, Preview, Present, Independent Practice and JSON Download.
Activities exist locally in the browser; downloadable files must be distributed by the teacher. No auto-share, persistence or account.

## Portable content
Exact format learning-games.activity, schemaVersion 1, activityType sort|sequence|language-detective, id, title, targetLanguage, instructions, game-specific content. Unknown properties rejected; 128 KiB (bytes) max incoming JSON; control characters, unpaired surrogates and invisible-only text rejected; teacher text rendered inertly. Categories and card IDs form referential constraints, Sequence serialized row order is correct answer, Detective flagged segment IDs are the objective key. Export excludes user attempts and session state. Importable acceptance fixtures: `tests/fixtures/wave-f/` (schema-validated by `tests/fixtures.test.ts`, not classroom-tested).

## Verified by the independent review (see report for evidence)
- `npm ci`, typecheck, 172 tests (20 Memory unchanged), production build: pass.
- Real Chrome at 1440/768/390/360 px, DE/EN/VI, Presentation and Independent, idle/checked/revealed: no horizontal overflow, no target under 44 px, no console errors; keyboard/focus, real downloads, 14 hostile files, unload guard and touch taps exercised.
- Memory: source diff empty; Memory pages pixel-compared with the docs base; local game plays the same.

## Known limitations (unchanged by review)
- **Not tested:** a real screen reader, Safari/iOS, Firefox, a real phone/tablet/projector, Vercel hosting, Memory online play.
- No drag/drop (tap/click and keyboard controls are primary). No persistence on reload. Browser file download does not prove an OS file was saved.
- No per-student network state, classroom turns, account, analytics, or teacher collection.
- Blank New forms are intentionally invalid until supplied with usable exercise content; example specs are not built-in presets.
- Existing M3a localization PR #10 remains unmerged and was not cherry-picked; shared Wave F i18n (`src/shared/activities/i18n.ts`) is scoped to these games only and **must be reconciled with M3a later**. Interface language resets to German on every load.
- Presentation and Independent differ only in layout for Sort and Sequence; Language Detective's Presentation additionally has no typing boxes.

## Acceptance gates (do NOT mark complete without evidence)
1. A1: 2–5 categories, 4–30 cards, unique IDs/text, correct references, safe JSON roundtrip; check/retry/reveal. — *automated + browser evidence; owner to confirm by hand.*
2. A2: 3–20 cards, exact serialized answer order, shuffled start, accessible order changes, check/retry/reveal. — *same.*
3. A3: 4–80 segments, 0–12 issue records, duplicate-reference rejection, explicit no-error case, model corrections only revealed after Check; never grade text suggestions. — *same.*
4. Editor, import/export/reimport, local Presentation and Independent modes in all three. — *same.*
5. DE/EN/VI interface switching keeps authored target language and content invariant. — *tested in jsdom for all three games; owner to confirm by eye.*
6. Tab/Enter/Space, visible focus, screen-reader announcements, touch, 390/360 overflow, high readability on projector. — *keyboard, focus, touch emulation, overflow verified in Chrome; **screen-reader and projector not verified**.*
7. Full Memory regression, no SPP, SQL, RPC, multiplayer modifications. — *source unchanged; unit tests and local play verified; online play not exercised.*
8. Sonnet review and fixes — **done (this review)**; OWNER acceptance — **pending**; separate release authorization — **pending**.
