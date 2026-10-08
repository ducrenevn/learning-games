# Roadmap

## M0 — Clean foundation (COMPLETED)
- Runnable Vite React TypeScript app, modular Memory port, docs, local build/typecheck/unit tests.
- Audited lockfile, 0 dependency vulnerabilities.
- Verified local build, typecheck, and tests.

## M1 — Memory parity & QA (COMPLETED 2026-10-09)
- Local game mechanics and full online create/join/lobby/start/turns/auto-next/score/end flow verified.
- 3-browser context testing (Host, Student 1, Student 2) against live Supabase prototype RPCs.
- Refresh, reconnect, host skip/recovery, and invalid room handling verified.
- Fixed rapid-click deadlock bug, terracotta mismatch styling, cheat sheet exposure, and finished victory screen.
- Responsive layout verified at 1440px, 1024px, 768px, 390px, and 360px with zero horizontal overflow.
- 20 / 20 unit tests passing; audit report completed in `docs/audits/2026-10-09-m1-qa-report.md`.

## M2 — Vercel (NEXT)
- Connect GitHub repo (`ducrenevn/learning-games`) to Vercel.
- Configure public environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
- Deploy preview / production build.
- Hosted phone smoke test via QR code scan.
- Define deploy / rollback path and error observability.

## M3 — Improve multiplayer & harden abuse
- Measure latency and state-transport errors under live traffic.
- Evaluate Supabase Realtime Broadcast vs. polling.
- Harden anonymous room creation (rate limiting, captcha, room pruning) before open public rollout.

## M4 — Cross-game shared content
- Vocab set creation/import/versions; game-specific content adapters.
- Add first additional game module once Memory is stable on Vercel.

## M5 — Optional SPP integration
- Explicit teacher launch/results contract; owner approval before sharing learner identity or homework attempt state.
