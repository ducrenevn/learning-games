# Learning Games — shipped game map (2026-10-16)

**Production:** https://learning-games-rho.vercel.app · **Release:** [v1 closure](releases/2026-10-16-v1-production.md) · **Scope:** four local games, two supported online participation combinations.

| Stable game ID | DE | EN | VI | Local presentation / practice | Hosted participation |
| --- | --- | --- | --- | --- | --- |
| `memory` | Memory | Memory | Memory | Available | **Turns** available |
| `sort` | Was passt wohin? | Where Does It Go? | Thuộc nhóm nào? | Available | **Individual** available |
| `sequence` | Der Reihe nach | Line It Up | Xếp đúng thứ tự | Available | Not implemented |
| `language-detective` | Auf Fehlersuche | Spot the Mistake | Truy tìm lỗi sai | Available | Not implemented |

The [V1 multiplayer contract](architecture/MULTIPLAYER_V1_CONTRACT.md) specifies **11 target combinations, not 11 released modes**. No hosted Memory Individual, Sort Collaborative/Teacher-paced, Sequence or Detective multiplayer has shipped. Do not expose unimplemented modes as active.

**Teacher materials and AI-generated JSON:** consult [portable format](architecture/PORTABLE_ACTIVITY_FILES.md), the corresponding [game spec](games/) and [teaching library](../library/README.md). Local imported files do **not** automatically become available in online rooms. Authored target-language content is not silently translated when users switch the DE/EN/VI interface.

**Candidate future games (unimplemented):** Conversation Cards, Information Gap, Quick Response Board, Listen & Reconstruct, Explain It, etc. See the [Product Catalog](PRODUCT_CATALOG.md). Classroom feedback should determine which is next.

---

## Archived earlier game-map snapshots (not current)
The content below is preserved as dated provenance. Ignore its old "not yet built" claims for the present shipped platform.

# Learning Games — current game status (2026-10-14)

| Game | Local Presentation / Independent Practice | Hosted rooms |
| --- | --- | --- |
| Memory | Accepted on unmerged MP0 branch `b569d76` | **Turns functional hosted QA accepted**; Individual planned MP1 |
| Sort | Accepted on unmerged MP0 branch | Collaborative, Individual, Teacher-paced planned MP1 |
| Sequence | Accepted on unmerged MP0 branch | Collaborative, Individual, Teacher-paced planned MP1 |
| Language Detective | Accepted on unmerged MP0 branch (v1/v2) | Collaborative, Individual, Teacher-paced planned MP1 |

Exactly 11 total approved target game/mode combinations, **not all implemented**. See [V1 matrix](architecture/MULTIPLAYER_V1_CONTRACT.md), [MP1 draft](architecture/MP1_BACKEND_CONTRACT.md) and [MP0 closure](audits/2026-10-14-mp0-hosted-acceptance.md). Other games remain future ideas. The 2026-10-12 catalog below is retained as historical status and must not override this table.

---

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
