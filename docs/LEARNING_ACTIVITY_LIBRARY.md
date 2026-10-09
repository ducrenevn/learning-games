# Adult Language Activity Library — Product Plan

**Status:** Product direction agreed in planning, 2026-10-09. **Not implemented.** This plan is for future milestones and does not change the current Memory game, its vocabulary format, production deployment, or SPP/Supabase contracts.

## Purpose

Create a calm, adult-appropriate **classroom activity toolkit** for practicing language comprehension, production, recall, accuracy, and real communication. The software should make valuable classroom tasks easier to prepare and run, not replace natural student conversation with points or animations.

Audience: adult learners, including general and vocational German, with scope for other target languages. The app stays a standalone Learning Games site accessible via link/QR or Canva presentation. Optional SPP integration remains a separate, later decision.

### Design principles

- **Learning first:** an activity must encourage meaningful input, output, interaction, or retrieval.
- **Adult tone:** avoid RPG worlds, coins, leveling, compulsory leaderboards, childish visual effects, and default high-pressure timers. A challenge may still be enjoyable and playful.
- **Practical for real lessons:** quick startup; teacher controls pace, reveal, skip, pause, repeat, and discussion.
- **Language production matters:** support unconstrained speaking and writing, not just auto-marked multiple choice. Open responses are teacher-reviewed unless clearly deterministic.
- **Flexible participation:** individual, pair, small-group, or whole-class activities, depending on game mechanics.
- **Reusable, local-first material:** each new activity format must support externally authored, portable activity files as defined in [PORTABLE_ACTIVITY_FILES.md](PORTABLE_ACTIVITY_FILES.md).
- **No account prerequisite for guests in the initial standalone live-game concept.** Anonymous room capabilities are not learner identity or durable result tracking.
- **Independent game engines:** do not prematurely merge Memory's turn/scoring model with simultaneous-response or discussion games.

## Learning outcomes to cover

| Outcome | Observable task |
| --- | --- |
| Comprehension | Understand spoken/written messages and identify key, implied, or contrasting information |
| Production | Speak, explain, paraphrase, write, and construct context-appropriate responses |
| Recall and accuracy | Retrieve vocabulary, sequence language, notice/correct errors |
| Communication and collaboration | Ask for missing information, negotiate, decide, justify, and solve problems together |

## Candidate activity catalog (planning priorities, not a delivery promise)

| Activity type / working slug | Core behavior | Skills | Tentative wave |
| --- | --- | --- | --- |
| Quick Response Board / `quick-response` | All students respond privately to a prompt; teacher selects/reveals/discusses responses | Writing, recall, speaking follow-up | 1 |
| Sort & Sequence / `sort-sequence` | Categorize terms or arrange sentences, dialogues, or procedures | Reading, grammar, vocabulary | 1 |
| Information Gap / `information-gap` | Partners receive complementary private information and exchange it to complete a shared goal | Speaking, listening, interaction | 1 |
| Conversation Cards / `conversation-cards` | Distribute distinct confidential roles and objectives for realistic conversations | Speaking, pragmatics, fluency | 1 |
| Language Detective / `language-detective` | Find, correct, and explain errors or inappropriate expressions; optional sentence-auction variation | Grammar, accuracy, reasoning | 1 |
| Listen & Reconstruct / `listen-reconstruct` | Listen to a message, take notes, reconstruct and compare with the source | Listening, writing, collaboration | 1 |
| Decision Room / `decision-room` | Rank choices, defend decisions, and negotiate an outcome | Discussion, argumentation | 2 |
| Explain It / `explain-it` | Describe a term without saying it, using synonyms or paraphrases | Vocabulary retrieval, fluency | 2 |
| Scenario Paths / `scenario-paths` | Choose and discuss responses to a realistic branching conversation | Reading/listening, pragmatics | 2 |
| Jigsaw Reading / `jigsaw-reading` | Share separate pieces of information to build the full picture | Reading, speaking, synthesis | 2 |
| Describe & Recreate / `describe-recreate` | One partner describes a hidden image/arrangement, another reconstructs it | Listening, speaking, precision | 2 |
| Listening Detective / `listening-detective` | Identify details, intentions, discrepancies or implications in audio | Listening comprehension | 2 |

