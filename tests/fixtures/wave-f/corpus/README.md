# Activity import corpus v1 — schema-validated, not classroom-tested
Under `valid/` are **15 accepted JSON files** (5 per game) for Sort, Sequence and Language Detective. `invalid/` contains **21 deliberate rejection fixtures** (7 per game). `manifest.json` records the expected outcome and validator error code. Each canonical JSON file is importable only in its own game. The boundary fixtures (maximum categories/cards/steps/segments) are technical, not lesson recommendations.

**Manual procedure:** Open the game's **Import activity** page → select a valid file → inspect teacher-only content/keys → accept → navigate guided editor → Preview/Present/Practice → Download activity → reimport. Switch DE/EN/VI without changing authored German, Vietnamese or English content. In each invalid case, expect an actionable localized error **without replacing a current draft**; then retry with a valid file. Also generate malformed JSON, over-128-KiB input, wrong-game file, file-read race/cancel and same-file retry for browser negative tests.

`memory-legacy/01-german-vocabulary.txt` is Memory's original text pair format, **not JSON**. Memory does not yet have canonical JSON import. Do not claim it does.

Content labels: **schema-validated** only until actual browser file chooser+download proof; **classroom-tested** requires owner teaching acceptance. These fixtures do not automatically become app presets or library lessons.
