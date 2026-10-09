# GAME_SPEC_conversation-cards — Conversation Cards

**Status:** Approved product behavior for future implementation, 2026-10-09; **not implemented**. JSON below is illustrative, **not** the final import contract or validated fixture. No app/backend/SPP/deployment changes authorized.

**Related:** [Adult Activity Library](../LEARNING_ACTIVITY_LIBRARY.md) · [Portable Activity Files](../PORTABLE_ACTIVITY_FILES.md) · [Information Gap](GAME_SPEC_information-gap.md) · [Current Memory Contracts](../GAME_CONTRACTS.md)

## 1. Purpose

Adult language learners practice a realistic conversation by receiving **one shared situation** but **different confidential roles, facts, objectives and constraints**. Students speak to reach an outcome (a solution, agreement, request, clarification, negotiation), not to win an RPG or answer a quiz. Example contexts: workplace customer support, gastronomy, healthcare reception, interviews, appointment scheduling, negotiating plans.

Real speech happens in-person or through an **external** conferencing tool (e.g. Meet and its breakout arrangements). Learning Games distributes materials and manages phases; **no built-in audio/video or automatic pronunciation/fluency scoring** in the first implementation. The outcome may have more than one valid solution; teacher-led discussion, not machine scoring, is the default.

## 2. What the teacher authors

- Shared scenario: context and problem that all participants may know.
- **Two explicit roles (A and B)** at minimum. Each needs its own private background, objective, and relevant constraints/facts; they must offer different perspectives.
- Optional per-role vocabulary support/sentence starters, level, topic, target language, CEFR level, recommended duration, preparation prompts and debrief/reflection questions.
- A meaningful outcome or task objective (e.g., agree on a practicable remedy) without forcing a single correct script.
- Optional multiple *distinct* scenarios for later rounds are a separate extension, not required by the initial one-scenario contract.
- Never author room codes, names, chat histories, generated responses, scores or identities into the activity file.

Teacher and AI can generate a role-play file independently of accounts, backend services or in-app AI. Import must validate role completeness and give teacher a private preview/edit opportunity before student delivery.

## 3. Surfaces and privacy

| Screen / actor | Can see | Must not see before permitted review |
| --- | --- | --- |
| Teacher setup | Both roles, all private details, shared situation, hints and debrief questions; can edit/reassign pre-round | N/A |
| Teacher presentation / projector | Shared situation and generic non-secret instructions | Student private background, constraints, teacher-only notes |
| Student A | Shared situation, Role A's own background, goal, constraints, optional A-specific language help | Role B's private card and teacher-only guidance |
| Student B | Shared situation, Role B's own background, goal, constraints, optional B-specific language help | Role A's private card and teacher-only guidance |
| Reflection | Teacher-approved shared prompt and outcomes students choose to report | Original private cards unless teacher explicitly elects to reveal them |

**Confidential role data must be withheld at the service/data-delivery boundary** in live online rooms, not just hidden in frontend presentation. No secret role information or room capabilities in public QR/join URLs/logs. Printed private cards are distributed separately.

## 4. Exact teacher and student journey

| Phase | Teacher controls | Student experience |
| --- | --- | --- |
| **Authoring / preview** | Import/validate/edit JSON, preview each role and public projection, enable/disable optional language help | Not in session |
| **Lobby / pairing** | Launch via room code/link, set UI-language policy, assign A/B pairs manually or automatically | Join as guest, see own lobby state and optional interface-language picker only if teacher allows |
| **Role preparation** | Open private role cards, optional preparation timer, verify ready status | Read private goal and constraints; optionally expand helpful expressions |
| **Conversation** | Start, pause/resume, end; optional time indication, no forced countdown | Talk naturally to partner; app doesn't require typing, voice capture or correctness selection |
| **Reflection** | End round; reveal debrief question; invite oral report (optional short group summary only if explicitly included later) | Report the outcome and reflect verbally; do not see partner's role without explicit reveal |
| **Finish / next round** | Close, select fresh scenario or consciously switch roles, reassign pairs as needed | Return to lobby or prepare next scenario |

