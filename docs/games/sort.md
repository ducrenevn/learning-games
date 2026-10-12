# LG-A1 — Sort (categorization)
**PLANNING v0.1 · NOT approved for implementation · 2026-10-12.** Teacher-directed generic categorization; **not a German grammar engine**. German articles/cases are possible [pedagogical applications](../../library/sort/README.md), not built-in exercises.

## What Sort does
The teacher defines named categories and text cards (words, phrases or sentences), each with **one correct category**. The learner assigns each card; no built-in knowledge of grammar, case, vocabulary or level. Ordering/Sequence is a separate deferred mechanic. Historical umbrella slug `sort-sequence` is not a finalized portable file type.

## Proposed teacher flow
Select Sort → manually author or import local JSON → validate with field-level messages → preview/edit categories, items and answers → local play/projector view → export edited JSON → reimport without loss. No account, remote persistence, or backend needed. Browser file download does not guarantee autosave.

## Proposed student flow
Shuffled unplaced cards. Choose a card and place it in a category, with pointer/touch/keyboard; **select-then-place must work without drag**. Allow moving placed cards. Explicit Check reveals correct/incorrect indicators (not color alone), summary and optional teacher-authored explanations; Retry and Reset. No compulsory timer/leaderboard or automatic language assessment. Do not intentionally show answer key before checking (local browser cannot offer strict answer secrecy).

## Candidate portable schema — explicitly NOT final
Envelope could use `format`, `schemaVersion`, `activityType`, `id`, `title`, `targetLanguage`, `instructions` and `content`. Candidate `activityType: "sort"`, `content.mode: "categorize"`, `categories: [{id,label}]`, `items: [{id,text,categoryId,context?,explanation?}]`.
**Provisional guardrails:** 2–5 categories, 4–30 items, 128 KiB maximum JSON; unique IDs, resolvable category references and one correct category per card. These numbers, field names, slug, enum behavior and version strategy all require owner signoff. Treat files as untrusted data; reject/neutralize scripts, unsupported schema versions, unknown unsafe material and excessive text/nesting. Never export learner names, responses, room codes, tokens or session state.

## Initial modes
- **Include:** teacher local author/import/edit/preview/export, local play, projector/in-person use on one device.
- **Defer:** online rooms and synchronized student devices (separate hosted/Supabase RPC approval), printable worksheets, sequencing/order.
- UI chrome/error messages DE/EN/VI; authored learning content stays unchanged. Reuse M3a localization only after its separate PR #10 release gate.

## Tests needed AFTER implementation approval
Import/validate/edit/preview/play/check/retry/export/reimport; malformed and oversized files, mismatched versions, duplicate IDs and broken assignments; inert markup, accessible mouse/touch/keyboard, 360/390px/mobile/tablet/desktop, DE/EN/VI UI, original content unchanged, Memory regression. No new hosted SQL or SPP Auth/Homework changes.

## Before coding — owner decisions
Finalize canonical type/envelope/schema and caps, unknown-field handling, teacher editor UX and unsaved changes, student feedback/reveal and drag behavior, local projection UX, acceptance fixtures. **This file does not authorize runtime implementation or a production deployment.**
