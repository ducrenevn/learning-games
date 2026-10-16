# Learning Games

A standalone, adult-appropriate, multilingual classroom learning-game toolkit. **V1 is live in Production** (released 2026-10-16): Memory, Was passt wohin?, Der Reihe nach and Auf Fehlersuche, with guest online rooms for Memory Turns and Sort Individual.

**[Open Learning Games](https://learning-games-rho.vercel.app)** · [V1 release closure](docs/releases/2026-10-16-v1-production.md) · [Current state](docs/CURRENT_STATE.md)

## Find your way

- **[Start Here](docs/START_HERE.md):** authoritative entrypoint and role-specific reading paths.
- **[Game Map](docs/GAME_MAP.md):** what is available locally, online, or only planned, with DE/EN/VI product names.
- **[Release closure](docs/releases/2026-10-16-v1-production.md):** exact release SHAs, accepted evidence, architecture, known limitations, rollback and handoff.
- **[Game specifications](docs/games/)** and **[architecture](docs/architecture/):** mechanics, backend contracts and portable activity JSON.
- **[Teaching library](library/README.md)** and **[Product Catalog](docs/PRODUCT_CATALOG.md):** lesson ideas and candidate future games.
- **[Roadmap](docs/ROADMAP.md)** and **[historical preflight risk register](docs/RELEASE_PREFLIGHT.md)**.

## Local development

Node 20.19+ (Vercel project configured for Node 24.x during release). Run `npm install`, `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`; on Windows PowerShell use `npm.cmd` where the `npm.ps1` shim is blocked.

Local games do not need Supabase. Hosted Memory and Sort Individual use only public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. **Never expose service-role keys or room capabilities.** See [AGENTS.md](AGENTS.md) for boundaries. Learning Games shares the SPP Supabase project; any hosted database work needs separate approval.

**Next phase:** use v1 in lessons, gather feedback, then design the next game(s). The completed v1 release is not a pending implementation task.
