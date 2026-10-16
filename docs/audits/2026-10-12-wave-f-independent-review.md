# Wave F — Independent implementation review (LG-A1 Sort, LG-A2 Sequence, LG-A3 Language Detective)

**Date:** 2026-10-12 · **Reviewer:** Claude Sonnet 5.5 (Claude Code), independent of the authoring session
**Reviewed:** draft PR #12, branch `feat/wave-f-local-games-a1-a3-20261012`, head `7bdda96`, based on documentation PR #11 `6e7e27e`
**State after review:** fixes are **local commits only** — not pushed, not merged, not deployed, **not owner-tested**. No Supabase, SPP, SQL, RPC or Memory source change.

## 1. Verdict
The PR compiled and its 11 new unit tests passed, but it had **never been run in a browser**. Running it found real defects, mostly in keyboard/touch use and in the shared import flow; the validators and answer-secrecy rules were sound. All defects found were fixed in separate commits (section 4). Remaining risks (section 6) need human testing; the owner checklist is section 7.

Properties that held up unchanged and are now pinned by tests: unknown/learner-state keys are rejected, `__proto__`/`constructor` pollution is impossible, the 128 KiB cap counts bytes, export→import→export is byte-identical, answer keys and explanations are absent from the DOM until Check/Reveal, **Language Detective never grades typed corrections**, and Memory is untouched.

## 2. Refs and what could not be checked
- `origin/feat/wave-f-local-games-a1-a3-20261012` = `7bdda96…`, five commits above `6e7e27e` (the docs head). `6e7e27e` descends from `main` `f8ac534`.
- `gh` is not installed on this machine, so PR #12 / #11 metadata (draft state, CI) was **not** read from GitHub; refs were verified with Git only.
- Work was done in a separate worktree (`D:\Local Files\Apps_Websites\learning-games-wave-f-review`). The original checkout's uncommitted edit to `docs/audits/2026-10-09-m2-hosted-acceptance.md` was left alone.

## 3. Evidence
| Check | At PR head `7bdda96` | At final head |
| --- | --- | --- |
| `npm ci` | pass | pass (lockfile consistent) |
| `npm run typecheck` | pass | pass |
| `npm test` | 4 files / 31 tests pass (20 Memory + 11 Wave F) | **15 files / 172 tests pass** (the 20 Memory tests unchanged; 141 new Wave F tests plus the 11 original) |
| `npm run build` | pass, JS 336.2 kB | pass, JS 345.9 kB (gzip 109.4 kB) |
| Memory source diff vs `6e7e27e` | empty | empty for `src/games/memory`, `src/shared/classroom`, `src/shared/lib`, `tests/memory.test.ts` (runtime `dependencies` unchanged; four dev-only test packages added, see section 5) |

The final figures were produced from a clean `npm ci` at commit `5fe0b4b`; the later commit is documentation only. Run `npm test` yourself to confirm.

**Browser evidence** — Chrome stable (headless), Playwright `playwright-core` 1.56.1 driven from a scratch folder (not a repo dependency); touch/mobile emulation below 800 px; run against the dev server and again against the production bundle served by `vite preview`:
- **Layout:** 216 play combinations (3 games × 1440/768/390/360 px × DE/EN/VI × Presentation/Independent × idle/checked/revealed) and 108 editor combinations (blank, imported, import-error): **0** horizontal-overflow cases, **0** interactive targets under 44 px (after the back-link fix), **0** console errors other than the pre-existing browser `/favicon.ico` 404.
- **Keyboard/focus:** Sort select→place→clear, Sequence travel top→bottom→top, Detective Space/Tab, add/remove rows — focus asserted after every step in real Chrome.
- **Files:** real browser downloads for all three games plus the no-error passage: file name `<type>_<id>.json`, content equals the imported file, export→reimport→export byte-identical. 14 hostile files through the real picker (oversize, broken JSON, `__proto__`, wrong game, HTML, `javascript:`, control characters, zero-width text, array/null root, unknown key, wrong version, learner-state key, 60 000-deep nesting): each rejected in ≤ 90 ms with a specific message, none executed, the existing draft untouched, same file re-choosable.
- **Unload guard:** a real `beforeunload` prompt appears after an unexported edit and not after merely clicking into a field.
- **Touch:** all 8 Sort cards placed and checked with real taps at 390 px.
- **Accessibility tree:** unique names for the 11 Remove buttons and 8 answer selects in the real accessibility tree; `aria-current` on the active mode; `<html lang>` follows the interface language; authored title keeps the activity's `lang` under a Vietnamese interface.
- **Memory:** 8 pages (`/games/memory`, `/games/memory/join` × 4 widths) compared pixel-for-pixel between `6e7e27e` and the branch: 7 identical; the eighth differed between two runs of the **same** base build (render-timing noise), so no regression. Memory's local game played identically (12 cards, two flips) on both builds at 1440 and 360 px. **Memory online/multiplayer was not exercised** (no backend access, not authorised); only "source unchanged" is claimed for it.

