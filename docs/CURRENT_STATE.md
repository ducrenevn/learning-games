# Current State — 2026-10-09

## Source work

- Repository: `ducrenevn/learning-games`.
- Production branch: `main` (M1 merged through PR #1); prior implementation branch: `feat/memory-foundation`.
- Architecture: Standalone Vite + React 19 + TypeScript + React Router app connecting to existing Supabase prototype RPCs via public client.
- Vercel first production deployment is READY; hosted gameplay/phone smoke pending. No hosted DB migration, SPP table changes, or authenticated learner flows have been executed.

## Verified Implementation & QA (2026-10-09)

1. **Local Memory:**
   - Custom vocabulary editor, example loader, empty/invalid format validations, and line error reporting verified.
   - Shuffled private card deck generation verified.
   - Click handling hardened: rapid burst clicks safely guarded against deadlock or >2 card picks.
   - Mismatch correctly displays terracotta feedback banner (`#b9664e`) for ~1.8s, flips cards back, and advances turn.
   - Match adds 1 point, retains turn, and marks pair permanently revealed.
   - Finished state: Victory celebration screen with winner announcement, points leaderboard, direct "Nochmal spielen" restart, and "Einstellungen" setup return.
   - Active gameplay hides the vocabulary editor to prevent cheating and expands to full `play-layout`.

2. **Online Multiplayer (Real 3-Browser Context Testing):**
   - Verified across three concurrent isolated contexts: Browser A (Teacher/Host), Browser B (Student 1 / Anna), Browser C (Student 2 / Ben).
   - Host room creation (`game_poc_memory_create`) generates 6-character room code.
   - QR code and join link render; link contains `?room=...` without exposing private capability tokens.
   - Students join independently (`game_poc_memory_join`); appear in host lobby via 2s polling.
   - Host starts game; transitions all 3 browsers simultaneously to gameplay.
   - Strict turn synchronization: only active player can flip; non-active players and host cards are disabled.
   - Mutual score synchronization and automatic resolution verified across all clients.
   - Completion: Final match transitions all clients to results screen (`MemoryResults`).
   - Browser refresh: `sessionStorage` token recovery restores active room and player role without state corruption.
   - Host skip and recovery fallback buttons operational and properly phase-guarded.
   - Nonexistent room code correctly produces descriptive alert feedback.

3. **Responsive & UI/UX Checks:**
   - Verified at 1440px (Desktop), 1024px (Laptop), 768px (Tablet), 390px (Mobile), and 360px (Small Mobile).
   - Zero horizontal overflow across all tested pages and viewports.
   - Long German compound words (e.g. `Donaudampfschifffahrt`) and long names wrap cleanly without clipping.
   - High card contrast maintained on revealed cards and disabled front buttons.
   - Consistent typography: Fraunces serif headings, Work Sans body, terracotta and forest-green accents.
   - Choice cards on MemoryHome rendered without underline artifacts; back links styled uniformly.

4. **Automated Verification Results (reproduced locally):**
   - `npm audit`: **0 vulnerabilities**.
   - `npm audit --omit=dev`: **0 vulnerabilities**.
   - `npm run typecheck`: **PASS** (0 errors).
   - `npm test`: **PASS** (20 of 20 unit tests, Vitest 4.1.11).
   - `npm run build`: **PASS** (Vite 6.4.4, bundle emitted in `dist/`).
   - SPA route rewrites: `vercel.json` verified present.

## Initial Vercel deployment — 2026-10-09

- GitHub PR #1 merged `feat/memory-foundation` into `main`: merge commit `498742c3d761e8366e33be6deb10d286e3dcc5a4`.
- Vercel project `learning-games` created under team `ducrene's projects`; project ID `prj_QmqtNMpIys26I5ma6jikz6EE3lKq`.
- First **production** deployment from `main@498742c` is **READY**: deployment `dpl_ByT5UZYrEC4ZHZSyCDLf6vTWhgjj`.
- Production alias: https://learning-games-rho.vercel.app/
- Framework Vite; install `npm ci`; build `npm run build`; output `dist`; Node 24.x selected by Vercel.
- Vercel production + preview env keys `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` configured (publishable only; values omitted in docs).
- Deployment protection set to `preview` only: production public, preview protected.
- Vercel's linked-project inspection on 2026-10-09 **confirmed the GitHub connection** to `ducrenevn/learning-games`. The first deployment was explicitly created from GitHub `main`. This documentation-only commit is intended to verify whether future pushes trigger builds automatically; deployment observation is pending.
- **Hosted browser and phone multiplayer smoke remains unverified.** Vercel READY verifies build/deployment, not application behavior. Do not call M2 fully closed until host/phone checks pass.
- Speak Practice Pro application, project and Supabase schema untouched.

## Remaining Considerations for Future Milestones

- **Prototype Capabilities vs. Auth (M3 / M5):** Prototype bearer tokens in `sessionStorage` are suitable for a limited pilot with synthetic identities. Production classroom use with permanent records requires formal SPP Auth integration.
- **Anonymous Room Creation:** No rate limiting or captcha on public room creation. Acceptable for limited pilot; needs abuse guards before open release.
- **Realtime Migration (M3):** Polling at 1 Hz (paused on inactive tab) is sufficient for initial pilot; Realtime Broadcast is planned for post-baseline evaluation.

## Verdict

**GO — Limited pilot ready.** See detailed audit log in `docs/audits/2026-10-09-m1-qa-report.md`.
