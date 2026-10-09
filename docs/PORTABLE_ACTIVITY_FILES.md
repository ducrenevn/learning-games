# Portable, AI-Authorable Activity Files — Proposed Standard

**Status:** Agreed product requirement, technical **proposal** dated 2026-10-09. The JSON fields and sample below are **illustrative, not yet an implemented or finalized import schema**. No application, database, or existing Memory input format is changed by this document.

## Central requirement

**An activity is portable content owned by the teacher**, not a room, account record, or cloud-only object. A teacher can ask an external AI to generate an activity, save the file on their computer, import it whenever needed, preview/edit/play it, export the edited version, and reimport it without content loss.

Planned filename convention:

- `quick-response_how-do-you-feel-today.json`
- `information-gap_booking-an-appointment.json`
- `conversation-cards_at-the-doctor.json`
- `language-detective_customer-service.json`

Use lowercase stable activity-type prefix, underscore, descriptive kebab-case topic, and extension; filenames help organization but **content is authoritative**. Keep paths portable; no machine-specific absolute links.

## File roles and stages

| Format | Role | Initial decision |
| --- | --- | --- |
| **JSON** (`.json`) | Canonical machine-validated activity exchange and round-trip import/export | **Required for every future new game** |
| **Markdown** (`.md`) | Human/AI-readable game authoring specification, examples, instructions and prompts | **Required documentation per activity type** |
| Markdown *as an activity input* | Optional user-facing authoring format that could be parsed into the canonical model | **Investigate later; not a v1 guarantee** |
| ZIP/bundled collection | Self-contained media assets or multi-activity lessons | **Later; not part of the initial contract** |

An external AI needs **no access** to Supabase, SPP, teacher accounts, or this application's runtime. It receives the relevant game-specific specification and returns structured task content. The initial product does **not** require built-in AI generation or a paid AI service.

## Proposed JSON envelope (for discussion; not an executable contract yet)

```json
{
  "format": "learning-games.activity",
  "schemaVersion": 1,
  "activityType": "quick-response",
  "id": "how-do-you-feel-today",
  "title": "Wie fühlst du dich heute?",
  "targetLanguage": "de",
  "cefrLevel": "A1",
  "topics": ["wellbeing", "daily-life"],
  "skills": ["speaking", "writing"],
  "estimatedMinutes": 5,
  "instructions": "Antworte in ein oder zwei Sätzen.",
  "content": {
    "prompts": [
      {
        "id": "q1",
        "text": "Wie fühlst du dich heute?",
        "responseMode": "short-text"
      },
      {
        "id": "q2",
        "text": "Warum fühlst du dich so?",
        "responseMode": "short-text"
      }
    ]
  },
  "defaults": {
    "revealMode": "teacher-controlled",
    "timeLimitSeconds": null
  }
}
```

The final contract must decide field names, enums, size limits, optional values, schema version migration behavior, and game-specific payload validation **before import/export is implemented**. `activityType` dispatches a game-specific content validator/renderer; it must **not** force different games to share turn models, scoring, or session phases.

### Content versus runtime

**In portable activity files:** prompts, instructions, answer keys where objective, materials and labels, optional CEFR/topic/skill metadata, game-appropriate default options, and clear target-language definition.

**Out of portable activity files:** room codes, invite links, capability tokens, student names, student responses, results, grading histories, auth identities, personally identifiable learner data, live session progress, and production DB identifiers. Teacher's selected room interface-language policy belongs to the **session settings**, not the learning target-language content.

Open-ended speaking/writing activities should support teacher-led evaluation rather than inventing an automatic correct answer. Store no live/student-generated answers in the activity export.

## Per-game AI authoring guides

Future game modules should ship a human-readable spec, for example `docs/activity-specs/GAME_SPEC_quick-response.md` (path is a proposed convention, **file does not exist yet**). Each spec should include:

