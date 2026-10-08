# Roadmap

## M0 — Clean foundation (in progress)
- Runnable Vite React TypeScript app, modular Memory port, docs, local build/typecheck/unit tests.
- Preserve Canva original; no Vercel deployment or DB change.
- **Closure requires runner evidence** for build/tests and review of exported code parity.

## M1 — Memory parity
- Local game mechanics and online create/join/lobby/start/turns/auto-next/score/end.
- Desktop/mobile and two-browser + refresh/disconnect/race QA.
- Correct live bugs with small focused changes; keep original backend intact.

## M2 — Vercel
- Public env only, GitHub preview build, canonical game URL, QR route, hosted phone smoke.
- Define deploy / rollback path and error observability.

## M3 — Improve multiplayer
- Measure latency and state-transport errors. Consider Realtime Broadcast or more efficient polling after baseline performance measurement.
- Harden abuse protection, rate limiting and capabilities before real learners.

## M4 — Cross-game shared content
- Vocab set creation/import/versions; game-specific content adapters.
- Add first additional game only when Memory parity is stable.

## M5 — Optional SPP integration
- Explicit teacher launch/results contract; owner approval before sharing learner identity, Homework attempt state, or exposing private learner information.
