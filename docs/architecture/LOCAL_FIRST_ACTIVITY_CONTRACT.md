# Wave F — Local-first activity contract
**Decision recorded 2026-10-12. Implementation authorized for LG-A1 Sort, LG-A2 Sequence and LG-A3 Language Detective in a NEW development branch.** This documentation PR does not contain game code or authorize merging/deploying to production.

## Architecture decision
Teacher-first, local-first, multiplayer-ready. Stage 1 has **Presentation Mode** (teacher-operated projected/shared screen) and **Independent Mode** (one student plays on their own browser without interacting with other users). These modes reuse the same activity file and game-specific rules. Students can each import an activity JSON or open a separately, statically published activity; a teacher's unsaved browser file cannot automatically be distributed to others. The existing Memory online RPCs are **not** a generic game synchronization service.

**Stage 2, separately gated:** networked rooms, shared turns, individual submissions, per-student private roles and reconnect. Do not implement online synchronization, new Supabase RPCs, DDL, hosted storage, SPP/Auth/Homework changes, student accounts, result collection or in-app AI in Wave F.

## Presentation vs Independent
| Behavior | Presentation | Independent |
| --- | --- | --- |
| One browser/device owns game state | Yes | Yes, per student |
| Teacher-visible prompt and large projection-friendly layout | Required | Responsive individual layout |
| Placing, ordering or selecting content | Teacher/students at shared screen | Student on own screen |
| Check / explain / reveal | Explicit teacher controls; initially hidden | Student may check and retry |
| Progress, answers, scores | Local to browser; not collected | Local to browser; not collected |
| Shared turns/QR room, host/student identities | Not in scope | Not in scope |

A local teacher might manually invite someone to take a turn at the shared device. This is NOT networked turn scheduling.

## Reusable content contract — v1 implementation baseline
```json
{
  "format": "learning-games.activity",
  "schemaVersion": 1,
  "activityType": "sort",
  "id": "example-activity",
  "title": "Example",
  "targetLanguage": "de",
  "instructions": "Ordne die Begriffe zu.",
  "content": {}
}
```
- `format` exact string; `schemaVersion` integer `1`; `activityType` is one of `sort`, `sequence`, `language-detective` in Wave F. Each game's own `content` validator is authoritative.
- Required `id` is a stable descriptive slug (1–64 characters; lowercase ASCII alphanumerics with internal hyphens); `title` is 1–120 characters; `targetLanguage` is a valid short BCP-47-like language tag (e.g. `de`, `vi`, `en`, `de-DE`), not restricted to the three interface locales; `instructions` is 1–2,000 characters.
- 128 KiB **UTF-8 file bytes** maximum; strictly finite strings/arrays; no executable markup, script behavior, remote asset fetching or prototype pollution. Render teacher text as inert content.
- Unknown envelope/content properties: **reject with helpful validation errors in v1**, rather than silently stripping and losing them on export. Later versions require deliberate adapters/migrations.
- No session/player/room state, scores, answers submitted by students, identity, secret, capability or persistent attempt data in an exported file.
- Import → validate → edit → preview/play → export → reimport must preserve the approved content/metadata. Runtime shuffled order and learner attempts are never serialized into the canonical file.
- Reuse one **small** shared portable-file import/export mechanism. Keep `src/games/<game>/` validators, content editing and pure gameplay rules separate. Extract common editor UI only after demonstrated reuse; do not create a universal gameplay engine.
- Good default UX: local `Create`, `Import`, `Preview`, `Present`, `Practice`, `Export` actions. Clear save/download affordances and unsaved-edit warning. No implied cloud autosave.
- DE/EN/VI interface labels, errors, onboarding and feedback. Teacher-authored target-language content is NEVER automatically translated when interface locale changes.
- Sort, Sequence and Language Detective v1 are text-first; avoid file-hosting dependencies. Public bundled images/audio in later activities do not intrinsically require backend, but are out of Wave F.

## Testing / acceptance
- Per-game schema tests (negative inputs, oversize, duplicate IDs, unknown fields, unsupported versions, Unicode, safety) and deterministic pure-engine tests.
- Full local authoring, editing, preview, Presentation Mode, Independent Mode, check/review/retry, download/reimport flows; no false machine grading of open text.
- Keyboard-only with visible focus and no drag requirement; pointer, touch and screen-reader semantics; desktop/tablet, 390 and 360 px without horizontal overflow; DE/EN/VI strings and invariant authored text.
- Memory regression tests, TypeScript typecheck, unit tests, production build. No silent edits to Memory, SPP or live services.
- Sonnet independent review/fix **after all three implementations**, then owner manual/teacher acceptance; no merge/deployment before approval.

## M3a branch boundary
At the documentation baseline, Memory localization [PR #10](https://github.com/ducrenevn/learning-games/pull/10) remains draft/unmerged. Before coding, check its live state. Prefer reuse of M3a i18n after authorized merge; if still unmerged, isolate locale logic for new games and document the later reconciliation. **Do not silently merge/cherry-pick PR #10 or refactor Memory.**

## Working phases
1. LG-A1 Sort establishes content/authoring/local-play path.
2. LG-A2 Sequence reuses that proven content plumbing but has its own ordering engine.
3. LG-A3 Language Detective adds reviewable text-error analysis, not speculative automatic grammar correction.
4. Run integrated regression and prepare Sonnet review packet (diff, test evidence, limitations). Stop for the owner's Sonnet and hands-on gates.

Keep commits and acceptance evidence separated per game even if the user wants one end-to-end development wave. No push to production-linked refs.
