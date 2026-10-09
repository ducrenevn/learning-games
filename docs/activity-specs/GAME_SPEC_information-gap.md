# GAME_SPEC_information-gap — Information Gap

**Status:** Approved product behavior for future implementation, 2026-10-09; **not implemented**. The example JSON is a **non-final authoring illustration**, not a versioned parser contract or a tested import fixture. This file does not authorize backend, SPP, production, deploy, or application changes.

**Related:** [Adult Activity Library](../LEARNING_ACTIVITY_LIBRARY.md) · [Portable Activity Files](../PORTABLE_ACTIVITY_FILES.md) · [Conversation Cards](GAME_SPEC_conversation-cards.md) · [Current Memory Contracts](../GAME_CONTRACTS.md)

## 1. Learning purpose and boundaries

Two participants possess **complementary private information**. They must communicate in the learning language to obtain information missing from their own view. The app provides each partner's material and (optionally) a place to record answers; **students do the actual speaking**, in person or via external video-call/breakout facilities.

Recommended adult scenarios: reservations, transport schedules, workplace rosters, product/service comparisons, appointments, client profiles, or vocational tasks. Both roles should have a genuine information need. Avoid trivia races, compulsory scores, role-playing avatars and default countdown pressure.

**Core product decision:** A *single* imported activity supports two teacher-selectable modes:

1. **Display-only:** show private complementary data with gaps; participants communicate and take external notes if desired. No mandatory on-screen answer entry or automatic scoring.
2. **Interactive completion:** show the *same* private gaps as editable answer fields; participants ask one another and type their own answers. Structured fields may be checked against the canonical dataset during teacher-authorized review. Open-ended language is teacher-reviewed.

The mode is a **session configuration chosen before the round**, not a reason to create duplicate activity files. Never change modes mid-round in a way that silently discards responses.

## 2. Roles and screens

| View | Can see | Cannot see before teacher reveal |
| --- | --- | --- |
| Teacher private setup | Full canonical data, both A/B projections, validation diagnostics, optional hints, session config | N/A |
| Teacher shared/projector view | Shared task title, non-secret instructions, phase/timing, optionally aggregate participation | Answer key or private A/B content by default |
| Student A | Public task + A-visible values, gaps, own input state (interactive mode), permitted language support | B-only values, teacher answer key, partner input |
| Student B | Public task + B-visible values, gaps, own input state (interactive mode), permitted language support | A-only values, teacher answer key, partner input |
| Review view | Only answers explicitly released after teacher ends the exchange | Secret material that remains unreleased by session policy |

**Role secrecy is an authorization requirement** for online delivery: never send all roles' unredacted data to every client and simply hide it with CSS/React conditional rendering. Do not put role secrets in public joins, QR URLs, or ordinary logs.

### Pair/group assignment

- One host session can serve **many independent pairs** working from the same imported activity; each pair receives one A and one B.
- Teacher can assign pairs/roles automatically or manually in lobby, before a round starts.
- An odd-numbered group can be assigned **two collaborators on the same A/B side** (e.g. A1+A2 and B); this is a deliberate grouping choice, not an automatic leak of both roles.
- Joining late: keep student in lobby until teacher places them. Leaving/disconnecting: preserve role and entered answers for authenticated-to-room recovery *if safely supported*, otherwise show an explicit recovery/assignment path. No claim that this works in the current prototype.
- Starting a new round can reassign roles; prior information cannot be made unknown again, so teacher should be warned about reusing the exact same task.

## 3. Teacher journey and phases

| Phase | Teacher controls | Student behavior |
| --- | --- | --- |
| **Preparation (local)** | Import/validate/edit JSON; preview A/B, choose display-only vs interactive; optionally prepare printouts | Not yet in room |
| **Lobby / grouping** | Create code/link, set common or learner-selectable interface-language policy, group and assign A/B, verify everyone ready | Join as guest with room code/link; see lobby and permitted interface-language selector only when teacher allows |
| **Private reading** | Start preparation; optional duration, no forced timer | Read only own sheet/instructions and optional language support |
| **Exchange** | Start, pause/resume, finish exchange, observe completion status | Ask partner questions; in interactive mode edit missing fields; no partner data auto-filled |
| **Submitted / waiting** (interactive only) | Observe submitted state; end for review when ready | Submit own answers; no early answer key or cross-partner copying |
| **Review** | Explicitly reveal canonical answers; facilitate discussion | Compare answers/notes to correct information; see clear feedback only on deterministic fields |
| **Finished / new round** | Close session or start another with fresh assignment/content | Return to lobby or next-round instructions |

