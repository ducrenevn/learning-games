# Language Detective — content contract v2 (stacked sentence tasks)

**Status:** designed and documented before any serialization change (UX-2, slice 6). Implemented on branch `feat/ux2-single-canvas-20261012`.
**Scope:** `activityType: "language-detective"` only. Sort, Sequence and Memory keep `schemaVersion: 1` and every fixture result.
**Not changed:** the shared envelope fields, the 128 KiB limit, "unknown keys are rejected", inert-text rules, the multiplayer backend, Supabase/SPP.

## 1. Why a new version

v1 content is `{ prompt, segments[4..80], issues[0..12], summary? }`: one flat word stream with one verdict. A line break cannot be represented, and a CSS-only break would misrepresent the task (no per-sentence "no error", no per-sentence feedback). v1 also rejects genuinely short sentences (`Ich habe Zeit.` is three words). Teachers want several short sentences, each marked and checked on its own.

## 2. Envelope

Unchanged: `format: "learning-games.activity"`, `activityType`, `id`, `title`, `targetLanguage`, `instructions`, `content`.
`schemaVersion` is now validated **per activity type**: `envelope(raw, kind, issues, allowedVersions = [1])`. Detective accepts `1` and `2`; every other type still accepts only `1`, so `sort/07-unsupported-version` and the other version fixtures reject exactly as before. A Detective file with any other version (e.g. `3`) is rejected with the existing `version` code.

## 3. v1 (frozen)

Exactly as before: `content = { prompt, segments, issues, summary? }`. Validation code, issue paths and all five valid / seven invalid Detective corpus fixtures are unchanged.

## 4. v2 shape

```json
{
  "format": "learning-games.activity",
  "schemaVersion": 2,
  "activityType": "language-detective",
  "id": "drei-saetze",
  "title": "Drei Sätze im Hotel",
  "targetLanguage": "de",
  "instructions": "Finde in jedem Satz den Fehler – oder entscheide, dass er richtig ist.",
  "content": {
    "prompt": "Lies jeden Satz einzeln.",
    "tasks": [
      { "id": "task-1",
        "segments": [{ "id": "segment-1", "text": "Der" }, { "id": "segment-2", "text": "Gäste" }, { "id": "segment-3", "text": "kommt." }],
        "issues": [{ "segmentId": "segment-2", "correction": "Gast", "explanation": "Singular nach „der“." }] },
      { "id": "task-2",
        "segments": [{ "id": "segment-1", "text": "Wir" }, { "id": "segment-2", "text": "bleiben" }, { "id": "segment-3", "text": "hier." }],
        "issues": [] }
    ],
    "summary": "Achte auf Kongruenz."
  }
}
```

Rules
* `content` allows exactly `prompt`, `tasks`, `summary?`. A `task` allows exactly `id`, `segments`, `issues`.
* `task.id` is a slug, unique in the activity. `segment.id` is a slug, **unique within its task** (two tasks may both have `segment-1`). `issue.segmentId` must name a segment **of the same task**; a reference into another task is `reference`.
* A task with `issues: []` is valid and means "this sentence has no error" (first-class, as in v1).
* `prompt` and `summary` keep their v1 length limits; segment text ≤ 160, correction ≤ 300, explanation ≤ 1000 characters. Text is inert: no markup, no control characters, no invisible-only text.
* Mixed forms fail safe: `tasks` inside `schemaVersion: 1`, or `segments`/`issues` directly in `content` of v2, are rejected as unknown keys.

## 5. Limits — **approved by the owner** (UX-2 implementation authorization)

The owner approved these values for v2 in the UX-2 authorization. They are constants in one place (`LIMITS` in `src/games/language-detective/model.ts`); changing one is a one-line edit plus fixture updates, and would need a new owner decision.

| Limit | Value (approved) | Why |
| --- | --- | --- |
| Sentences (tasks) per activity | 1–10 | A classroom slide; more means two activities. |
| Words per sentence | 2–40 | Short sentences are allowed in v2. |
| Words per activity | ≤ 200 | Keeps a worst-case file far below 128 KiB. |
| Marked errors per sentence | ≤ 12 (and never more than the sentence has words) | Per-sentence review stays readable. |
| Marked errors per activity | ≤ 30 | Keeps scoring and the review readable. |
| File size | ≤ 128 KiB | unchanged |

**v1 compatibility (no data loss).** A v1 file is never converted or truncated by these limits:

* A v1 file with one passage of 4–80 words and at most 12 marked errors still imports, edits, plays and exports as **v1**, byte for byte (corpus `valid/language-detective/05-eighty-segments-twelve-issues.json`, with the round-trip test in `tests/detective-v2.test.ts`). A single passage of 41–80 words therefore stays one passage in v1; it is not split for the user.
* If a teacher converts such a passage into several sentences, each sentence must meet the v2 limits (2–40 words). The same validation that checks files runs on the editor draft, so an activity that breaks a limit is reported as invalid and is not launched or downloaded until it is fixed. Words are never dropped or re-split silently.
* A v1 file with more than 80 words, or more than 12 marked errors, was already invalid in v1 and stays invalid.

Word units remain whitespace-separated tokens (punctuation stays attached). For Vietnamese this means syllables, a known limitation that v2 does not try to solve.

## 6. Compatibility rules

1. **Import:** a v1 file is read into the internal task model as **one task** (`task-1`); nothing is rewritten on disk. A v2 file is read as is.
2. **Export writes the lowest version that can represent the activity:** v1 when there is exactly one task with 4–80 words and ≤ 12 marked errors, otherwise v2. A v1 file that is not structurally changed therefore re-exports as v1 with the same content and canonical key order. The editor tells the teacher when the file will be v2 ("Erweitertes Format – ältere App-Versionen können diese Datei nicht öffnen").
3. An older app opening a v2 file rejects it with "nicht unterstützte Version" and changes nothing.
4. Other activity types are untouched; opening a Detective file in another game still reports `kind`.
5. The game engines stay independent: `scoreDetective` is unchanged in logic (identification only, typed text never graded) and is called **once per task**. `noErrors` is per task. The activity result aggregates "sentences correct" and "errors found".

## 7. Internal model and where the adapters live

The editor and player always work on the task model (`DetectiveDraft`, `schemaVersion: 2` internally). `src/games/language-detective/draft.ts` holds the three pure adapters: `toDraft(file)`, `fromDraft(draft)` (lowest version) and `validateDraft(draft)` (the draft is valid exactly when the file it would export is valid; v1-shaped issue paths are mapped back to `content.tasks[0]…` so fields can be flagged). `validateDetective(raw)` stays the **file** validator and still returns the validated file object, so `validateImported`, the corpus and serialization tests keep their meaning. The shared workspace gets two optional hooks, `fromFile` and `toFile`, used only by Detective.

## 8. Tests that pin this contract

* All v1 corpus fixtures unchanged; new v2 fixtures (valid: two/three sentences, error-free sentence, short sentence, 10 sentences, Vietnamese; invalid: cross-task reference, 0 and 11 tasks, 1-word sentence, unknown key, mixed v1/v2 keys, version 3, duplicate task id, too many total errors).
* `fromDraft(toDraft(v1))` is the identical v1 file; a single short sentence exports as v2.
* Per-task scoring, per-task "no errors", aggregate result text, DE/EN/VI strings, keyboard path.
