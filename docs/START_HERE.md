# Start Here — Learning Games

Read order:
1. `AGENTS.md` — guardrails.
2. `docs/CURRENT_STATE.md` — what has actually been built and verified.
3. `docs/SYSTEM_OVERVIEW.md` — app and backend boundaries.
4. `docs/GAME_CONTRACTS.md` — rules and API seams.
5. `docs/BACKEND_BASELINE.md` — current prototype authorization.
6. `docs/ROADMAP.md` and `docs/IMMEDIATE_NEXT_PROMPT.md` — staged future work.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
npm run typecheck
npm test
npm run build
```

Local Memory needs no environment settings. Online Memory uses the existing Supabase prototype RPCs; configure **only public** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never use secret/service-role keys. Do not confuse a local browser smoke test with hosted production validation.

## Goal

An independent game site usable from Canva presentations and directly from student devices, with a future optional SPP launch/results integration. Start with one high-quality Memory game, not a broad platform.