Teacher must be able to end early and enter review without a timer. Timer, if added, is optional and should not auto-reveal private content without teacher policy. The **phase change to review** should be the clear trigger for answer release.

## 4. Difference between the two completion modes

| Behavior | Display-only | Interactive completion |
| --- | --- | --- |
| Hidden cells | Visual gaps/placeholders | Editable inputs for own missing data |
| Speech | Required pedagogically, not recorded by app | Same; entry must not replace speech |
| Typed responses | None in app | Saved per participating learner/side within live session only |
| Submit | No mandatory submit; teacher ends exchange | Student may submit; submitted student waits |
| Assessment | Teacher discusses spoken findings | Objective cells can receive accepted-format checking at review |
| Review | Complete dataset revealed by teacher | Reference dataset revealed by teacher, with response-by-response comparison |
| Printed use | Complementary A/B handouts | Printed handouts with write-in blank spaces |

When a learner's answer is free-form language, don't pretend exact string equality assesses communicative correctness. Structured values (times, amounts, dates, counts) can support precise format-aware checks, with documented accepted representations, e.g. `19:30` / `19.30`. Never use broad accent stripping or semantic inference by default. Correctness feedback and optional completion counts are **not** public leaderboards.

## 5. Canonical source, visibility and integrity rules

**Teacher/AI authors one complete information dataset**, with stable field/row identifiers and A/B visibility rules; the application derives the two sheets. Never require separately typed, divergent answer keys.

Required **behavioral validation** (actual field names/enums/limits still to be specified):

- Every referenced row/field exists, is uniquely identified, and has a complete canonical value where an answer is expected.
- Shared row identifiers are understandable to **both** partners so they know what to ask about.
- Every hidden answer in A is accessible to B, and every hidden answer in B is accessible to A. No unanswerable gaps.
- Both A and B have meaningful gaps/information to contribute; not a one-sided reading exercise.
- Public instructions and language hints must not trivially reveal private answers.
- Acceptable objective-response formats are explicit if checking is supported; unsupported formats remain teacher-review-only.
- Teacher can inspect exact student views before starting and fix structurally invalid content.
- Parsed content is always untrusted data; never execute embedded code or implicitly fetch arbitrary URLs.

### Illustrative activity JSON (NOT FINAL SCHEMA)

Proposed envelope aligns conceptually with [PORTABLE_ACTIVITY_FILES.md](../PORTABLE_ACTIVITY_FILES.md). **Do not implement an importer by copying the field names below without schema review.**

```json
{
  "format": "learning-games.activity",
  "schemaVersion": 1,
  "activityType": "information-gap",
  "id": "restaurant-reservations",
  "title": "Reservierungen für heute",
  "targetLanguage": "de",
  "cefrLevel": "A2",
  "topics": ["restaurant", "reservations"],
  "skills": ["speaking", "listening"],
  "estimatedMinutes": 8,
  "instructions": "Fragt euch gegenseitig und ergänzt die fehlenden Informationen.",
  "content": {
    "columns": [
      { "id": "name", "label": "Name", "kind": "text" },
      { "id": "time", "label": "Uhrzeit", "kind": "time" },
      { "id": "guests", "label": "Personen", "kind": "number" }
    ],
    "rows": [
      { "id": "r1", "values": { "name": "Frau Müller", "time": "18:30", "guests": 2 } },
      { "id": "r2", "values": { "name": "Herr Becker", "time": "19:30", "guests": 4 } }
    ],
    "visibleFields": {
      "A": { "r1": ["name", "time"], "r2": ["name", "guests"] },
      "B": { "r1": ["name", "guests"], "r2": ["name", "time"] }
    },
    "languageSupport": [
      "Für wie viele Personen ist die Reservierung?",
      "Um wie viel Uhr kommt Herr Becker?"
    ]
  }
}
```

