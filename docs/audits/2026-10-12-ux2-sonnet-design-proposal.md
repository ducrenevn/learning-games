# Learning Games UX-2 — Design critique and redesign proposal (Phase 1)

**Date:** 2026-10-12 · **Author:** Claude Sonnet 5.5, independent design review · **Branch:** `docs/lg-ux2-sonnet-visual-audit-20261012` @ `e892b31` (code identical to `71e6e86`)
**Status:** proposal for owner review. **No application code, schema, Supabase/SPP object or hosted target was touched.** Nothing is committed, merged or deployed.
**Companion files:** [mockups.html](ux2-design/mockups.html) (static, hand-written mockups that reuse the app's colours and fonts — *not* the app) and the images in [ux2-design/img/](ux2-design/img/). "Before" images are real screenshots of the running app (Chrome 1440×900 and 390 px).

---

## 0. Summary

Your premise — *the closer the editor looks to the game, the better; it should feel stupidly easy* — is the right organising idea, and it leads somewhere more radical than the brief's proposal. My recommendation in five lines:

1. **The canvas is the game.** Replace the 3–4-step wizard (and the permanent navigator) with **one authoring canvas per game that uses the same visual components as the player**: Sort is edited as the actual category bins with the cards sitting in them; Sequence as the actual numbered rows; Language Detective as the actual sentence cards with tappable words; Memory stays a table (as you suspected). Where a card sits / where a row sits **is** the answer key, so the separate "Lösung" dropdown, the up/down-and-Entfernen strips and the "Lösungsschlüssel" list disappear.
2. **Direct manipulation everywhere it teaches**: drag-and-drop for Sort and Sequence (editor *and* player) as an *enhancement* of the existing select-and-place / move-up-down model, never a replacement. That keeps the engines, scoring, focus rules and the keyboard/touch fallback intact.
3. **One shell, one chrome.** A single 56 px app bar (wordmark › breadcrumb › flag language switcher) plus one 56 px activity bar. First editable row moves from y≈558 (Sort today) to y≈363, there is **no nested scroll area**, and the unused 240 px right rail is gone.
4. **Import = file strip + the same read-only board**, not JSON. **Memory** gets per-player colour *and* shape ownership. **Detective** becomes stacked sentence tasks, which needs a **versioned v2 content contract** — proposed in §8 for your approval, *not* implemented.
5. **I challenge three things in the brief** (§1.3): the horizontal stepper (the canvas is better), keeping "Vorschau" as a third play button (it behaves like "Allein üben"), and a CSS-only look for sorted cards (the bank/bin split needs to be real state).

Decisions I need from you are collected in §11; everything else can proceed on my recommendation.

---

## 1. Diagnosis

### 1.1 What I verified (running app, 1440×900 and 390 px, Memory/Sort/Sequence/Detective, import → editor → play → check → reveal)

All ten observations in the owner audit reproduce. Measured/observed facts that sharpen them:

| Finding | Evidence |
| --- | --- |
| Editor has little working space | At 1440×900 the nested scroll region is **531 px** tall (y 250–781). Page chrome above it: 62 px app header + ~110 px game head (back link, eyebrow, H1, language select) + 76 px activity head; below it a 76 px footer. First Sort card field is at **y≈558**; the Memory editor shows **3 pair rows**; Sequence shows **one partly clipped row** ([before-editor-sequence](ux2-design/img/before-editor-sequence.jpg)). |
| Right rail wastes space | `.activity-ux-navigation` 240 px for 3–4 steps, each also repeating "Bereit" + a check. |
| Sequence row is cramped | `.activity-ux-page .activity-edit-row` forces a 4-column grid on a row that has only an input and tools; the text input is ~300 px wide and truncates ("Guten Tag, hier ist das Hotel am **Ma**"). On 390 px the three tool buttons stack under a truncated input, row height ≈ 160 px. |
| Import shows JSON | The only expanded preview is `JSON.stringify(content)`; its summary label even says "**Lösungen ansehen**" for JSON. The drop zone keeps its full 232 px height after a file is accepted, pushing "Im Editor öffnen" below the fold. |
| Sort duplicates cards | Placed cards appear in the tray **and** stay in the bank with "Kategorie: der". After Reveal every one of the 9 cards gets its own "Richtige Kategorie" panel — the page grows to **~2000 px** ([before-sort-revealed](ux2-design/img/before-sort-revealed.jpg)). |
| Memory ownership | All matched cards share one copper border (`.memory-card.matched .card-front{border-color:#b9664e}`); `LocalCard` has only `matched:boolean`. |
| Language control inconsistent | Home has no switcher; each game page owns a native `<select>` ("Sprache"); `Locale` state lives inside `ActivityWorkspace`. M3a's SVG flag toggle (`LanguageSwitcher appearance="flags"`) exists only on the unmerged M3a branch. |
| "Raum beitreten" underlined | `.activity-ux-option` has no `text-decoration:none`; only `.choice` had it ([before-chooser](ux2-design/img/before-chooser.jpg)). It is an `<a>` (correct) styled as a card (incomplete). |

### 1.2 Additional problems the audit did not list

1. **Duplicate copy.** Detective step 3 renders the same "Markieren Sie die fehlerhaften Wörter…" paragraph **twice** (`Workspace` hint + `DetectiveEditor` hint). Play screens show `instructions` *and* `prompt` as two large grey lines with a ~60 px gap (Sequence, Detective).
2. **Local Memory is not localised.** `MemoryScoreboard` ("AKTUELLER ZUG", "Du bist dran!", "…ist an der Reihe") and `MemoryBoard` (`aria-label` "Verdeckte/Aufgedeckte Karte") hard-code German; in EN/VI the local game is half German. Both components are shared with online play, so the fix must be optional props with German defaults.
3. **Two reset buttons.** After Check, both "Erneut versuchen" and "Neu starten" are visible with near-identical meaning (retry vs. re-run/re-shuffle).
4. **"Vorschau" ≈ "Allein üben".** `PlayMode 'preview'` behaves like `independent` in Detective (`typing = mode !== 'presentation'`) and is indistinguishable in Sort/Sequence; Memory only treats `independent` as single-player. Three play buttons on the review page express two behaviours.
5. **Home grid orphan.** Four games in a 3-column grid leave "Language Detective" alone on row two ([before-home](ux2-design/img/before-home.jpg)).
6. **Mobile stepper labels break mid-word** ("Aufg / abe", "Schri / tte") and the sticky footer overlaps content while scrolling; the stepper needs a horizontal scroll to reach step 3.
7. **Disabled-without-reason buttons.** "Vorschau/Präsentieren" are disabled while any validation issue exists; the user is not told which field blocks them (the explanation only appears after pressing *Weiter*).
8. **Detective editor height** is inconsistent (the workspace is `min-height:540px` so on short content it floats mid-page, see `d-det-edit-3`).

### 1.3 Where I challenge the brief

| Brief proposal | My position | Why |
| --- | --- | --- |
| Compact horizontal 3–4-step strip | **Replace the stepper with one canvas** (a stepper remains available as fallback "Option B", §3.4). | Sort has 4 steps, Sequence 3. Each step holds one small list. Steps add 3–5 clicks, hide the thing you are building, and force the "Lösung" dropdown that exists only because categories and cards live on different pages. |
| Keep Preview, Present, Practice | Two buttons: **Präsentieren** (teacher/projector scale) and **Allein üben**. "Vorschau" becomes the same action as "Ausprobieren" in the activity bar. | Behaviour is identical today (§1.2-4). The internal `PlayMode` union can stay for tests. |
| Sort: "assigned cards move into bins, or muted placeholders" | **Move them for real** (bank vs. bins are separate state views of the same `placements`), no placeholders. | Placeholders keep duplicate focus stops and double the DOM; one derived view is simpler and screen-reader-clean. |
| Language picker with Advanced ISO code | Friendly list of native names + "Other…" (Advanced) | Matches your note; arbitrary valid tags remain supported. |
| (Implicit in a stepper) per-step validation gating | **Status instead of gating**: always-on "spielbereit / noch 2 Angaben" chip; play buttons stay enabled and jump to the first problem. | Gating is what makes the wizard feel heavy; the validators already know everything. |

### 1.4 What to keep (identity)

Warm mineral background, forest-green ink (`#315b4a`), Fraunces for titles, copper (`#b9664e`) as the *attention* accent, gentle 1 px borders, 12–20 px radii, the green-tinted dashed "tray", the three interface languages, safe import with review-before-accept, text-plus-icon-plus-border verdicts (never colour alone), `lang` tagging of authored text, and the existing focus ring (`3px #b9664e`). The mockups use only these tokens.

---

## 2. Design principle: the canvas is the game

| Game | What the learner sees | What the teacher edits (proposal) | Same components? |
| --- | --- | --- | --- |
| **Sort** | Category bins + a bank of unsorted cards | The bins, **with their cards inside** (position = answer); type a category name in the bin header; type a new card in the bin's "+ Karte" slot; drag cards between bins | Yes — `SortBoard` with `mode="author"` |
| **Sequence** | Numbered slim rows (shuffled) | The same rows, in the correct order, text editable in place; Enter adds a step; paste a list | Yes — `SequenceList` with `mode="author"` |
| **Language Detective** | Stacked sentence cards, tappable words | The same cards: a text field on top, the same word chips below; tap a word to mark it, correction/explanation open directly beneath | Yes — `SentenceCard` with `mode="author"` |
| **Memory** | Card grid | **A table** of pairs (A ↔ B, optional group). A grid would hide the pair relationship; a table is the honest "looks like the data" editor | No (by design) |

Rules that make it "stupidly easy": (1) **type where it will appear**, (2) **one tiny hint line** per game that states the rule ("Jede Karte gehört in die Spalte, in der sie liegt — das ist die Lösung"), (3) **Enter / Tab / paste do the obvious thing**, (4) **no mode you must leave to see the result** — "Ausprobieren" is one click, (5) **nothing is required before you can look around**.

Component boundary (AGENTS rule 3): author and play variants live **inside each game folder** (`src/games/<game>/`); only the shell, the status bar, the flag switcher, the drag-and-drop wrapper (used by Sort *and* Sequence — two games, so it qualifies) and the file strip are shared. No universal engine.

---

## 3. Shell: one canvas, one chrome

![before](ux2-design/img/before-editor-sort.jpg)
*Today (Sort, cards step). Two headers, a 240 px rail, nested scroll, a per-card dropdown.*

![after](ux2-design/img/c1-edit-sort.jpg)
*Proposal (Sort). One app bar + one activity bar, the bins are the editor.*

### 3.1 Layout

```
┌────────────────────────────────────────────────────────────────────────────┐ 56 px  app bar (always)
│ ◈ Learning Games  / Sort › Artikel im Alltag      Gemeinsam…   [🇩🇪][🇬🇧][🇻🇳] │
├────────────────────────────────────────────────────────────────────────────┤ 56 px  activity bar (editor only)
│ ● Nicht gespeichert  ⤓ Herunterladen              [Ausprobieren] [Präsentieren ▸] │
├────────────────────────────────────────────────────────────────────────────┤
│  Artikel im Alltag ✎                    ← inline title (Fraunces 34)             │
│  Ordne jede Karte der passenden Kategorie zu. ✎                                 │
│  (Zielsprache: Deutsch ▾)                                                       │
│  ┌ hint: one line stating the rule ────────────────────────────────────────┐   │
│  ┌ the game board, authoring variant (document scroll, no inner scroller) ─┐   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│  ✓ 9 Karten · 3 Kategorien · spielbereit                       tip line         │
└────────────────────────────────────────────────────────────────────────────┘
```

* **Space budget at 1440×900:** chrome 112 px (today ≈ 330 px: 250 px above the scroll box + 76 px footer). Usable board height before scrolling: **≈ 650 px** (900 − 112 − ≈ 140 px title block) versus **≈ 380 px** today (531 px scroll box − ≈ 150 px step heading/hint). Beyond that the normal document scroll continues (today: a 531 px box inside a scrolling page = two scrollbars). The first editable row sits at y≈363 (today y≈558 in Sort); on a 1280×640 laptop with dock it is still on screen.
* **Title and instruction are the page heading**, editable in place (pencil affordance, large type = the same type as the player's `h2`/lead). They replace the "Aufgabe" step. No separate "NEUE AKTIVITÄT" label; imported activities simply show their title.
* **Target language** is a chip with a popover: native names (Deutsch, English, Tiếng Việt, Français, Español, Italiano, Türkçe, …) and **"Andere…"** which reveals the BCP-47 field and the internal ID under *Erweiterte Einstellungen*. Stored value unchanged (`targetLanguage`, `id`); `lang=` attributes unchanged.
* **Mobile (≤ 560 px):** same stack; activity bar shrinks to status + "Ausprobieren" (Präsentieren/Herunterladen move into a `⋯` menu — Präsentieren is a classroom action and rarely used on a phone); page scrolls naturally; no sticky footer, so nothing overlaps content. ([m3-sequence-edit](ux2-design/img/m3-sequence-edit.jpg))

### 3.2 Status and save honesty

The footer's "Nur in diesem Browser" is replaced by a status chip that reflects what is *actually* true (authoring is in memory until downloaded):

| State | Chip | Tone |
| --- | --- | --- |
| Edited since last download or import | `● Nicht gespeichert` (+ `⤓ Herunterladen`) | copper dot |
| Just downloaded | `✓ Heruntergeladen 14:32` | green |
| Imported, unedited | `Aus Datei geladen · unverändert` | neutral |

Leaving with unsaved work keeps today's `beforeunload` + confirm behaviour.

### 3.3 Validity without gating

* A status line under the board says **"✓ 9 Karten · 3 Kategorien · spielbereit"** or **"Noch 2 Angaben fehlen ▸"** (button: scrolls to and focuses the first problem).
* A field shows a subtle copper underline only **after blur or after a play attempt**; the text names the problem in teacher words (`friendlyIssue` already exists and is reused).
* *Ausprobieren/Präsentieren* stay **enabled**. With problems they do not start; they focus the first problem and announce it. (Alternative if you prefer to keep today's behaviour: keep them `disabled` but add `aria-describedby` with the reason. §9 lists this as a trusted-test difference.)
* Min/max counts (Sort 2–5 categories, 4–30 cards; Sequence 3–20; Memory ≤ 16 pairs; Detective per §8) are shown as quiet counters, and the "+" slots disable at the maximum with a one-word reason.
* The empty new activity shows **placeholder content, not required rows** ("z. B. der", "Nächsten Schritt tippen"). `makeBlank*` can start with fewer empties; validators are unchanged — an unplayable draft is allowed.

### 3.4 Fallback "Option B" (if you want guidance over speed)

Keep the canvas, but add a **one-line horizontal step strip** (`Aufgabe · Kategorien · Karten · Prüfen`) that merely *scrolls to sections* of the same page (anchors, not separate screens). This keeps the guided feel without hiding the board. I do not recommend a full stepper.

### 3.5 Play shell

* Title + instruction **once** (instruction shown, `prompt` merged under it only when it differs), progress/result on the right (`4 von 9 sortiert`, `6 von 9 richtig`). "Zum Editor" moves to the app-bar breadcrumb (`‹ Sort › Artikel im Alltag › Präsentieren`).
* One reset: **"Nochmal"** after Check; "Neu starten" (re-shuffle) moves to a `⋯` menu.
* **Presentation scale** keeps today's `.activity-projected` idea (type ≥ 1.35×, 56–64 px targets) and is verified at 1280×720 and 1920×1080; **Allein üben** uses normal density.

---

## 4. Global: language switcher and entry cards (P0)

![home](ux2-design/img/a1-home.jpg)
![chooser](ux2-design/img/a2-chooser.jpg)

* **One global interface language**, three accessible flag buttons (`role="group"`, `aria-pressed`, `aria-label="Deutsch|English|Tiếng Việt"`, inline SVG so it renders on Windows) in the **app bar** on every page including Home. The M3a design is reused visually 1:1 (45×36 buttons, 36×34 ≤ 480 px, focus ring unchanged).
* **Reconciliation with M3a PR #10 — do not merge it.** The Wave F `Locale` type (`'de'|'en'|'vi'`) is already identical to M3a's `Language`. Plan: (1) add `src/shared/locale/` with a tiny `LocaleProvider` (`locale`, `setLocale`; sets `document.documentElement.lang`) and a **re-implemented** `LanguageFlags` component copied from the M3a visual spec; (2) `ActivityWorkspace` reads the locale from context instead of `useState('de')` and loses its `<select>`; (3) Home/registry strings get a three-language catalogue; (4) when PR #10 is authorised and merged, its `LanguageProvider` replaces step 1's provider behind the same `useLocale()` hook — one file conflict, no behaviour change. Room-language *policy* (`roomLanguagePolicy.ts`) is untouched and out of scope. No persistence (as requested).
* **Card style.** One shared `.card-link` (typography, border, hover, focus ring, `text-decoration:none` on the element and its descendants). Applied to Home tiles, the chooser's two buttons and **"Raum beitreten" (stays a `<Link>`/`<a>`)**. Home becomes a **2×2 grid** ≥ 720 px (no orphan), and each tile shows its modes as quiet chips (`Präsentieren · Allein üben · Online-Raum`), which tells a teacher what the game can do before opening it. Whole tile is the link (the redundant "Spiel öffnen" button becomes an arrow affordance; accessible name stays "Spiel öffnen: …").
* **Teacher-facing terms** (DE): *Aktivität erstellen / importieren*, *Ausprobieren*, *Präsentieren*, *Allein üben*, *Herunterladen*, *Spielbereit*. Same words on Home and in all four games, in EN/VI via the existing `uxCopy`.

---

## 5. Import (P0)

![before](ux2-design/img/before-import.jpg)
![idle](ux2-design/img/b1-import-idle.jpg)
![loaded](ux2-design/img/b2-import-loaded.jpg)

1. **Idle:** a single compact drop strip (one label, ~72 px), whole strip clickable and keyboard-operable (visible native file input behind it, as today's `sr-only` input + button).
2. **Loaded:** the drop zone **collapses to a file strip**: file name · counts · `✓ Datei gültig` · `Andere Datei` · **`Im Editor öffnen →`** on the same line. The call to action is never below the fold.
3. **Preview = the game's read-only board** (the same components as §6 with `mode="readonly"`): Sort — bins with their cards; Sequence — numbered rows in solution order (+ explanation); Detective — sentence cards with marked words and corrections; Memory — the first 6 pairs as `A ↔ B` with "+ 10 weitere". Bounded height; no inner scroll (show N + "weitere").
4. **JSON** only under *Technische Details* (renamed from "Lösungen ansehen").
5. **Safety unchanged:** validate before accept; invalid files never replace the current draft ("Ihre bisherige Aktivität wurde nicht verändert"); unsaved-draft confirm; same 128 KiB/extension checks; teacher text rendered as inert text.

*Slice note:* before the canvas exists, UX-2a can ship the read-only previews as small per-game summary renderers; they are reused as the read-only mode later.

---

## 6. Per-game design

### 6.1 Sort

**Editor** ([c1-edit-sort](ux2-design/img/c1-edit-sort.jpg)): bins are columns; the bin header is an input (placeholder "Kategorie"); each card is an inline-editable chip with a grip; the last slot "+ Karte tippen, Enter" adds a card to *that* bin; `💬` opens a one-line explanation under the chip; `×` on the bin header deletes the category (cards inside move to the neighbouring bin after a confirm if any); a ghost column "+ Kategorie" (2–5). Moving a card between bins = drag, or the same select-and-place model as the player (so keyboard works). Duplicate card text: inline "Gibt es schon" (validator rule is unchanged).

**Player — states** ([d1-sort-play](ux2-design/img/d1-sort-play.jpg), [d2-sort-checked](ux2-design/img/d2-sort-checked.jpg), [m2-sort-play](ux2-design/img/m2-sort-play.jpg)):

| State | Presentation |
| --- | --- |
| Unsorted | **Bank** "Noch zu sortieren · 5": chips; placed cards are **not** in the bank |
| Placed | chip sits **inside its bin**; bin shows a count badge; chip is still a button (pick up → move/return) |
| Selected (tap/keyboard) | chip lifts (border 3 px + shadow, *no layout shift*); bins become **armed**: solid green border + a visible "Hier ablegen" target label; the bank also becomes a target ("zurück in den Stapel") |
| Dragging | ghost chip follows the pointer; hovered bin gets the armed+highlight style; source chip shows a dashed placeholder |
| Progress | `4 von 9 sortiert` + a text-labelled bar in the header (also `aria-live=polite`) |
| Checked | summary "6 von 9 richtig"; each chip `✓`/`✗` + border style (solid green / dashed copper) — text + icon + pattern, never colour alone; placements frozen |
| Revealed | wrong chips get `→ die`; **one** "Erklärungen" panel lists only wrong/explained cards (replaces nine answer panels; the whole revealed state fits one 900 px viewport in the mockup versus a ≈ 2000 px page today) |

* The bulky inline `.sort-place` group is gone. Single-card placement = tap chip, tap bin (desktop) or use the **bottom sheet** on phones: `„Lampe" ablegen in … [der][die][das]` with 44 px buttons in the thumb zone.
* Keyboard: Tab to a chip → Enter/Space selects (unchanged `aria-pressed`) → Tab to the bin targets (named "Ablegen in: die") → Enter places; **digits 1–5 place into category n** when a card is selected (announced in the hint; helpful on a projector); Esc deselects; placed chips are buttons (Enter picks up again).
* Engine untouched: DnD and sheet call the existing `placeSort(...)`; `scoreSort` and `shuffledIds` unchanged; Check still disabled until complete, with the reason shown ("Noch 5 Karten").

### 6.2 Sequence

**Editor** ([c2-edit-sequence](ux2-design/img/c2-edit-sequence.jpg), [m3](ux2-design/img/m3-sequence-edit.jpg)): each step is one slim row — `grip · ① · full-width text · ↑ ↓ ×`. Text wraps on phones (auto-growing textarea), never truncates. **Enter** inserts a new row below and focuses it; **Backspace on an empty row** removes it (disabled at the minimum, with a message); **paste multi-line text → one step per line**; ghost row "Nächsten Schritt tippen". Row tools are always in the tab order; on desktop they are at 35 % opacity until hover/focus-within (not hidden); on touch the **active row** expands a bar `↑ Nach oben · ↓ Nach unten · × Entfernen` (44 px targets) and inactive rows give the full width to the sentence. Remove is deliberate (a click on a labelled control, no swipe) and respects the minimum of 3.

**Player** ([d3](ux2-design/img/d3-sequence-play.jpg), [d4](ux2-design/img/d4-sequence-checked.jpg)): slim single-row cards, 56 px (Allein üben) / 64 px (Präsentieren), `grip · number · sentence · status`; drag by the grip (44×44 hit area) with an insertion bar; ↑/↓ buttons remain for keyboard (and appear on the focused/active row). After Check each row shows `✓ richtig` / `✗ falsch` (text + border); after Reveal desktop shows **"Deine Reihenfolge" and "Richtige Reihenfolge" side by side** (stacked on phones) with the explanation under the key — this replaces the duplicated "Lösungsschlüssel" list below. Shuffle, "never starts solved", deterministic key, scoring and focus announcements are unchanged (`startSequence`, `moveSequence`, `scoreSequence`).

### 6.3 Language Detective (editor and play; contract in §8)

**Editor** ([c3](ux2-design/img/c3-edit-detective.jpg), [m4](ux2-design/img/m4-detective-edit.jpg)): the activity is a list of **sentence cards** ("Satz 1 · 2 Fehler markiert"). Each card: a text field with the sentence; below it the same word chips as the player; **tap a word to mark it** → a `Gäste → [Gast] [Erklärung]` row opens directly under the chips; no marks = "Kein Fehler" badge (error-free sentences are first-class). Add sentence · reorder (↑↓/drag) · remove. **"Text einfügen und in Sätze teilen"**: paste a paragraph, the app proposes sentence cards (`Intl.Segmenter` with a regex fallback; teacher can merge/split before accepting — abbreviations like "z. B." need that). One "So geht's" strip replaces the two duplicated hints. Word units remain whitespace tokens as in v1 (punctuation stays attached; note for Vietnamese: tokens are syllables — a known limit I do not try to solve here).

**Player** ([d5](ux2-design/img/d5-detective-play.jpg)): **stacked sentence cards**, each with its own chips and its own "Kein Fehler" checkbox; typed suggestions (Allein üben only) open under the marked word as today. *Prüfen* is enabled when every sentence is answered (≥ 1 mark or "Kein Fehler") — the existing `canCheck` rule applied per sentence — with a progress hint ("Noch 2 Sätze offen"). After Check: a badge per card (`✓ Richtig` / `✗ Nicht ganz`), the existing `✓ gefunden / ✗ fälschlich markiert / ! übersehen` word states, and a header summary (**"2 von 3 Sätzen richtig · 3 von 4 Fehlern gefunden"**). Reveal puts correction + explanation **inside each card** (focus moves to the first revealed). No free-text auto-grading; the program only compares which words were flagged.

### 6.4 Memory

**Editor** ([c4](ux2-design/img/c4-edit-memory.jpg)): compact 52 px rows `① [Karte A] ↔ [Karte B] (+ Gruppe) ×`; ~10 pairs visible at 1440×900 (today 3). Tab moves A → B → next row; Enter in B adds a row; **pasting two columns from Excel/Word/text** fills rows (`parsePairs` already handles `|`; the paste handler would add tab-separated input, which is what Excel/Word produce); the "optional category" field becomes a quiet `+ Gruppe` chip. Online-room creation stays a clearly separate, explicit action in the activity bar (`Online-Raum …`) — unchanged RPC and unchanged "only on explicit click" rule.

**Ownership in local play** ([d6](ux2-design/img/d6-memory-owners.jpg)): each player gets a **colour + shape + initial**:

| # | Colour | Shape | Contrast on `#fff4ea` | 
| --- | --- | --- | --- |
| 1 | teal `#1F6F8B` | ● | 5.23 : 1 |
| 2 | copper `#B35A3F` | ▲ | 4.35 : 1 |
| 3 | plum `#7B4B94` | ■ | 5.92 : 1 |
| 4 | gold `#8F6A00` | ◆ | 4.58 : 1 |
| 5 | rose `#B03A64` | ★ | 5.33 : 1 |
| 6 | slate `#4F5D6B` | ⬢ | 6.23 : 1 |

Computed with the WCAG formula (≥ 3 : 1 is required for non-text UI; all pass ≥ 4.3). A rough deuteranopia simulation shows teal/plum and rose/slate nearly collapse (RGB distance 6 and 12) — which is exactly why **the shape + initial badge is mandatory and colour is only the reinforcement**; final hues are to be re-checked with a proper CVD simulator in implementation. Matched cards get a 4 px border in the owner's colour plus a corner badge (`▲ B`); the scoreboard row repeats swatch+shape+initial; the active-turn row keeps its filled style and shows the swatch with a white ring. The matched card's accessible name gains "— gefunden von Ben". The setup screen replaces the comma field with player chips that already show their colour/shape (comma entry remains as fallback), 1–6 players. `prefers-reduced-motion` and forced-colors are respected (border/shape survive `forced-colors`).

*Implementation shape (no shared-contract change):* owner map `Record<pairId, playerIndex>` in `LocalMemory` state only; `MemoryBoard` gains an **optional** `ownerOf?(card)` prop and `MemoryScoreboard` an optional `marker`/`labels` prop. Defaults render exactly today's markup, so **online mode, Supabase RPCs, room payloads and `PublicCard` are untouched**. The same optional `labels` prop fixes the hard-coded German (§1.2-2).

---

## 7. Interaction, accessibility and the drag-and-drop decision

### 7.1 Principle
**DnD is an enhancement over a complete non-drag path.** Every drag has an equivalent: select-and-place (Sort), ↑/↓ and digits (Sort/Sequence), "Nach oben/unten" bar (touch). Nothing in the contract requires dragging ("no drag requirement" in the Wave F contract stays true).

### 7.2 Library vs. hand-rolled

| Option | Size | Touch | Keyboard / SR | Notes |
| --- | --- | --- | --- | --- |
| Native HTML5 DnD | 0 | Poor/inconsistent (long-press on mobile, no autoscroll, no custom ghost) | None | Rejected (as the brief says). |
| Hand-rolled Pointer Events | 0 | Good if done well | Must build announcements | ~300 lines + edge cases (autoscroll, cancel, ghost, focus restore, nested scrollers). Highest long-term cost. |
| **`@dnd-kit/core` 6.3.1 + `@dnd-kit/sortable` 10.0.0 + `@dnd-kit/utilities`** (MIT) | **measured 16.6 kB gzip** (48 kB min) for the exact subset I need (tree-shaken test bundle) | Pointer + Touch sensors with `delay`/`distance` activation constraints (long-press, scroll-safe) | Keyboard sensor + `@dnd-kit/accessibility` live-region announcements built in | Peer deps `react >=16.8` (React 19 listed as compatible by range; **not yet exercised in this repo**). Last release Dec 2024; the successor `@dnd-kit/react` is 0.5.0 (pre-1.0), so I would pin 6.x and treat it as stable-but-quiet. |

**Recommendation:** adopt `@dnd-kit` **after a throw-away spike** that must prove: React 19 + StrictMode, mouse/touch/keyboard on Windows Chrome, Android Chrome and iOS Safari (real device if you can supply one — I cannot claim this from here), page scroll still works on touch, drag cancel with Esc, `prefers-reduced-motion`, and the DOM still passes the existing "no answer in DOM before Check" tests. If the spike fails, fall back to the hand-rolled pointer path for Sort only (Sequence keeps ↑/↓). Sensor config: mouse `distance: 8`, touch `delay: 200ms, tolerance: 8px`, keyboard sensor on the grip only, handle-only dragging in Sequence (so text stays selectable and the list scrolls).

### 7.3 Accessibility checklist for implementation
* 44×44 px targets (grip hit area larger than its 14 px glyph); no hover-only controls (reduced opacity, still focusable).
* Announcements reuse the existing live-region strings (`announcePlaced`, `announceMoved`) + progress text; DnD announcements are localised DE/EN/VI.
* Focus: after place/move, focus returns to the moved element (existing `useMoveFocus`/`cardButtons` logic is kept and extended); after Check focus → result; after Reveal → first key entry; after Retry → first control. **These are the behaviours the current tests protect and must stay.**
* No answer leak: bins/chips carry no `data-` or class that names the correct category before Check; the author board uses a different component mode so correct positions never reach the player DOM.
* Reduced motion: no lift/rotate transforms or drop animation; outline + opacity only. Forced-colors: shapes/borders carry state.
* Zoom/text: verified at 200 % and with 1.5× text-only zoom (bins wrap to one column, chips wrap).
* **Not verified and not claimed:** real screen readers (NVDA/VoiceOver/TalkBack), Safari/Firefox, real phone/projector. These remain acceptance items.

---

## 8. Language Detective — versioned data-contract proposal (P2, approval needed before any code)

### 8.1 Why the current contract cannot do it
v1: `content = { prompt, segments[4..80], issues[0..12] (segmentId→segment), summary? }`. One flat word stream, one prompt, issues scored together. A line break is not representable and a CSS-only break would misrepresent the task structure (per-task zero-error state, per-task feedback). Also, v1 requires ≥ 4 words, which rejects genuinely short sentences ("Ich habe Zeit.").

### 8.2 Options

| | A. **v2 with `tasks[]`** (same `activityType`) | B. Add optional field to v1 | C. New `activityType` (e.g. `sentence-detective`) | D. Several v1 files as a set |
| --- | --- | --- | --- | --- |
| v1 files still import | ✔ (adapter → one task) | ✔ | ✔ | ✔ |
| Honest per-task structure | ✔ | ✔ but two competing structures in one object | ✔ | ✔ |
| Obeys "unknown keys rejected in v1" / versioned contract | ✔ | ✘ (v1 meaning changes silently) | ✔ | ✔ |
| Old app opens new file | Clean "unsupported version" | Rejected for unknown key | "wrong activity type" | n/a |
| Single file to hand out | ✔ | ✔ | ✔ | ✘ |
| Cost | envelope accepts per-type versions | small | new type in union/registry/importer | UI for sets |
| **Verdict** | **Recommended** | Reject | Fallback if you want *zero* change to the shared envelope | Reject |

### 8.3 Proposed v2 shape (illustrative, not final)
```json
{
  "format": "learning-games.activity",
  "schemaVersion": 2,
  "activityType": "language-detective",
  "id": "zwei-fehler-im-service",
  "title": "Zwei Fehler im Service",
  "targetLanguage": "de",
  "instructions": "…",
  "content": {
    "prompt": "Finde in jedem Satz den Fehler.",
    "tasks": [
      { "id": "task-1",
        "segments": [ { "id": "segment-1", "text": "Der" }, … ],
        "issues":   [ { "segmentId": "segment-2", "correction": "Gast", "explanation": "…" } ] },
      { "id": "task-2", "segments": [ … ], "issues": [] }
    ],
    "summary": "…"
  }
}
```
* **Scoping:** `segment.id` unique **within a task**; `issue.segmentId` must resolve inside the **same task**; `task.id` unique slug. A task with `issues: []` is valid ("no error").
* **Proposed limits (defaults for you to confirm):** tasks 1–10; segments per task 2–40; total segments ≤ 200; issues per task ≤ 12 and ≤ segments; total issues ≤ 30; prompt/summary/text lengths as v1; whole file ≤ 128 KiB (existing). Reject unknown keys at every level, exactly as v1.
* **Compatibility rules:**
  1. All v1 fixtures (5 valid / 7 invalid Detective fixtures of the 48-file corpus) keep their expected result **unchanged**.
  2. A v1 file is read through `fromV1()` into the internal task model as **one task** (`task-1`). Nothing is rewritten on import.
  3. **Export writes the lowest version that can represent the activity**: v1 if it is a single task with 4–80 segments and ≤ 12 issues, otherwise v2. A v1 import that is not structurally changed therefore re-exports **byte-equivalent v1**. When export will be v2 the UI says so ("Erweitertes Format — ältere App-Versionen können diese Datei nicht öffnen").
  4. Mixed forms fail safe: `tasks` inside `schemaVersion: 1`, or `segments` inside v2, are rejected as unknown keys.
* **Code consequence (the one shared-contract touch):** `ActivityBase.schemaVersion: 1` and `envelope()` hard-code version 1 for every game. Detective v2 needs `envelope(raw, kind, issues, allowedVersions)` (default `[1]`) and a widened `schemaVersion` type for Detective only. Sort/Sequence/Memory behaviour and fixtures do not change (`sort/07-unsupported-version` must still reject).
* **Engine:** `scoreDetective` is already pure over `{segments, issues}`; the player calls it **per task** (no change to its logic) and aggregates "sentences correct" and "errors found". `noErrors` is per task.
* **Presentation mode option (decision O-5):** teacher-paced *per-sentence* Prüfen/Lösung in addition to the global buttons. I recommend **global only first**; per-sentence pacing is additive later.
* **Tests to add:** v2 valid/invalid fixtures (cross-task reference, 0/11 tasks, 1-word task, unknown keys, version mismatch), adapter round-trip (`v1 → tasks → v1` identical bytes), lowest-version export, per-task scoring, per-task "no errors", DE/EN/VI strings, keyboard path.

---

## 9. Compatibility with trusted tests and engines

| Area | Impact |
| --- | --- |
| Engines & validators (`sort/sequence/memory` engines, `contract`, 48 corpus fixtures, Memory online RPC tests) | **Unchanged.** Only Detective gains a v2 validator + adapter; v1 expectations frozen. |
| Player behaviour tests (no answer before Check, focus after Check/Reveal/Retry, announcements, "never starts solved", deterministic scoring, `constructor` id safety, markup rendered literally, `lang` tagging) | **Preserved by design**; selectors that name the old inline `.sort-place` group, the fixed-height hint, or per-card key panels are **deliberately replaced** with equivalent assertions on the new structure. |
| Editor/shell DOM tests (`workspace`, `ux-guided`, `*-editor`, parts of `app`, `pages`, `memoryWorkspace`) | **Rewrite required** — about 60 of the 238 tests by per-file test count (estimate from file names/counts, not a run). They assert the step navigator, *Weiter/Zurück*, disabled play buttons, and `Sprache` select. This is the main cost of the canvas decision; Option B (§3.4) lowers it slightly, a full stepper keeps it near zero. |
| Disabled-until-valid play buttons | Differs (§3.3) unless you choose the `aria-describedby` variant. |
| `Vorschau` button | Merged into "Ausprobieren"; `PlayMode 'preview'` can stay internally. |
| `makeBlank*` shapes | May change (fewer empty rows); tests that count blank rows need updating. |
| Memory online mode | Unaffected (optional props only). |
| Language | Tests that drive the `Sprache` select switch to the flag buttons. |

Nothing here contradicts AGENTS rules 3–8: no Supabase/SPP change, no schema DDL, no hosted write, engines stay independent, Canva reference untouched.

---

## 10. Priorities and proposed slicing

| Slice | Content | Size | Risk | Visible win |
| --- | --- | --- | --- | --- |
| **UX-2a (P0, shared polish)** | global locale + flag switcher; `.card-link` + Home 2×2 + Raum beitreten; truthful labels/status chip; duplicate-copy removal; import file strip + read-only previews (JSON → technical); Memory local `labels` fix; single reset button | M | low | Home/chooser/import feel finished |
| **UX-2b-0 (P1, quick independent win)** | Memory per-player ownership (local only) | S | low | classroom-visible |
| **UX-2b-1 (P1, pilot)** | New canvas shell + **Sequence** author canvas and player rows (↑↓/Enter/paste, no DnD yet) | M | medium (rewrites shell tests) | proves the concept on the simplest game |
| **UX-2b-2** | Sort author canvas + bank/bin player (select-and-place, bottom sheet) | M–L | medium | the owner's #1 and #4 |
| **UX-2b-3** | dnd-kit spike → DnD for Sort and Sequence (editor+player) | M | medium (device behaviour) | direct manipulation |
| **UX-2b-4** | Memory table editor + paste | S | low | — |
| **UX-2c (P2)** | Detective v2 contract + adapters + tests → then stacked editor/player | L | highest (shared envelope, data) | owner's #8 |

Ordering rationale: 2a and ownership are independent and low-risk; Sequence is the smallest game to prove the canvas; contract work comes last and only after you approve §8. Each slice = small commits on an isolated branch, full typecheck/Vitest/build, and a before/after screenshot pass at 1440 / 1024 / 768 / 390 / 360 + a 1280×640 short viewport + portrait tablet + 200 % zoom + reduced-motion + forced-colors.

---

## 11. Decisions needed from you

| # | Question | My recommendation |
| --- | --- | --- |
| O-1 | One canvas (§3) vs. canvas + step strip (§3.4) vs. keep a stepper | **Canvas** |
| O-2 | Play buttons: *Ausprobieren + Präsentieren + Allein üben* → **two** (merge Vorschau into Ausprobieren) | Two |
| O-3 | Play buttons with problems: enabled-and-jump vs. disabled-with-reason | Enabled-and-jump |
| O-4 | Adopt `@dnd-kit` after spike (16.6 kB gz) vs. hand-rolled | dnd-kit, spike first |
| O-5 | Detective v2 (`tasks[]`, schemaVersion 2) **vs.** new activityType; limits in §8.3; per-sentence teacher pacing later | v2, limits as proposed, global check first |
| O-6 | Export "lowest sufficient version" rule (§8.3-3) | Yes |
| O-7 | Memory colours/shapes in §6.4 (final hues re-checked with a CVD tool) | Yes |
| O-8 | Slice order in §10 | As listed |

---

## 12. What I did and did not verify

**Done:** read `AGENTS.md`, `START_HERE`, `CURRENT_STATE`, the Wave F contract, the brief, all four games' editor/player/model/engine sources, shared workspace/contract/focus/portable code, `styles.css`, the M3a flag/i18n source (read from its branch, not merged); ran the app (Vite on `localhost:5199`, system Chrome via Playwright in the scratchpad) and captured the flows at 1440×900 and 390×844; measured the `@dnd-kit` subset bundle with esbuild in a scratch folder (nothing added to the repo); computed colour contrast and a rough deuteranopia distance; rendered the mockups.

**Not done / not claimed:** no application code or tests were changed and **no tests were run** (the 238-test green state is the owner/Antigravity report); the ~60-test impact figure is an estimate; the `@dnd-kit` + React 19 + touch behaviour is unproven until the spike; no screen reader, Safari, Firefox, real phone or projector testing; the mockups are static HTML, not interactive prototypes; the CVD simulation is crude; Vercel/Realtime/SPP were not touched.

---

## Appendix — mockup gallery (all frames; see [mockups.html](ux2-design/mockups.html))

Desktop 1440 px: ![A1 home](ux2-design/img/a1-home.jpg) ![A2 chooser](ux2-design/img/a2-chooser.jpg) ![B1 import idle](ux2-design/img/b1-import-idle.jpg) ![B2 import loaded](ux2-design/img/b2-import-loaded.jpg)
![C2 Sequence editor](ux2-design/img/c2-edit-sequence.jpg) ![C3 Detective editor](ux2-design/img/c3-edit-detective.jpg) ![C4 Memory editor](ux2-design/img/c4-edit-memory.jpg)
![D1 Sort play](ux2-design/img/d1-sort-play.jpg) ![D2 Sort checked](ux2-design/img/d2-sort-checked.jpg) ![D3 Sequence play](ux2-design/img/d3-sequence-play.jpg) ![D4 Sequence checked](ux2-design/img/d4-sequence-checked.jpg) ![D5 Detective play](ux2-design/img/d5-detective-play.jpg) ![D6 Memory owners](ux2-design/img/d6-memory-owners.jpg)

Mobile 390 px: ![M1 home](ux2-design/img/m1-home.jpg) ![M2 Sort play](ux2-design/img/m2-sort-play.jpg) ![M3 Sequence editor](ux2-design/img/m3-sequence-edit.jpg) ![M4 Detective editor](ux2-design/img/m4-detective-edit.jpg)

Before (real app): ![Memory import](ux2-design/img/before-import.jpg) ![Memory editor](ux2-design/img/before-editor-memory.jpg) ![Sequence editor](ux2-design/img/before-editor-sequence.jpg) ![Detective editor](ux2-design/img/before-editor-detective.jpg) ![Sort play](ux2-design/img/before-sort-play.jpg) ![Sequence checked](ux2-design/img/before-sequence-checked.jpg) ![Detective checked](ux2-design/img/before-detective-checked.jpg) ![Memory play](ux2-design/img/before-memory-play.jpg) ![Mobile Sort](ux2-design/img/before-mobile-sort-play.jpg) ![Mobile Sequence editor](ux2-design/img/before-mobile-sequence-editor.jpg)
