# Learning Games — activity import / rejection corpus v1

**Status:** source-validated fixture candidates; **not classroom-tested**, not bundled application presets. The 24 JSON files under `valid/` are intended to be imported into the four local-first games in this review branch. The 38 JSON files under `invalid/` are deliberately rejected by those validators. Never use the invalid files as lessons.

- `manifest.json` is the machine-readable file list, game type and expected acceptance/rejection reason. Keep it updated when adding a fixture.
- `valid/sort/` contains 2–5-category tasks, German article, gastronomy, German case expressions, Vietnamese greetings, and a 30-card capacity test.
- `valid/sequence/` contains appointment conversation, cooking procedure, English support-email, Vietnamese hotel check-in, and a 20-step capacity test.
- `valid/language-detective/` contains one-issue, two-issue, explicit no-error, Vietnamese no-error and 80-segment/12-issue stress cases. Model corrections are teacher-reviewed, **not** automatically graded.
- `valid/language-detective/06…09` are **schemaVersion 2** (stacked sentence tasks, see `docs/architecture/DETECTIVE_V2_CONTRACT.md`): three short sentences with one error-free sentence, a three-word sentence, ten sentences, Vietnamese. `invalid/language-detective/08…17` cover the v2 rules: cross-task reference, 0 and 11 sentences, one-word sentence, unknown task key, v1 keys mixed into v2 and v2 keys into v1, unsupported version 3, duplicate task id, too many errors in total. The v1 fixtures `01…05` / `01…07` are unchanged.
- `invalid/` covers unknown keys, wrong references, duplicate IDs/text, invalid counts, malicious markup, unsupported version, control/invisible-only characters and missing explanations.
- Additional runtime-generated negative tests must cover **malformed JSON, >128 KiB input, wrong-game import, simultaneous imports, cancelled/replaced file loads, and replay/download** without committing huge or invalid binary files.

## Manual import procedure (all four games)

Open `/games/<type>` → **Import activity** → choose a valid file matching the chosen game → inspect the teacher review (including the private answer key) → **Open in editor** → inspect authored content → Preview/Present/Independent → Download activity → reimport and compare. Changing DE/EN/VI must not translate authored content. Before Check/Reveal, no answer key is visible to the student.

For each invalid file, select it in the matching game's Import activity flow. Expect a localized, actionable validation message, no override to the current draft, no change to the current game/answer key, and the ability to choose a subsequent valid file. The programmatic test `tests/activityCorpus.test.ts` asserts each outcome using actual validators, including round-trips.

## Memory is a separate game engine

Memory now accepts portable `activityType: "memory"` JSON containing teacher-authored pairs. It **also** supports the original `LEFT | RIGHT | OPTIONAL_CATEGORY` legacy bulk editor; `memory-legacy/01-german-vocabulary.txt` is a compatibility fixture, **not JSON**. Import/export never contains room/player data. Memory online behavior remains in the original RPC/room modules and is not part of this corpus smoke.

## Evidence labels and ownership

- `schema-validated`: correct structural shape under current validator code.
- `browser-import-tested`: Antigravity executes actual file chooser/edit/download/reimport against a verified commit.
- `classroom-tested`: owner has actually used and judged the content in teaching; no file currently claims this.

Copy fixtures to classroom library `library/<game>/activities/` only after the owner reviews teaching content; testing fixtures are not built-in presets or automatically distributed.

### Memory JSON files (approved frontend-only extension)

- Five `valid/memory` samples cover bilingual vocabulary, gastronomy, Vietnamese, English and the maximum 16 pairs.
- Seven `invalid/memory` samples test hostile/unknown room or student state, duplicate pairs/IDs, count, markup and text-length boundaries.
- `memory-legacy/` remains a text-parser regression fixture, not a JSON activity.
- The online room button requires at least two pairs and keeps using existing hosted Memory RPCs only when a teacher explicitly clicks it. Antigravity must not trigger hosted room creation without separate approval.