This example deliberately contains **only teaching material**. The session chooses display/completion mode, groupings, current phase, room UI-language policy, and student answer state at runtime. None belongs in the portable activity export. A generated exercise should be reviewed for teaching quality before use.

### AI authoring instructions (once a final schema exists)

> Using the final GAME_SPEC_information-gap and its approved JSON schema, create one German A2 information-gap exercise about booking an appointment with 4–6 records. Supply a complete master dataset with stable IDs, a shared way to refer to each row, meaningful complementary A/B visibility, and language-support prompts that do not reveal solutions. Ensure every missing fact is available to the other role. Return only one valid JSON document with no Markdown fences.

**Until the schema is finalized, AI output based on this document is a draft example, not guaranteed import-ready.**

## 6. Classroom delivery modes

- **Online:** each learner opens their private A/B sheet by join link; partners speak over existing conferencing/breakout rooms. This app **does not provide audio/video calling**.
- **In-person with devices:** each pair speaks face-to-face while viewing private screens; teacher may project public-only instructions/status.
- **Print/no-internet:** generate separate A/B sheets; in completion mode leave writeable blanks. Print a distinct teacher key. Printed materials function offline; this does not imply offline live multiplayer.
- **Local teacher preview:** import/preview/export should not require SPP account or live room where browser constraints permit.

Language policy: `targetLanguage` is content language. UI labels/messages are localized separately. A teacher chooses one shared UI language (no student chooser) or learner-selectable UI language in join/lobby; do not auto-translate German task text based on student UI choice.

## 7. Important edge cases

- Late joiners and missing partner: teacher can hold in lobby, reassign or end affected pair.
- Student disconnect: attempted safe rejoin must not expose B's secrets to A, reset other groups, or silently overwrite prior entered answers.
- Early submit: wait quietly; no key until review.
- Teacher switches session mode: allowed **before** round, not during exchange if answers could be lost.
- Teacher accidentally shares screen: private teacher preview must be clearly separate from projector/public view.
- Information gaps with a field unknown to both A and B must fail import validation before play.
- If students switch A/B in a later round, tell teacher prior exposure cannot be undone.
- On print, ensure only the assigned sheet is handed to each role; shared projection must not reveal either complete view.

## 8. Acceptance criteria for future implementation

- [ ] Teacher creates one task file and sees correct **derived** A and B views from a single complete master dataset.
- [ ] Import rejects malformed/incomplete/unanswerable A/B data with actionable error messages.
- [ ] Teacher selects display-only and learners see no mandatory answer-entry UI.
- [ ] Teacher selects interactive completion and each learner can enter/edit/submit their own missing values, without auto-filling from partner.
- [ ] Objective response checking occurs only at review; accepted formats are predictable. Free-text responses are teacher-reviewable, not falsely machine-scored.
- [ ] Teacher explicitly ends exchange and releases answers; no early-key exposure.
- [ ] One session supports six independent A/B pairs (12 students) with no cross-role or cross-pair secret disclosure.
- [ ] Pair reassignment, odd-numbered groups, late joins and reconnects have tested, explicit behavior.
- [ ] Online guest room works via link/code without permanent learner account; conferencing remains external.
- [ ] Teacher can export separate printable A/B sheets and answer key for in-person/offline use.
- [ ] External-AI-generated **final-schema-valid** JSON passes import → preview → edit → play → export → reimport without material loss.
- [ ] Existing Memory engine, its `LEFT | RIGHT | OPTIONAL_CATEGORY` import, SPP Auth/Homework and production DB remain unchanged unless separately approved.

## 9. Future implementation boundary

**Proposed order:** build [Conversation Cards](GAME_SPEC_conversation-cards.md) first to validate confidential role distribution and rounds with fewer answer mechanics; add this game next using those proven primitives, while keeping each game engine independent. No database design, production migration, or deployment approval follows from this planning spec.
