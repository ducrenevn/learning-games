# Learning Games

A modular, independent classroom-games web app. **Memory-Spiel** is the first game; future formats may include live quizzes, flashcards and other interactive activities.

## Get started

- Node.js 20.19+ or 22+
- `npm install`
- `npm run dev`
- Local Memory works without any backend.
- For online Memory, copy `.env.example` to `.env.local` and configure the **public** SPP Supabase URL and publishable key. Never use a service-role or secret key.

`npm run typecheck`, `npm test`, and `npm run build` are intended checks. **Live multiplayer and Vercel are not yet verified.**

Read `AGENTS.md` → `docs/START_HERE.md` → `docs/CURRENT_STATE.md` before changes. The source of the original Canva prototype is preserved outside this repository; this port is independent of that published version.