**Wave 1 is a candidate shortlist**, not an instruction to build six games at once. In particular, Information Gap and Conversation Cards are strategically valuable because students need to communicate with each other. Existing **Memory** remains the first implemented game and the current delivery focus.

More advanced possibilities **after teacher testing**: interactive audio/video, optional student recordings, branching media, lesson sequences, and SPP launch/results integration. None is authorized here.

## Classroom modes

| Mode | Intended use | Boundary |
| --- | --- | --- |
| Online live | Teacher hosts on computer/video call; learners join with link or room code on personal devices | Live room coordination normally needs network/backend |
| In-person / projector | Teacher presents prompts and optionally collects learner responses on phones | Should remain usable with minimal student devices where mechanics allow |
| Print / no-internet alternative | Print prompt cards, complementary A/B handouts, or worksheets | Printable fallback can work offline; does **not** imply multiplayer synchronization without a network |
| Solo local preview | Teacher imports, previews, or prepares content locally | Should not require accounts or backend when a game can run locally |

The precise supported modes and student-device requirements must be declared per activity type, not promised universally.

## Language model for activities

Three distinct concerns must remain separate:

1. **Target/learning language** (e.g. German): language practiced in prompts, audio, answers, and role cards.
2. **Interface language** (e.g. German/Vietnamese/English): translated navigation, buttons, app notices, and generic feedback.
3. **Room language policy** chosen by teacher: **everyone same interface language** (learners see no selector) OR **learners may choose their own interface language** at join/lobby. A standalone non-room selection screen may offer an interface-language switch.

Interface choice must not automatically translate or rewrite the task's target-language material. No guest account or persistent language preference is required for this first concept.

## Teacher flow

1. Select an activity type.
2. Import a portable activity file, author it in a lightweight editor, or obtain an AI creation guide/template.
3. Validate and **preview the student experience**; edit content and settings before play.
4. Start a room, use projector mode, or prepare a printable version as the format supports.
5. Facilitate, reveal/discuss responses, and finish without assuming every open response can be scored automatically.
6. Download/export the activity and reuse it later from a local folder.

**Example lesson: German A2/B1, handling guest complaints (25 minutes):** Sort professional expressions (3m) → Listen & Reconstruct a complaint (5m) → Conversation Cards guest/waiter (8m) → Language Detective on polite wording (5m) → Quick Response reflection (4m). This is an illustration, **not** a lesson-bundling feature implemented today.

## Acceptance questions for each new game type

Before calling a future game ready:

- Does the activity offer meaningful target-language practice for adults?
- Are teacher and student views, role secrecy where needed, timing, and reveal behavior unambiguous?
- Are online/in-person/offline modes described accurately?
- Can an AI create a valid portable JSON file from the game-specific authoring guide?
- Can a teacher **import → validate → preview → adjust → play → export → reimport** it without losing information?
- Are open answers handled fairly, without false claims of automatic linguistic assessment?
- Is the game isolated from SPP Auth, Homework, learner identity, and production schema until separately authorized?

## Milestone sequencing / boundaries

- **Now:** keep this as documentation only while the Memory/Vercel track remains active.
- **First architecture step for new activity content:** finalize the portable content envelope, per-game contracts, error messages, and round-trip tests; keep content separate from multiplayer session state.
- **Then:** select and implement **one** additional game with genuine teacher testing before extracting cross-game authoring components.
- **Later:** add optional collections, richer media bundles, and optional SPP integration on separate authorization.

Detailed future game contracts: [Information Gap](activity-specs/GAME_SPEC_information-gap.md) and [Conversation Cards](activity-specs/GAME_SPEC_conversation-cards.md). These specify agreed behavior and illustrative, **non-final** JSON examples; neither game is implemented.\n\nSee [PORTABLE_ACTIVITY_FILES.md](PORTABLE_ACTIVITY_FILES.md) for the proposed file design. Existing Memory's `LEFT | RIGHT | OPTIONAL_CATEGORY` text input and its server validation remain as documented in [GAME_CONTRACTS.md](GAME_CONTRACTS.md).
