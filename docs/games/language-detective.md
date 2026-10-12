# LG-A3 — Language Detective
**Implemented locally on branch `feat/wave-f-local-games-a1-a3-20261012` and independently reviewed 2026-10-12 ([report](../audits/2026-10-12-wave-f-independent-review.md)); NOT merged, NOT released, NOT owner-tested.** [Shared Wave F contract](../architecture/LOCAL_FIRST_ACTIVITY_CONTRACT.md).

## Mechanic
Students spot erroneous **teacher-defined text segments**, optionally type suggested corrections, then compare with the answer key and explanations. The game can deterministically score **which segments were flagged**, but does **not** claim to automatically grade whether a free-text correction is linguistically valid. A passage with **zero** issues is permitted: correct response is "no errors". Suitable for grammar, vocabulary, register, style and vocational language.

## Content payload (v1)
```json
{
  "format": "learning-games.activity",
  "schemaVersion": 1,
  "activityType": "language-detective",
  "id": "example-detective-task",
  "title": "Finde den Fehler",
  "targetLanguage": "de",
  "instructions": "Markiere Fehler und begründe sie.",
  "content": {
    "prompt": "Lies den Satz und markiere den fehlerhaften Teil.",
    "segments": [
      {"id": "s1", "text": "Ich"},
      {"id": "s2", "text": "haben"},
      {"id": "s3", "text": "heute"},
      {"id": "s4", "text": "Zeit."}
    ],
    "issues": [
      {"segmentId": "s2", "correction": "habe", "explanation": "Verb agreement with ich."}
    ],
    "summary": "Optional: recap after review."
  }
}
```
*Illustrative and not a saved or classroom-tested exercise.*

## Validation and text rendering
- `prompt` 1–1,000 chars; 4–80 `segments` with unique slug IDs and nonblank text 1–160 chars each. Preserve authored segment order; render literal safe text separated by normal spacing, not HTML.
- `issues` 0–12, with one issue per existing `segmentId`; required `correction` 1–300 chars and `explanation` 1–1,000 chars. If empty, explicitly support a no-error response. Optional `summary` 1–1,000 chars.
- Reject unknown fields, duplicate references, unsupported versions, malformed inputs, too-long file and scripts/executable content under the Wave F contract. Human-authored segmentation determines click/keyboard selection boundaries. This v1 does not promise arbitrary substring selection or sentence formatting preservation.

## Experiences
- Teacher editor: enter/reorder segments, flag issues, supply model corrections and explanations, preview, import/export.
- **Presentation:** teacher projects the text, highlights learner-proposed segments on the shared screen, then explicitly checks/reveals for class discussion.
- **Independent:** learner selects suspected segments with pointer or keyboard, can optionally enter a correction per selected segment; explicitly select "No errors" when appropriate; Check scores only identification. Compare suggestions with the teacher answer key at review, never auto-score text corrections.
- After Check, show which locations were marked correctly and teacher-authored correction/explanation. Retry clears learner selections/typed answers, not source materials. No early answer display.

## Implemented behaviour (after review)
Check is disabled until a segment is selected or "No errors" is chosen (a hint says so). The score uses **only** the set of flagged segment ids; typed text is not an input to scoring (tested: identical verdict for the exact model correction, nonsense and an empty box). After Check every relevant segment carries a verdict as text + icon + border style — "Correctly marked", "Missed", "Incorrectly flagged" — and a clean passage reports just "correct" (no "0 of 0"). Corrections, explanations and the summary appear only after Reveal; the learner's own wording is shown next to the model correction, labelled "not automatically graded", only for segments that are still selected and non-blank. **Presentation mode has no typing boxes** (the teacher flags what the class proposes); Independent and Preview offer them, capped at 300 code points. In the editor an issue's explanation is required (not optional); at most 12 issues can be flagged.

## Acceptance
Zero/one/multiple issue and no-error cases; stable segment selection; optional typed corrections never auto-graded; no answer leak before Check; keyboard/screen-reader, mobile, DE/EN/VI UI, import/export roundtrip and other game regressions. No backend, online student rooms, media or generative grading.
