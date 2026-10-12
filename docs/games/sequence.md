# LG-A2 — Sequence (ordering)
**Implemented locally on branch `feat/wave-f-local-games-a1-a3-20261012` and independently reviewed 2026-10-12 ([report](../audits/2026-10-12-wave-f-independent-review.md)); NOT merged, NOT released, NOT owner-tested.** [Shared Wave F contract](../architecture/LOCAL_FIRST_ACTIVITY_CONTRACT.md). Separate from Sort, even though both arrange cards.

## Mechanic
Teacher defines a prompt and **one intended linear order** of 3–20 cards. Cards may represent German sentence parts, dialogue lines, chronological events or practical workplace steps. The engine shuffles cards for play and checks the current order against the authored order. No NLP or semantic equivalence detection. Teacher must choose a task with a defensible sequence; ambiguous alternative answers cannot be automatically marked wrong without pedagogical review.

## Content payload (v1)
```json
{
  "format": "learning-games.activity",
  "schemaVersion": 1,
  "activityType": "sequence",
  "id": "example-sequence-task",
  "title": "Reihenfolge herstellen",
  "targetLanguage": "de",
  "instructions": "Bringe die Schritte in die richtige Reihenfolge.",
  "content": {
    "prompt": "Ordne die Schritte eines Gesprächs.",
    "items": [
      {"id": "step-1", "text": "Begrüßung"},
      {"id": "step-2", "text": "Anliegen nennen"},
      {"id": "step-3", "text": "Verabschiedung"}
    ],
    "explanation": "Optional: Why the order matters."
  }
}
```
*Illustrative placeholder, not a stored/validated teaching file.*

## Validation and behavior
- 3–20 ordered `items`; their serialized order is the answer key and must be retained on export. Unique slug IDs and nonblank text (1–240 chars); reject duplicate identical visible card text to avoid indistinguishable answers.
- `prompt` 1–1,000 chars; optional `explanation` 1–1,000 chars. Reject unknown keys and enforce common Wave F validation.
- Authoring editor allows adding/removing/reordering correct-order rows, editing instructions/prompt and previewing.
- Local play starts shuffled, avoiding already-solved order when possible, with easy Move Up/Down controls and keyboard support; drag optional.
- **Presentation:** teacher manipulates projected ordering and decides when to reveal/check. **Independent:** learner orders cards, checks exact position/order, sees accessible feedback, retries and reveals teacher explanation.
- No false natural-language grading; if there are several equally valid orders, authoring instructions should make the intended path explicit. Alternative valid sequences are deferred.

## Implemented behaviour (after review)
Move Up/Down buttons carry the card text in their names; keyboard focus follows the moved card (to its other button when one disables at the end of the list); each move is announced politely ("<card>: now position 2 of 4"). Check marks exact positions with text and an icon and freezes the order; Reveal lists the answer key and the explanation; Retry reshuffles and never starts solved. The editor says that the order of the list is the answer. Presentation and Independent play the same; Presentation uses the larger projector layout.

## Acceptance
Pure ordering/shuffle/check/retry engine, no mutation of authored order, import/export round-trip, keyboard/touch, mobile, DE/EN/VI UI, Memory/Sort regression. No online turns, backend or rooms in Wave F.