Pausing should clearly suspend round progression, not attempt to mute students in external video software. A teacher may stop early and go directly to reflection. Timers are optional and should not disclose private material automatically. Students can optionally indicate "ready"; this is not a score.

### Sample classroom interaction

Shared: `Ein Gast hat ein falsches Gericht bekommen und beschwert sich beim Service.`

- **Role A — Gast:** Ordered vegetarian; received meat. Must leave in 15 minutes. Wants an acceptable quick remedy and not to pay for the incorrect dish.
- **Role B — Servicekraft:** A new cooked dish takes 20 minutes; vegetarian salad is ready in 5; free drink permissible, refund requires manager approval.
- **Outcome:** Negotiate a practical solution while communicating politely and acknowledging limits.
- **Optional support:** `Entschuldigung, ich habe ... bestellt.` / `Es tut mir sehr leid. Ich kann Ihnen ... anbieten.`
- **Reflection:** `Auf welche Lösung habt ihr euch geeinigt?` / `Welche Formulierungen waren hilfreich?`

There is no automatically correct resolution, as different reasonable compromises may work.

## 5. Grouping and round handling

- One imported scenario can be distributed simultaneously to multiple pairs within one class session; baseline acceptance target: **12 participants as six pairs**.
- Teacher can assign A/B automatically or manually **before** starting. Learners never choose another person's private role arbitrarily.
- Odd participant count: teacher may set two learners to one side and one to the other, designate a rotating observer with **explicit** visibility policy, or hold a student for regrouping. Do not accidentally deliver both secrets to an observer.
- Late joiners remain in lobby until teacher assigns them. Disconnected students use a safe rejoin/reassignment process if supported; don't reset other pairs or reveal other roles.
- Switching roles or replaying the identical scenario **does not restore secrecy** once facts are known. Warn teacher and prefer a fresh scenario for a genuinely new round.
- In-person with a single projected screen: use **only shared material**. Confidential individual roles require individual devices or separately printed cards.

## 6. Language behavior

Separate the **task target language** (e.g., German text on role cards) from interface localization (buttons/errors/navigation in German, Vietnamese, English). Teacher's room setting chooses:

1. **One shared UI language:** learners see no language selector.
2. **Learner-selectable UI language:** language selection appears when joining / in lobby.

Do not translate target-language role cards when a participant changes interface language. Account persistence is not required for guest participation.

## 7. Local-first content and proposed JSON (NOT FINAL SCHEMA)

A file such as `conversation-cards_wrong-order.json` should be portable, independent of a backend, self-contained for text-only situations, and compatible with future **import → validate → preview/edit → play → export → reimport** round-trip. Keep saved teaching content separate from temporary classroom session state.

```json
{
  "format": "learning-games.activity",
  "schemaVersion": 1,
  "activityType": "conversation-cards",
  "id": "wrong-restaurant-order",
  "title": "Beschwerde im Restaurant",
  "targetLanguage": "de",
  "cefrLevel": "A2-B1",
  "topics": ["gastronomy", "complaints"],
  "skills": ["speaking", "interaction"],
  "estimatedMinutes": 8,
  "instructions": "Lest eure Rollen und findet gemeinsam eine Lösung.",
  "content": {
    "sharedSituation": "Ein Gast hat im Restaurant ein falsches Gericht bekommen.",
    "roles": [
      {
        "id": "A",
        "label": "Gast",
        "privateBackground": "Du hast vegetarisch bestellt, aber Fleisch bekommen. Du musst in 15 Minuten gehen.",
        "objective": "Finde schnell eine angemessene Lösung und bezahle nicht für das falsche Gericht.",
        "languageSupport": ["Entschuldigung, ich habe ... bestellt.", "Wäre es möglich, ...?"]
      },
      {
        "id": "B",
        "label": "Servicekraft",
        "privateBackground": "Ein warmes Ersatzgericht braucht 20 Minuten. Ein Salat braucht 5 Minuten. Ein Getränk darfst du gratis anbieten. Eine Rückerstattung muss genehmigt werden.",
        "objective": "Löse das Problem höflich und biete eine machbare Alternative.",
        "languageSupport": ["Es tut mir sehr leid.", "Ich kann Ihnen ... anbieten."]
      }
    ],
    "sharedOutcome": "Findet eine höfliche und praktikable Vereinbarung.",
    "reflectionQuestions": [
      "Auf welche Lösung habt ihr euch geeinigt?",
      "Welche Formulierungen waren hilfreich?"
    ]
  }
}
```