1. Purpose, suitable adult-learning outcomes, and example classroom flow.
2. Required and optional fields; precise schema (once finalized), accepted enums and limits.
3. Target language, instructions, and interface-localization rules.
4. Teacher controls, response/evaluation mechanics, secrecy requirements, and supported modes.
5. One minimal valid example and one richer example, plus invalid-example guidance.
6. A reusable AI prompt: generate **only valid JSON** matching the spec (no Markdown fences), and advise the teacher to review content.
7. Version identifier and compatibility/migration policy.

**Example AI request:** "Using GAME_SPEC_quick-response.md, produce a German A2 quick-response exercise on visiting a doctor: eight progressively harder prompts, mostly short free-text answers. Return one valid JSON activity file." The game validates the AI output; it never blindly trusts it.

## Teacher-facing handling

**Import:** select local file → check extension and size → parse JSON → validate envelope/schema version → route by `activityType` to game-specific rules → show actionable, field-level errors (for example, 'prompts[2].text is missing') → preview and allow edits **before launching a room**.

**Export:** produce a normalized, valid JSON file including content edits, version and metadata, offered as a browser download with the naming convention above. No remote persistence is necessary for export. The app cannot silently guarantee a file is permanently saved to a chosen local folder; the browser/user controls downloads.

**Reimport:** the exported file must reopen consistently, with equivalent prompts, instructions, optional fields and game-specific settings. Authoring UI must preserve data it does not understand **only if safe/version-compatible**; otherwise explicitly reject rather than silently discard.

**No-server/local mode:** reading/editing/exporting files should work without an SPP account. A local game should run offline when its mechanics and assets allow it. Online synchronized rooms still require the appropriate live backend.

## Security, privacy, and reliability guardrails

- Treat generated/uploaded activity content as **untrusted data**. Parse as data only; no executable JS, HTML event handlers, arbitrary plugin hooks or runtime-supplied code.
- Escape/sanitize any rich text before rendering. Cap file size, text length, item counts, and nesting; prevent browser freezes from malformed input.
- Do not auto-fetch unknown remote media URLs or embed secret tokens in content or exported files.
- If bundled media is added later: constrain MIME types, archive paths, file sizes, origins, and licensing; do not depend on hidden absolute filesystem paths.
- No learner results or personal information in templates or exported content. Keep SPP Auth, Homework, production database and permanent records separate until explicitly approved.
- Version files explicitly and publish migrations/rejection behavior for old versions; schema upgrade should never silently corrupt content.
- Preserve clear separation between target-language exercise content and localized application UI. Room policies: one common UI language or learner-selectable UI language; no student login needed merely to choose it.

## Suggested future tests (none are claimed to exist today)

- Valid externally created JSON loads, can be edited, exported and reimported with equivalent content.
- Missing keys, unknown activity type, unsupported schema version, invalid enum, oversized text/file and malformed JSON yield specific errors.
- Malicious HTML/script is rendered harmlessly; neither import nor preview executes content as code.
- Both languages in a room can view their **own interface localization** without changing the shared target-language prompts.
- Secret role cards remain visible only to their intended participants in live games.
- A complete offline/local exercise works with no cloud connection **when the particular game promises offline play**.
- Existing Memory text import, local gameplay, RPCs, Vercel deployment, and SPP application remain unchanged unless a separate implementation plan is approved.

## Future collections (not v1)

A teaching sequence could be named `lesson_hotel-complaints.json` and contain multiple steps (sorting, listening, role-play, reflection), but must be portable **without unresolved external room IDs or filesystem paths**. A manifest plus bundled content is more reliable than references to temporary sessions. Do not implement this until individual activities prove import/export and reuse.

## Relationship to current milestones

[ROADMAP.md](ROADMAP.md) currently prioritizes Memory/Vercel (M2), multiplayer hardening (M3), then cross-game content (M4). This file elaborates the **future M4 content requirement**; it does not reprioritize or authorize any runtime work, deploy, migration, or SPP integration. Existing [GAME_CONTRACTS.md](GAME_CONTRACTS.md) remains authoritative for Memory's present `LEFT | RIGHT | OPTIONAL_CATEGORY` input.
