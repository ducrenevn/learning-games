# Current State — 2026-10-08

## Source work

- Repository: `ducrenevn/learning-games`.
- Initial bootstrap in `main`: README only at `5ae5435caa5faf028088c9af796b4251ca635469`.
- Development branch: `feat/memory-foundation`. This branch contains the first modular React + TypeScript + Vite port and documentation.
- No Vercel deployment, hosted migration, SPP integration, or authenticated learner flows have been authorized or executed by this work.

## Implemented in source (not yet live-verified)

- Game registry and a Memory entry.
- Local Memory pair editor, shuffled board, local scoring and automatic turn changes.
- Online Memory create/join/lobby/host-start/card flip/auto-resolution/results with existing Supabase RPC names.
- Room-code deep links and QR generated from the hosted URL.
- Server-state polling (1s active, 2s lobby) and revision gating.
- Unit tests for pair parsing, deck construction and links.
- Documentation and an `.env.example` (no live secrets).

## Known gaps / cautions

- This is an **initial port**, not verified parity with the latest published Canva version. Browser QA, two-client race tests, refresh/reconnect UX, teacher recovery, responsive layout and completion flow still need proof.
- Uses sessionStorage for bearer game capability; a refreshed tab can recover within the same session, but new devices need a new join. Leaving removes the local capability, not server membership.
- `game_poc_memory_join` accepts anonymous guests only while lobby is open. Rooms expire; no permanence/result linkage.
- One hosted response revision may be unchanged while another client UI rerenders; rely on the server for authority.
- No Realtime WebSockets: the original Canva experiment had channel errors. Polling remains initial parity baseline.
- Don't claim `npm` test/build verified until a connected runner completes them.

## External baseline

Original Canva Code HTML was user-supplied on 2026-10-08 and remains a working reference. Its monolithic exported HTML includes vendor/bootstrap scripts that are not part of this port.
