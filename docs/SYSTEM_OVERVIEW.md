# System Overview

## Topology

```text
Canva presentation --link/QR--> Learning Games (standalone React app / future Vercel)
                                           |
                              games/memory, future game modules
                                           |
                               shared/classroom and shared/lib
                                           |
                              SPP Supabase (prototype RPCs only)
                                           |
                   private.game_poc_memory_rooms / players
```

Standalone local play needs no network. Online games authenticate using narrow per-room host/student capability tokens returned by the prototype RPC functions, **not** SPP Auth.

## Code ownership

- `src/app` contains routes and catalog.
- `src/games/registry.ts` declares published game entries.
- `src/games/memory/engine` contains local pure logic.
- `src/games/memory/components` owns Memory's visual board, scores and results.
- `src/games/memory/api` owns game RPC names/arguments.
- `src/games/memory/hooks` owns lifecycle, polling, and revision-sensitive state.
- `src/shared/classroom` owns generic invitation/identity UX; do **not** extract game-specific phase logic there.
- `src/shared/lib/supabase.ts` owns the single public Supabase client.
- `src/styles.css` provides the first design system.

## Architecture decisions

One monorepo-style single Vite app, not one separate app per game. One **folder** per game; never one enormous script. Shared contracts should remain small and grow from real cross-game requirements. Memory turns and live quiz simultaneous responses must have separate engines. No generic persistent result/history domain until SPP agrees an integration contract.

Future routes can be `/games/:gameId`, with per-game student join links (current Memory: `/games/memory/join?room=...`).
