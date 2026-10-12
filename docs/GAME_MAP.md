# Learning Games — Agent Game Map
**Short game-discovery index · 2026-10-12.** Start here, open only what the task needs.

| Game | Status | Stage 1 mechanic | Spec / uses |
| --- | --- | --- | --- |
| Memory | **Playable on main**; M3a frontend PR #10 separate/unmerged at intake | Online and local pair matching | [Memory contract](games/memory.md) |
| Sort / LG-A1 | **Authorized for next implementation, NOT yet built** | Categorize teacher-defined cards | [Spec](games/sort.md) · [Teaching library](../library/sort/README.md) |
| Sequence / LG-A2 | **Authorized for next implementation, NOT yet built** | Arrange ordered cards/dialogue lines/steps | [Spec](games/sequence.md) |
| Language Detective / LG-A3 | **Authorized for next implementation, NOT yet built** | Identify teacher-marked errors, review corrections | [Spec](games/language-detective.md) |
| Conversation Cards | Specified; not in current implementation wave | Confidential role-based conversations | [Spec](games/conversation-cards.md) |
| Information Gap | Specified; not in current implementation wave | Partner exchange of complementary facts | [Spec](games/information-gap.md) |
| Quick Response Board, Listen & Reconstruct, others | Later candidates | Vary by game | [Product catalog](PRODUCT_CATALOG.md) |

**Stage 1 of LG-A1/A2/A3:** [local-first contract](architecture/LOCAL_FIRST_ACTIVITY_CONTRACT.md) — teacher-operated **Presentation Mode** and student **Independent Mode**. Same teacher-owned portable JSON and game rules; no new backend, accounts, synchronized rooms, shared turns, or result storage. Multiplayer becomes a separately gated Stage 2. A locally imported file is not automatically shareable over a room link.

**Lesson agents:** map → relevant [teaching library](../library/README.md) → specific content file if available. Technical game creators: map → particular game specification → [portable file rules](architecture/PORTABLE_ACTIVITY_FILES.md). Developers: [AGENTS](../AGENTS.md) → [START_HERE](START_HERE.md) → source/tests. Avoid reading all long docs by default.

Authoring target language remains separate from DE/EN/VI interface localization. Library examples are not built-in presets or verified classroom files.
