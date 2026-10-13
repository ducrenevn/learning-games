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
4. **Annotation preservation (B2):** not implemented. Behaviour needs a decision first. Proposal: keep an annotation when its word is identified unambiguously after an edit; otherwise move it to a visible "needs review" list with a restore action, and never attach it silently to a different word.
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
