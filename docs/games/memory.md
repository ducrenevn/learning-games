# Memory — Gameplay and Content Contracts (v0)

## Memory vocabulary

Editable text format: `LEFT | RIGHT | OPTIONAL_CATEGORY`, one pair per line. Nonblank left/right text (max 80 characters) and 2–16 pairs per online session, matching the existing RPC validation. Parsed internal model:

```ts
type MemoryPair = { left: string; right: string; category?: string };
```

The `category` helps future content filters; current server receives only `left`/`right`.

## Multiplayer room

- Teacher creates a Memory session with a list of pairs; server issues a six-character `roomCode` and secret `hostToken`.
- Students join with room code/name; server issues individual private `playerToken`.
- QR/link contains only a room code, never credentials.
- Teacher starts after at least one student joins.
- Server authoritative card shuffling, phase, current player, matches, scoring and revision.
- Public card projection does not reveal hidden values. Client updates are only accepted if revision is not stale.
- On mismatch: brief feedback; next player. On match: +1 point, same player again. Finish once all pairs matched.
- Server API is currently public `game_poc_memory_create`, `join`, `state`, `start`, `flip`, `next`, `skip`. No schema change in this port.

## Future games

Live Quiz (timed simultaneous answers), Flashcards (solo review), Matching (other mechanics) can reuse launcher, input components and room links; **never** assume they share Memory phases, score rules, or persistence.

## Portable Memory v1 and guided teacher workspace (draft review, 2026-10-12)

The isolated Memory-unification branch adds the same entry → create/import → guided editor → review → separate gameplay flow as Sort/Sequence/Language Detective. Memory also offers its existing **Join game** route and online room creation from the review step, but neither entry/import/export nor local play makes hosted requests.

The portable teacher-only file envelope uses `format: "learning-games.activity"`, `schemaVersion: 1` and `activityType: "memory"` with standard `id`, `title`, `targetLanguage`, `instructions`, plus `content.pairs` of 1–16 entries. Each entry is `{ "id": "pair-1", "left": "Haus", "right": "house", "category": "Nomen" }` (category optional). IDs are unique lowercase slugs; nonblank sides <=80 chars and category <=80 chars. Duplicate indistinguishable pair text is rejected. Strict shared import validation rejects unknown fields, markup, controls, future schema versions and data >128 KiB. Zero room codes, tokens, player identifiers, turns, scores or results can be imported/exported.

Local Memory accepts one pair; online rooms retain the 2–16 pair requirement before calling the **unchanged** `game_poc_memory_create` RPC. `MemoryPair[]` conversion preserves text and optional category (the existing RPC already sends left/right only). Teacher bulk paste remains a supported advanced option; Memory's local engine, card board, room join and online room/host logic stay separate.

Reconcile PR #10 M3a localization in a later explicit integration pass. This change does not merge PR #10 or change backend language policy. Run Antigravity four-game import corpus and UI regression before owner release decision.
