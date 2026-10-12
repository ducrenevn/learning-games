# Learning Games — Agent Game Map
**Short discovery index (2026-10-12)**. Read only the relevant link, not every game specification.

| Game | Status | Core mechanic | Teaching / specification |
| --- | --- | --- | --- |
| Memory | **Implemented on main**; M3a localization PR #10 unmerged | Find matching pairs | [Existing contract](games/memory.md) |
| Sort / LG-A1 | **Planning only** | Assign items to teacher-authored categories | [Mechanic draft](games/sort.md) · [Teaching uses](../library/sort/README.md) |
| Sequence | Deferred, separate game mechanic | Put items in meaningful order | No approved contract |
| Quick Response Board | Candidate | Submit short responses for discussion | [Strategic catalog](PRODUCT_CATALOG.md) |
| Conversation Cards | Product-spec only | Speak from confidential complementary roles | [Specification](games/conversation-cards.md) |
| Information Gap | Product-spec only | Exchange complementary missing information | [Specification](games/information-gap.md) |
| Language Detective / Listen & Reconstruct | Candidates | Correct errors / rebuild heard information | [Strategic catalog](PRODUCT_CATALOG.md) |

**Agent routes**
- Lesson planning: this map → [teaching-library index](../library/README.md) → one relevant teaching guide; inspect a JSON only when reusing it.
- JSON generation: this map → game's **approved** schema/spec → [portable-file policy](architecture/PORTABLE_ACTIVITY_FILES.md). Draft specs do not produce guaranteed import-ready files.
- Development: [AGENTS.md](../AGENTS.md) → [START_HERE.md](START_HERE.md) → current code, tests, specific contracts.
- Release verification: read [CURRENT_STATE](CURRENT_STATE.md), live GitHub main and PRs; planning is not deployed functionality.

Teaching uses may evolve via reviewed repo changes without altering mechanics. No account, live state, tokens, identities or student responses in portable activity JSON. Interface language DE/EN/VI is distinct from authored target language.