## 4. Findings and fixes
Severity is the reviewer's judgement of impact on a teacher/learner. "Commit" is on this branch.

### Shared (all games)
| # | Sev. | Finding | Commit |
| --- | --- | --- | --- |
| S1 | High | A rejected import showed the file's problems **mixed with the validation errors of the unrelated current draft**, at the bottom of a long form where it was invisible. | `bc0924d` |
| S2 | Med | Markup check was quadratic: one 120 000-character field froze validation ~0.7 s (measured) and the draft is re-validated on every keystroke. | `53e8db3` |
| S3 | Med | Control characters (NUL, ESC), unpaired surrogates and zero-width-only text were accepted; a "blank" card could be invisible. | `53e8db3` |
| S4 | Low | File chooser not cleared after a declined confirm or size error, so re-choosing the same file did nothing. | `bc0924d` |
| S5 | Med | Overwrite confirmation used a stale `dirty` value across the async file read (the race the review packet asked about). | `bc0924d` |
| S6 | Low | Missing required array reported as "invalid count" instead of "missing". | `53e8db3` |
| S7 | Low | Mode buttons had no state; clicking the active one restarted the game. | `bc0924d` |
| S8 | Med | No `lang` handling: a screen reader would read authored German with the English/Vietnamese voice. | `bc0924d` |
| S9 | Low | "← Learning Games" link 18 px tall. | `bc0924d` |
| S10 | Low | Four identical "Spiel öffnen" catalog links. | `70823eb` |
| S11 | Low | Presentation mode barely enlarged (`.lead`/`.small` fixed rem). | `076f58e` |
| S12 | Low | One long Sort card stretched every card in its row; programmatic focus ring showed after mouse clicks. | `b6536a8` |

### LG-A1 Sort (`7f74e4a`)
- **High:** trays sat above the cards, so on a 360 px screen placing card 7 of 8 meant scrolling up and down; the "Selected: …" line changed height and shifted trays under the pointer (Playwright clicks were intercepted in 4 of 4 runs). Keyboard users tabbed through every card to reach a tray; focus was lost after placing and after "Remove placement"; each tray was one big `<button>` containing its cards.
- **Fix:** selecting a card opens its category choices directly under it (next tab stop); trays are labelled regions that can also receive the selected card; static hint + visually hidden live region; focus returns to the card, result, first key and first card after Place/Check/Reveal/Retry; own-property placement lookup; unique editor control names; add/remove focus.

### LG-A2 Sequence (`0ed514d`)
- Focus was lost whenever a Move button became disabled (card reaching either end) and after Check/Reveal/Retry; moves were silent to screen readers; editor hint read "Right position" instead of explaining that the list order IS the answer; "Add card" for rows called "Step".
- **Fix:** focus follows the card; polite position announcements; hint in DE/EN/VI; "Add step"; unique button names.

### LG-A3 Language Detective (`fc92e07`)
- Correctly marked segments were not shown after Check (only misses/false flags as text) although the spec asks for them; suggestions typed for a later-deselected or blanked segment resurfaced in the key; clean passage said "0 of 0 correct"; Check silently disabled; focus lost after Check/Reveal/Retry; `mode` ignored; editor labelled the **required** issue explanation "(optional)".
- **Fix:** per-segment verdict (icon + text + border style, never colour alone), only selected non-blank suggestions shown, wording, hint, focus, Presentation has no typing boxes (Preview mirrors Independent), correct label.

## 5. Design decisions the owner should know about
1. **Sort interaction changed** from "select card, then click a tray at the top" to "select card, then choose its category right under it" (trays still work and remain the projector board). The spec text said "select-and-place"; this keeps that model but fixes phone and keyboard use. Docs updated.
2. **Presentation vs Independent:** Sort and Sequence play identically in both modes apart from the larger projector layout; Language Detective's Presentation mode additionally omits typing boxes. This matches the contract table; if you expect more difference (e.g. hidden Retry in Presentation), say so.
3. **Stricter text rule:** control characters, lone surrogates and invisible-only strings are rejected. Documented in the contract. A teacher's literal `x<y>` or the word `javascript:` is still rejected as markup (existing rule).
4. **Four new devDependencies** (jsdom, `@testing-library/react`, `/dom`, `/user-event`) for component tests; nothing ships to the browser.

