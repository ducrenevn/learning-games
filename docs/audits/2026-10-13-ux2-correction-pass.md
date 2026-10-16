# UX-2 correction pass — 2026-10-13

**Branch:** `feat/ux2-single-canvas-20261012` (draft PR #18). **Base:** `d8c185c`.
**Scope:** correct the Antigravity audit findings and the owner's follow-up requests on the single-canvas UX-2 branch. No merge, no deploy, no Supabase/SPP/RPC change, no Memory M3a work.

**Written for:** the owner and the next reviewer, who need to know what changed, what was verified, and which decisions are still open.

## Commits

| Commit | Change |
| --- | --- |
| `e2bd31d` | Detective: missed error locations stay hidden until Reveal after Check; no empty review box (A3) |
| `39ce806` | Sort drag ghost keeps short words on one line (owner finding) |
| `c0cf72c` | Detective: red picked words, corrected-sentence line with inline inputs, pill "Kein Fehler" (owner refinement) |
| `2a31976` | Unsaved teacher work is guarded on every internal navigation; data router (B1) |
| `31192c1` | Memory board: phone columns, desktop balanced counts, owner band (A1) |
| `ccceb66` | Sort bank wider and category names unbroken on phones (A2) |
| `cf7a684` | Sort card text and Sequence focused row: full-width text on phones (B4, B5) |
| `32e57a7` | Blank placeholder rows are not duplicates; strict import unchanged (B3, part) |
| `e59e574` | Singular forms for counts of one (C) |
| `9160c21` | Face-down Memory cards carry their position in their name (C) |
| `5e7c67c` | Detective colour roles: copper for picks, green only for verdicts and revealed answers; one sentence verdict; neutral correction inputs; shorter caption; keyboard vs pointer focus; import preview colours and gaps; marks follow their word or wait in "Zu prüfen" (B2) |
| `7697dd6` | Sequence: a pasted list fills the empty rows below it instead of leaving blank steps (B5) |
| `867543f` | Owner decisions: Detective focus rings and single review list; Sort category row; Memory owner initials and 360 px scoreboard; blank rows neutral until the next attempt (B3); pressed icon hover; short-height presentation chrome |

## Second pass: owner decisions and colour rules (2026-10-13)

The owner reviewed the first Detective screenshots and approved the layout in principle. This pass applies the colour rules and the decisions below. The Detective interaction is **not accepted** until the owner confirms the refined visuals.

Colour roles: **copper** = a word picked as an error (kept after Check, right or wrong); **green** = a verified result (the sentence verdict) and a missed teacher answer after Reveal; **neutral** = the learner's own correction text and the "Kein Fehler" pill.

| Item | Verdict | Change |
| --- | --- | --- |
| Green on learner-correct words after Check | **Confirmed** | Correct picks stay copper with no tag. A false pick is dotted and tagged "Kein Fehler hier". |
| Repeated "Richtig markiert" on every word | **Confirmed** | Removed. One verdict per sentence: "Richtig" or "Nicht ganz", including a single sentence. |
| Duplicate review lists after Check and Reveal | **Confirmed** | Removed: the word tags say the same. Only "Noch nicht gefunden: n" remains, before Reveal. |
| Long caption on every sentence | **Confirmed** | "Deine Korrektur · nicht automatisch geprüft", muted. |
| Correction inputs green | **Confirmed** | Neutral white with a grey border. Never graded. |
| Focus ring the same colour as errors | **Confirmed** | Ink-blue ring, scoped above the generic copper ring. Checked with a real Tab key. |
| A touch tap should not open the keyboard | **Confirmed** | A pointer pick keeps focus on the word. A keyboard pick (Enter or Space) moves focus to that word's correction input. |
| Import preview: green on the wrong words; no gap between sentences | **Confirmed** | Wrong word copper, replacement green; gaps 14 px (12 px on phones). |
| Annotations lost when a word is inserted before them | **Confirmed** (B2) | An annotation follows its word only when the word is unchanged apart from surrounding punctuation, or when a repeated word sits in an identical head or tail of the sentence (see the third pass). Anything else moves to "Zu prüfen", which blocks export and play until the teacher attaches or discards it. Removing a sentence that holds such marks asks first. |
| Blank rows red after an earlier attempt (B3) | **Confirmed** | Only problems that existed at the last attempt are red. A row added later is neutral until the next attempt; the problem summary still counts it. |
| Stray × above the first Sort category | **Confirmed** | The name and its remove control share one row on phones (screenshot checked). |
| Pressed icon invisible on hover | **Confirmed** | White on green on hover too; not dimmed by the card's inactive state. |
| Memory default players "Spieler 1 / Spieler 2" share the badge letter "S" | **Confirmed** | The badge shows the player's number when letters collide. |
| Scoreboard badge wraps at 360 px | **Confirmed** | Badge stays whole; one player per row below 420 px. |
| Presentation chrome hides the first board on short screens | **Confirmed** | Below 820 px of height the title, subtitle and prompt shrink: 1280×600 board moves from 354 px to 252 px. |
| Sequence paste leaves blank steps | **Confirmed** | Pasted lines fill the empty rows below first. |
| Long German compounds break inside the word | **Confirmed, decision open** | See below. |

**Checked in Chrome** (system Chrome against the Vite dev server): Detective at 1440 and 390 before Check, partly correct, fully correct, error-free, and Reveal; keyboard focus; import preview with three sentences; Sort headers at 390; Sort pressed icon on hover; presentation at 1280×600, 1366×768 and 1440×900; Memory presentation chips at 360. No page errors and no horizontal scroll in any state. Screenshots: `docs/audits/ux2-design/evidence/corrections-2026-10-13/` (`det-*`, `present2-*`, `sort-phone-headers.png`, `memory-chips-360.png`).

**Measured, not changed:** with the Sort play screen at 390 px, 6 of 30 chips break inside a word (for example "Geschwindigkeitsbegrenzung", "Donaudampfschifffahrtsgesellschaft"). At 360 px, 9 of 30 do. No chip overflows its box. Natural wrapping cannot keep these words whole at this width without shrinking the font or hyphenating. That is the owner decision below.

**Owner decisions needed**
1. **Detective visuals:** accept or adjust the refined colours, the one-verdict line, the neutral inputs, the caption wording, and the "Kein Fehler" pill, which is now ink rather than green.
2. **Keyboard focus:** keyboard picks move focus into the correction input. The alternative is to keep focus on the word, which leaves Tab as the only route.
3. **Long German compounds:** (a) accept breaks inside words that are wider than the chip; (b) shrink the font for those words; (c) authors add soft hyphens.
4. **Annotation review:** confirm that a mark which cannot be matched safely moves to "Zu prüfen" rather than being dropped or guessed.

**Not done in this pass:** real touch devices, Safari and Firefox, screen readers, the hosted Vercel build, and Memory online rooms. The Memory 16-pair board at 390 px still scrolls the page (this is the owner's accepted layout).


## Third pass: strict annotation matching (2026-10-13)

The owner accepted the visual review. One technical point had to change before sign-off: the earlier matcher let a mark follow a word that only shared a three-letter stem, so "Haus" → "Haustür" and "machen" → "Macht" could keep a correction that belonged to a different word.

**Rule now** (`src/games/language-detective/align.ts`):
- A word matches only when it is identical apart from surrounding or inner punctuation. Case is significant ("machen" / "Machen" differ), and an edited ending is a different word ("habe" → "habt", "Haus" → "Hauses", "Haus" → "Haustür").
- A word that occurs more than once in the sentence follows its mark only inside an identical head (same index from the start) or an identical tail (same distance from the end). Anywhere else the occurrence cannot be proven, so the mark goes to "Zu prüfen".
- Everything else (a deleted word, a split, a changed word, a moved repeated word) goes to "Zu prüfen". Recovery is one click: the teacher attaches the held mark to the intended word or discards it.

**Tests:** `tests/detective-align.test.ts` covers the stem and case cases, punctuation-only changes, insertions and deletions, a modified ending, a split, repeated words (unchanged, deleted, inserted before an identical tail, moved, swapped), and the review gate. `tests/detective-editor.dom.test.tsx` now expects a typo to hold the mark for review, then attach it to the typed word on an explicit choice.

**Adjacent identical words:** a deletion or insertion inside a run of two or more identical words cannot be placed by position, because the same text results from removing any member of the run. Every member of such a run is therefore held. Non-adjacent repeats keep the head and tail rule. `tests/detective-align.test.ts` covers marked first and second occurrences, deletion and insertion in both directions, an unchanged run, and a longer run.

**Chrome check** (system Chrome, Vite dev server, fixture `03-zwei-fehler-im-service.json`): "Gäste" → "Gästen" holds the mark; restoring the word does not reattach it silently; "ein" → "eins" holds its mark; a punctuation-only edit on a fresh page keeps both marks with no review item. No page errors, no horizontal scroll.

**Known trade-off:** a mark held for review does not come back when its word is restored. The teacher attaches it again. This is deliberate: a silent reattach is the failure the owner asked to rule out.

## Fourth pass: final feedback polish (2026-10-13)

The owner's final polish brief. No redesign. Scoring by identification only, Detective v1/v2 compatibility, annotation recovery and the Check → Retry → Reveal secrecy are unchanged.

**Colour and state rules** (`src/games/language-detective/DetectivePlayer.tsx`, `src/styles.css`):
- Copper: a picked word, before and after Check, right or wrong; and a missed error after Reveal (dashed frame, "!"). A false pick after Check has a dotted copper frame and "✗".
- Green: the sentence verdict, a correct "Kein Fehler", a correction that matches the model after Check, and the model answer in the key after Reveal. No green is ever put on a word of the original sentence.
- Corrections after Check: a match is soft green; a different text is discreet grey and never reveals the model answer; an empty box is dashed and labelled as not filled in. A correction on a false pick has no model answer, so it stays neutral.
- Matching (`matchesModel` in `src/games/language-detective/engine.ts`): case-sensitive; leading, trailing and repeated spaces are ignored. It is feedback only, not part of the score, and a non-match is not presented as an error.
- A wrong "Kein Fehler" pill is copper with "✗"; a correct one is green with a tick. Both show only after Check.

**Word cards:** the glyph sits beside the word on the same line, and the status name is visually hidden inside the button. Every card keeps its height before and after Check (48px in the browser check). A legend under the sentence names the marks on screen; "Übersehen" appears only after Reveal.

**Caption:** before Check it stays "nicht automatisch geprüft". After Check it reads "Vergleich mit der Musterkorrektur, keine Bewertung" (DE, EN, VI), so it no longer says the answer is not checked at all.

**Answer panels:** an error-free sentence shows one confirmation line after Reveal, not a panel. Sentences with errors use a tighter panel, and the model answer is green. Once the solutions are shown, the Reveal button is removed rather than left disabled.

**Tests:** `tests/detective-feedback.dom.test.tsx` (14 tests) covers matching, differing and empty corrections; neutral corrections on false picks; the caption before and after Check; false-pick and missed marks; the glyph-free correct pick; the green and copper "Kein Fehler" pill; the compact confirmation; green model answers; and the removed Reveal button. `tests/detective.dom.test.tsx` has two assertions updated for the new markup and the English caption.

**Browser check** (system Chrome, Vite dev server, corpus `06-drei-kurze-saetze.json`, 1440×900, 390×844 and 360×780): card heights stay 48px before and after Check; matches go green; the legend names the false pick; after Reveal the Reveal button is gone, model answers are green and the error-free sentence shows the compact line; a wrong "Kein Fehler" shows copper with "✗"; the EN and VI captions are as above. No horizontal scroll and no page errors. Screenshots and `feedback-check.json` are in `docs/audits/ux2-design/evidence/corrections-2026-10-13/` (`fb-*.png`).

**Not verified:** real touch devices, Safari and Firefox, screen readers, the hosted Vercel build, and wrapping of long German compounds beyond the 360px sample (the owner accepted readable wrapping earlier).

## Findings: confirmed, disproved or adjusted

| Finding | Verdict | Notes |
| --- | --- | --- |
| Memory forces 8 columns; 16-pair cards about 29 px on phones | **Confirmed** | 360 px cards now about 65×78 px, 4 columns. Desktop 8×4 at 1440 px is kept. |
| Detective: Check reveals missed locations ("Übersehen: …") | **Confirmed** | Counts only before Reveal; locations and corrections after Reveal. |
| Detective: empty "NICHT automatisch bewertet" box for error-free sentences | **Confirmed** | Box renders only with content. The per-suggestion label remains in the key. |
| Logo navigates away from unsaved work | **Confirmed** | Logo, homepage links and browser back/forward are guarded. A confirmed discard does not prompt twice. |
| Sort mobile: "Noch zu sortieren" crushed; categories break mid-word | **Confirmed** | Bank widened; headings wrap naturally. Very long compounds still break inside the word (see open decisions). |
| Sort card text squeezed by permanent buttons | **Confirmed** | Field about 308 px on phones, tools on a line beneath. |
| Sequence focused row shrinks sentence field | **Confirmed** | Field about 280 px on phones (was 136 px); arrow-button fallback kept. |
| Blank new activity reports "duplicate" errors | **Confirmed** | Blank values no longer count as duplicates. Blank fields still block play and export. |
| Sort drag ghost wraps "Lampe" | **Confirmed** (owner) | Root cause: dnd-kit gives the overlay the source width; the ghost's 2 px border left too little room. |
| Detective "Keine Fehler" native checkbox | **Replaced** (owner) | Pill with check icon; native checkbox kept (focus, keyboard, state). |
| Antigravity: Detective v2 "20 sentences / 5 errors" | **Disproved** | The approved limits are 1–10 sentences and 12 errors per sentence (30 per activity). The repository was already correct. |
| Antigravity: Sort placement button removed on mobile | **Adjusted** | Placement is conditionally visible (selection-based), not removed. No change made. |
| Memory face-down cards share one accessible name | **Confirmed** | Numbered: "Verdeckte Karte 3". |
| Memory tie line uses the plural for one point | **Confirmed** | Singular used for a one-point tie. |

## Verification

- `npm run typecheck`: pass after each commit.
- `npm test`: **352 / 352** across 26 files (was 332 at `d8c185c`). New tests cover Detective secrecy and the corrected line, the drag-ghost rule, the Memory layout helper, the navigation guard, blank placeholders and count copy.
- `npm run build`: pass after each commit.
- `git diff --check`: clean.

**Real Chrome against the Vite dev server (system Chrome, not hosted):**
- Sort drag ghost: short word one line at 1440×900 and 390×844; long compound wraps only at the cap; no horizontal scroll.
- Detective two-error sentence at 1440 and 390: picked words red, corrected line copies unpicked words, inputs empty, no page errors.
- Memory 16-pair deck at 1440, 390 and 360: cards 97×150 (desktop), 73×87 and 65×78 (phone); owner band checked on a found card; no horizontal scroll.
- Sort 30 cards, 5 categories, 390 and 360: heading and category names readable; no horizontal scroll.
- Sequence and Sort editors at 390: focused field widened as above.
- Navigation: declining the logo prompt keeps `/games/sort`; confirming navigates home; one prompt per navigation; no page errors.

**Not verified:** real phones and touch hardware (emulated pointer only), Safari and Firefox, screen readers, the hosted Vercel build, Memory online rooms, and any Supabase/SPP path (none touched). The Playwright runs used the Vite dev server only.

## Owner decisions still open

1. **Detective refinement (screenshot ready):** `docs/audits/ux2-design/evidence/corrections-2026-10-13/det-v2b-card-390.png` and `det-v2b-card-1440.png`. Please give a visual opinion before this is considered final. Two choices to confirm:
   - Picking a word keeps focus on the word, so touch devices do not open a keyboard. Alternative: move focus into the new input.
   - The caption "Dein Korrekturvorschlag – wird nicht automatisch bewertet" is always shown while a correction line is visible.
2. **Memory board layout (A1):** the working default is 8×4 on desktop and 4 columns on phones. Alternatives: 4×8 on desktop with an internal scroll, or smaller square cards to reduce phone scrolling. The 16-pair phone board is about 750 px tall and scrolls the page.
3. **Long German compounds (A2 and Memory):** Chrome here does not hyphenate German with `hyphens:auto`. Options: (a) accept a break inside a word that is wider than the card; (b) shrink the font for long words; (c) let authors insert soft hyphens in long words.
4. **Annotation review policy (B2):** implemented with the strict rule in the third pass. Please confirm that a mark which cannot be matched with certainty goes to "Zu prüfen" and is never guessed onto another word.
5. **New blank rows after an earlier play attempt (B3):** still red once an attempt has happened. Proposal: a new blank row is neutral until the teacher leaves it or tries to play again; the problem summary keeps counting it.
6. **Sort category header:** a stray "×" sits alone above the first category on phones. It was there before this pass; the placement is a layout decision.

## Not done in this pass

- **C items not addressed:** Presentation short-height chrome, icon contrast on hover and focus for selected controls, default Memory player identity beyond colour, Memory scoreboard wrapping at 360, and the "remove redundant controls after Check" review.
- **Sequence multiline paste:** already fills an empty current row with the first line. Other empty placeholder rows are left as they are, and validation still reports them.
- **Memory's optional group/category metadata:** not touched; nothing is removed.
- **Student authentication:** not introduced, as the brief requires.

## Notes

- The Antigravity report itself is not in the repository. This pass worked from the pasted checkpoint brief and corrections, and verified each item against the source before changing it.
- The branch was pushed to `origin` after these commits; draft PR #18 was updated by that push. Merge and deploy remain owner decisions.
