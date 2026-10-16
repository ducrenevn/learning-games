# Learning Games

A standalone, adult-appropriate classroom learning toolkit. Memory is the first playable game, including local and hosted guest multiplayer; future games remain separately planned.

## Find your way
- [Start Here](docs/START_HERE.md) — short, role-specific agent reading paths
- [Game Map](docs/GAME_MAP.md) — what is playable, planned or only proposed
- [Game specifications](docs/games/) — mechanics and per-game contracts
- [Architecture](docs/architecture/) — system, database boundaries, and portable activity format
- [Teaching library](library/README.md) — learning applications and future real JSON resources
- [Current State](docs/CURRENT_STATE.md) · [Roadmap](docs/ROADMAP.md)

## Local development
Node 20.19+; run `npm install`, `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`. Local Memory requires no credentials. Online Memory uses only public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; never browser-expose secret/service-role keys.

Read [AGENTS.md](AGENTS.md) for authorization. Sort LG-A1 is planning only; library files are not automatically bundled into the live app.
