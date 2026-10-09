# Current State — 2026-10-09

## Source work

- Repository: `ducrenevn/learning-games`.
- Production branch: `main`; documentation branch: `docs/m2-acceptance`.
- Architecture: Standalone Vite + React 19 + TypeScript + React Router app connecting to existing Supabase prototype RPCs via public client.
- Vercel production deployment is **LIVE & VERIFIED**. Continuous deployment from GitHub `main` verified.

## Verified Implementation & QA (2026-10-09)

1. **Local Memory (M1 Closed):**
   - Shuffled private card deck, custom vocabulary parsing, edge cases, and unit tests (20/20 PASS).
   - Hardened flip locking preventing rapid-click deadlock.
   - Clean finished state, restart ("Nochmal spielen"), and settings navigation.

2. **Hosted Multiplayer Acceptance (M2 Closed):**
   - Deployed at: `https://learning-games-rho.vercel.app/`
   - Tested in 3-participant topology: Host/Teacher (browser), Automated Student (`Test-Ben`, browser), and Real Physical Phone (`Phony`, iOS/Android mobile browser).
   - Real-world turn progression, automatic resolution (~1.8s) without "Weiter" button, match retention, points, and simultaneous game finish verified.
   - Live phone browser pull-to-refresh verified: capability recovered from `sessionStorage`, room and player identity maintained.

3. **Responsive & UI/UX Checks:**
   - 1440px down to 360px verified with zero horizontal overflow.
   - Clean touch target responsiveness confirmed on physical smartphone.
   - Platform observation: Unicode emojis render using device font (e.g. blue-accented football on desktop vs. black/white on mobile).
   - UX suggestion logged: Color-coding matched pairs by player to visually distinguish who won each card.

4. **Automated Verification:**
   - `npm audit`: 0 vulnerabilities.
   - `npm run typecheck`: PASS.
   - `npm test`: 20/20 PASS.
   - `npm run build`: PASS.

## Next Milestones

- **M3 (Multiplayer Polish & Hardening):**
  - Implement player color-coding for claimed/matched cards.
  - Evaluate anonymous room abuse protections and rate limiting.
  - Measure RPC load under multi-room scenarios.
