# Games and Content Contracts — v0

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