## 6. Remaining risks and not verified
- **No real screen reader** (NVDA/JAWS/VoiceOver/TalkBack) was used. Roles, names, live regions and focus order were checked in jsdom and Chrome's accessibility tree only. Live-region wording is untested by ear.
- **Browsers:** only Chrome (desktop engine with touch emulation). **Not tested:** Safari/iOS, Firefox, a real phone or tablet, a real projector.
- **Not tested:** Vercel/hosted behaviour (only local `vite preview`), SPP integration, Realtime, Memory online play.
- A valid activity can exceed 128 KiB when it is near every limit and made of 4-byte characters; Download then reports "file too large" (tested). Realistic teaching text is far below the cap.
- Interface language defaults to German on every page load and is not remembered between games; Home is German-only. M3a (PR #10) localisation is still unmerged, so Wave F strings are isolated in `src/shared/activities/i18n.ts` and **must be reconciled** with M3a later. Tests assert German UI strings and will need updating then.
- Native `window.confirm`/`beforeunload` dialogs are used for unsaved-edit protection (browser wording, not localised by the app).
- Category and card ids are generated; a teacher cannot rename them in the editor (they survive import/export).
- The review's browser scripts live outside the repo (scratch folder) and are not part of `npm test`; only the jsdom suite is.
- No drag-and-drop (by design). Persistence across reload does not exist (by design).

## 7. Manual acceptance checklist (owner)
Setup: `cd "D:\Local Files\Apps_Websites\learning-games-wave-f-review"` → `npm run dev` → open the printed URL. Importable files: `tests/fixtures/wave-f/*.json` (schema-validated, **not** classroom-tested).

**For each of Sort, Sequence, Language Detective**
- [ ] Blank form is clearly "not ready"; "Show problems" jumps to the list; Preview/Present/Practice/Download stay disabled until fixed.
- [ ] Author a small activity by hand (don't import), preview it, download it, reload the page, import it, and see identical content.
- [ ] Import the matching fixture; Preview, **Presentation** and **Independent** each work; Check, Retry and Reveal behave as described in the game spec; nothing about the answer is visible before Check/Reveal.
- [ ] Switch DE → EN → VI mid-game: buttons/messages change; your cards, categories, prompt, explanations stay exactly as authored.
- [ ] Edit something, then try to reload, press "New", import another file and click "← Learning Games": each warns before discarding.
- [ ] Import a wrong-game file and a broken file: a clear "Import failed" message appears near the top and your form is unchanged.

**Sort** — select a card with the keyboard (Enter), Tab to a category, Space; focus returns to the card; "Remove placement" works; Check is disabled until all cards are placed; wrong cards say "Not correct" in text.
**Sequence** — Move Up/Down with the keyboard to the very top and bottom without losing your place; Check marks exact positions; Retry reshuffles and never starts solved.
**Language Detective** — select segments with Space; type corrections and confirm the verdict does **not** change whatever you type; Reveal shows your text beside the model correction labelled "not automatically graded"; the clean-passage fixture needs "No errors"; Presentation has no typing boxes.

**Cross-cutting**
- [ ] 390 px and 360 px (browser device mode, then a real phone if possible): no sideways scrolling; every control is easy to tap; placing the last Sort card needs no scrolling back to the top.
- [ ] Tablet width (768) and a projector or large monitor in Presentation mode: text readable from the back of the room.
- [ ] Keyboard only, whole flow, focus ring always visible.
- [ ] With a screen reader if you can: card selection, placement, moves and results are announced sensibly (not verified by the reviewer).
- [ ] Memory: local game and, if you wish, an online room still work as before (reviewer verified only local play and unchanged source).

**Decision gate:** this is a review of a local branch. Publishing it (`git push origin feat/wave-f-local-games-a1-a3-20261012`), merging PR #12 and any deployment each need your separate approval; a push can start Vercel builds.

## 8. Commits added by this review (oldest first)
`da5a301` test harness · `53e8db3` validation hardening · `bc0924d` Workspace/import/focus helpers · `7f74e4a` Sort · `0ed514d` Sequence · `fc92e07` Language Detective · `076f58e` projector style · `70823eb` catalog links + routing/New tests · `b6536a8` card grid/focus ring · `5fe0b4b` acceptance fixtures · documentation commit (this file and the status docs).
