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

## M2 — Vercel & hosted multiplayer acceptance (COMPLETED 2026-10-09)
- Connected GitHub repo (`ducrenevn/learning-games`) to Vercel production deployment (`https://learning-games-rho.vercel.app/`).
- Configured public environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
- Automatic GitHub-to-Vercel CI/CD verified from `main`.
- SPA deep linking verified via `vercel.json` rewrites.
- 3-participant live hosted acceptance test executed (Host desktop, Automated student desktop, and Owner on real mobile phone).
- QR code generation, room join, turns, auto-advance, matching, phone refresh recovery, and victory screen verified.
- Audit report completed in `docs/audits/2026-10-09-m2-hosted-acceptance.md`.

## M3 — Multiplayer polish & abuse hardening (NEXT)
- Implement per-player color coding for matched/claimed pairs (owner UX recommendation).
- Document and evaluate cross-platform emoji font rendering quirks.
- Measure latency and state-transport performance under varying network conditions.
- Evaluate Supabase Realtime Broadcast vs. polling.
- Harden anonymous room creation (rate limiting, captcha, room pruning, timeout cleanup) before broad public classroom rollout.

## M4 — Cross-game shared content
- Vocab set creation/import/versions; game-specific content adapters.
- Add first additional game module once Memory is stable on Vercel.

## M5 — Optional SPP integration
- Explicit teacher launch/results contract; owner approval before sharing learner identity or homework attempt state.