**The envelope and payload field names, supported CEFR format, limits and enums require schema design before implementation.** This JSON is an explanation for product review, not a claim that the app can import it today. Do not auto-fetch remote content, render executable markup or place real learner personal data inside exports.

### Suggested AI authoring prompt, after final schema approval

> Using the approved GAME_SPEC_conversation-cards and its final JSON schema, write one realistic B1 German workplace customer-service role-play. Provide one common situation and exactly two confidential A/B cards. Give each participant information, an objective, a realistic limitation, optional language support and two reflection questions. The solution must require real negotiation, not a single predetermined dialogue. Return only valid JSON, no Markdown fences.

Before schema approval, examples can be produced for discussion but are **not** guaranteed import-ready.

## 8. Classroom delivery and print

| Mode | Behavior |
| --- | --- |
| Online live | Teacher hosts one room; each participant joins and sees only assigned confidential role. Speaking occurs through externally arranged call/breakout rooms. |
| In-person with devices | Students view own card on phones/tablets and speak face-to-face. Projector displays shared scenario only. |
| In-person with printed sheets | Teacher prints shared context and separate A/B role cards; participants exchange information orally. Separate teacher-only reference. |
| No internet | Printed cards work offline; do **not** imply online game backend synchronizes offline. |
| Local teacher preview | Teacher can import/view/edit/download reusable content without student accounts wherever local browser operation permits. |

A printer-safe version must avoid unintentionally putting both roles on the same participant sheet. For online mode, invite links/QR should carry only room-access information permitted for guests, not role secrets or private capabilities.

## 9. Error handling and validation expectations

Importer should reject malformed/unsupported files, activities with fewer than two complementary roles, empty shared situation, missing objectives, ambiguous duplicate IDs, or impossible-to-render content. Warn when role descriptions trivially give away the other participant's secrets, when the scenario lacks a genuine conversational goal, or when content is unsuitable for the declared level; human teacher review remains necessary. For multi-role formats beyond A/B, defer specific behavior.

Teacher must have a clear public/private preview to prevent accidental disclosure through screen sharing. Joining late or reconnecting must never grant a new browser an unverified role solely from a guessed room code. No claims of permanent learner identity, persistent reports, AI grading, or recording are made.

## 10. Acceptance criteria for future implementation

- [ ] Teacher imports an externally authored, final-schema-valid JSON file and can preview both A/B roles and public projection.
- [ ] Two learners receive different private role cards; public join/QR URL never discloses private data.
- [ ] Teacher configures optional per-role language help and can run preparation → conversation → reflection without compulsory timer or grading.
- [ ] Learners can speak in person or in an external conferencing service; no integrated audio/video dependencies.
- [ ] Teacher can assign six A/B pairs from one activity; pair/role information remains properly isolated.
- [ ] Late join, disconnect, odd-group handling and reassignment are explicit and safely tested.
- [ ] Teacher may end conversation early and trigger a shared reflection; no unauthorized role reveal.
- [ ] Local export / reimport preserves all teaching material and supported options, but never includes identities, private room tokens or session answers.
- [ ] Printer output separates participant A and B cards; shared projector view displays no confidential facts.
- [ ] UI language may differ per learner only when the teacher permits it; all see unchanged German task material.
- [ ] Existing Memory flows, database, SPP Auth/Homework and deployments are unaffected absent separate owner-approved implementation scope.

## 11. Implementation order and boundaries

**First new-game candidate:** Conversation Cards can establish role-specific content delivery, teacher staging, print and portable JSON without adding field-level answer checking. Information Gap should follow, building its own completion and structured checking atop only those truly reusable foundations. Cross-game shared code must emerge from verified needs; don't force Memory's turn/scoring engine into either game. This is a planning-only contract, not authorization for Supabase DDL or any deployment.
