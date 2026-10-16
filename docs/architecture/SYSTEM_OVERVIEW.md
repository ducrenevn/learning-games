# System Overview

**Current architecture (2026-10-16):** all four independent local games are implemented and accepted on Preview at candidate `8c14b845ee4ed7892a224e9e336852255612362f`. Online Memory uses the legacy `game_poc_memory_*` RPC family; Sort Individual uses `lg_v1_create`, `lg_v1_join`, `lg_v1_state` and `lg_v1_command`. Both use shared SPP Supabase with room capabilities, without SPP Auth. Three Learning Games migrations including reveal lifecycle are installed per owner handoff. Production merge is pending. [Current release state](../CURRENT_STATE.md) and [preflight risks](../RELEASE_PREFLIGHT.md) supersede older planning status.

## Topology

```text
Canva presentation --link/QR--> Learning Games (standalone React app / deployed Vercel)
                                           |
                           memory / sort / sequence / language-detective
                                           |
                               shared/classroom and shared/lib
                                           |
                           SPP Supabase (Memory + Sort Individual RPCs)
                                           |
                  private.game_poc_memory_rooms / players; lg_v1 tables
```

Standalone local play needs no network. Online games authorize using per-room host/student bearer capabilities, **not** SPP Auth. Memory returns capabilities from its RPCs; Sort creates them client-side and stores the successful room identity in sessionStorage. Clearing a host capability loses control of that session; the preflight adds confirmation before explicitly leaving an unfinished Sort host room.

## Code ownership

- `src/app` contains routes and catalog.
- `src/games/registry.ts` declares published game entries.
- `src/games/memory/engine` contains local pure logic.
- `src/games/memory/components` owns Memory's visual board, scores and results.
- `src/games/memory/api` owns game RPC names/arguments.
- `src/games/memory/hooks` owns lifecycle, polling, and revision-sensitive state.
- `src/games/sort/online` owns Sort Individual RPCs, actor-safe parsing, capability storage, polling and classroom UI. Sequence and Detective remain local-only.
- `src/shared/classroom` owns generic invitation/identity UX; do **not** extract game-specific phase logic there.
- `src/shared/lib/supabase.ts` owns the single public Supabase client.
- `src/styles.css` provides the first design system.

## Architecture decisions

One monorepo-style single Vite app, not one separate app per game. One **folder** per game; never one enormous script. Shared contracts should remain small and grow from real cross-game requirements. Memory turns and live quiz simultaneous responses must have separate engines. No generic persistent result/history domain until SPP agrees an integration contract.

The four local game routes and Memory/Sort join/room routes are defined in `src/app/App.tsx`. Invitation URLs carry only the room code: `/games/memory/join?room=...` or `/games/sort/join?room=...`, never a host/student bearer token. Vercel rewrites deep links to `index.html`; Vite builds static files in `dist`. There is no application Node server at request time. Online state uses polling; this release does not establish Realtime or SPP learning-record integration.

## Documentation and teaching-content boundaries
- `src/` owns application implementation.
- `docs/architecture/` owns cross-game architecture; `docs/games/` owns game-specific mechanics and content contracts.
- `library/` owns teaching applications and eventual reusable JSON activity files; the latter are not automatically published in the app.
- [Game Map](../GAME_MAP.md) provides an agent-friendly index.
