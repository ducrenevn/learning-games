# Current State — 2026-10-08

## Source work

- Repository: `ducrenevn/learning-games`.
- Initial bootstrap in `main`: README only at `5ae5435caa5faf028088c9af796b4251ca635469`.
- Development branch: `feat/memory-foundation`; initial modular port and canonical docs committed at `3a6e9bd095a3e6a0963491cf92786f100c8768d3`.
- No Vercel deployment, hosted migration, SPP integration, or authenticated learner flows have been authorized or executed by this work.

## Implemented in source (browser behavior not yet verified)

- Game registry and a Memory entry.
- Local Memory pair editor, shuffled board, local scoring and automatic turn changes.
- Online Memory create/join/lobby/host-start/card flip/auto-resolution/results using existing Supabase RPC names.
- Room-code deep links and QR generated from the hosted URL.
- Server-state polling (1s active, 2s lobby) and revision gating.
- Unit tests for pair parsing, deck construction and links.
- Documentation and an `.env.example` (no live secrets).

## Local development evidence — owner-reported 2026-10-08

The owner cloned the repository on Windows, checked out `feat/memory-foundation` tracking `origin/feat/memory-foundation`, and ran:

- `npm install`: **119 packages added**; 120 audited; **5 audit findings (3 moderate, 2 critical)**. Exact affected dependency paths and whether they affect production have **not yet been investigated**. Do not run `npm audit fix --force` blindly.
- `npm run typecheck`: **PASS** (`tsc --noEmit`).
- `npm test`: **PASS**, Vitest 3.2.7, **7 of 7 unit tests**.
- `npm run build`: **PASS**, Vite 6.4.4, 93 modules transformed; production bundle emitted.
- `npm run dev`: Vite 6.4.4 **ready** at `http://localhost:5173/`.

These are **owner-supplied terminal outputs**, not independently reproduced by this control room. Vite readiness does not prove that the page was visually opened or used. The 7 tests cover pure functions/URL generation, not full browser or live RPC behavior.

## Dependency update verification — owner-reported 2026-10-08

After pulling the React Router DOM 7.18.4 / Vitest 4.1.11 manifest update (GitHub `b4b87c0`), the owner ran the full dependency and compile/test cycle on Windows:

- `npm install`: added 4, removed 11, changed 15; 113 packages audited; **0 vulnerabilities**.
- `npm audit`: **0 vulnerabilities**.
- `npm audit --omit=dev`: **0 vulnerabilities**.
- `npm run typecheck`: **PASS**.
- `npm test`: **PASS, 7/7**, Vitest **4.1.11**.
- `npm run build`: **PASS**, Vite **6.4.4**, 101 modules transformed, output JS 298.68 kB (95.78 kB gzip).

This is owner-provided terminal evidence, not separately reproduced via a local runner. The generated `package-lock.json` has subsequently been confirmed present on the feature branch in GitHub. Browser/gameplay verification remains outstanding.

## Browser evidence and UI polish — owner screenshots 2026-10-08

- The owner reports online Memory is working through the React app and existing Supabase backend. Screenshots show an active 12-card board (one matched pair, player turn and score visible) and a generated multiplayer lobby/QR, establishing meaningful **manual browser smoke evidence**.
- This does **not** yet establish complete two-client turn progression, mobile support, disconnect recovery, or full end-of-game parity.
- Screenshot review identified low-contrast revealed card values (disabled button default text rendering) and overstretched lobby panels with tight action spacing.
- UI-only fix committed in `ee6e4ed`: explicit foreground/opacity for disabled revealed cards, slightly larger face content, lobby alignment to content, and action spacing. Requires owner browser refresh and visual verification.

## Known gaps / cautions

- Initial port is **not verified parity** with the latest working Canva version. Browser QA, two-client race tests, refresh/reconnect UX, teacher recovery, responsive layout and completion flow still need proof.
- Dependency update verified by the owner: `npm audit` and production-only audit both report zero findings, with passing typecheck, 7/7 unit tests and build. Lockfile is committed; recheck after subsequent changes.
- `sessionStorage` stores temporary bearer game capability: refreshed same-tab session can recover; new devices require a new join. Leaving removes local capability, not server membership.
- `game_poc_memory_join` accepts anonymous guests only while lobby is open. Rooms expire; no permanent results/history linkage.
- One hosted response revision may be unchanged while another client UI rerenders; rely on the server for authority.
- No Realtime WebSockets: original Canva experiment had channel errors; HTTP polling is the first parity baseline.
- No Git working tree cleanliness claim for the user's local clone was established by these logs.

## Next work

1. Open `http://localhost:5173/` and smoke-test local Memory UI with matches and mismatches.
2. Pull `ee6e4ed` UI fix and verify clear card text, lobby height and action spacing on desktop/mobile.
3. Set public-only `.env.local` values for online use; test real browser two-player flow with synthetic names.
4. Fix discovered issues in bounded commits; rerun typecheck, tests and build.
5. Only after parity, consider Vercel deployment.

## External baseline

Original Canva Code HTML was user-supplied on 2026-10-08 and remains a working reference. Its monolithic exported HTML includes vendor/bootstrap scripts that are not part of this port.
