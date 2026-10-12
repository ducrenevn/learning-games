# Learning Games — Teaching Library
**Agent-facing ideas and future teacher-owned JSON materials.** Not the engine, schema source or built-in exercise gallery.

| Activity | Teaching applications | Real reusable JSON |
| --- | --- | --- |
| Sort | [sort/README.md](sort/README.md) | [sort/activities](sort/activities/README.md): **none yet** |
| Conversation Cards | [Product specification](../docs/games/conversation-cards.md) | None yet |
| Information Gap | [Product specification](../docs/games/information-gap.md) | None yet |

Start at [GAME_MAP](../docs/GAME_MAP.md). Agents should read only the matching README/JSON, not scan the entire library. Add further game directories only when useful.

## Real classroom activity-file policy
After a game has a **final approved, implemented schema/validator**, store real reviewed reusable JSON in `library/<game>/activities/`. An illustrative draft schema/example is **not import-ready**. Add one short inventory row in that game's README: title/topic/level, path, status and non-identifying evidence.

Evidence levels: **draft** (not fully validated), **schema-validated** (name the validator/version), **classroom-tested** (genuinely used; date/context without personal data). Never label a file classroom-tested merely because it reads well. Suggest edits via reviewed commits/PRs, don't silently overwrite proven content, and don't auto-publish repository files to the live app.

**Privacy:** only reusable teaching prompts, instructions and approved answers; no learner identities, submitted answers, recorded student speech, room capabilities or live session state. Mechanics/specifications remain under [docs/activity-specs](../docs/games).
