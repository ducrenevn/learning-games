# M3a implementation status — 2026-10-09

Branch: `feat/m3a-interface-language-feedback`. Base: production `main@83209ee`.

## Source changes (implemented, not yet tested in a local build)
- Account-free, in-memory DE/EN/VI UI language context, default German. No localStorage, profile, Auth, learner account or permanent language preference.
- Top-right interface switch for the app.
- Localized selection, Memory setup, join, lobby, scoreboard, QR share and results UI.
- Central, temporary event announcements for Memory turn starts and match/mismatch outcomes. Persistent scoreboard remains after pop-up disappears.
- The game vocabulary remains exactly what the teacher typed.
- Frontend-only changes; no database, RPC, production deployment or SPP changes.

## Important outstanding contract — room-language rule (NOT IMPLEMENTED)
The approved UX has two options in room creation:
1. Everyone same language: students never see a language selector, and play in the teacher's chosen interface language.
2. Students choose: students select DE/EN/VI in room join or lobby.

The existing RPC `game_poc_memory_create(p_title,p_pairs)` and `game_poc_memory_state` do **not** expose a dedicated room-language policy. A browser-only choice cannot reliably enforce a setting across devices or refreshes. We must not pretend this works, overload the room title, or leak data into tokens/URLs.

Before implementing the room toggle:
- Review and approve a narrowly scoped, backward-compatible extension to the isolated `game_poc_memory_*` contract, retaining safe defaults for older rooms.
- Enforce the policy in all client routes and refreshes; only use the actual server room setting.
- Do not modify unrelated Speak Practice Pro data, Auth, Homework or migrations.
- Use synthetic participants and verify host/2-student mixed- and locked-language flows.

## Test status / blockers
- This control room edited GitHub sources only; it did **not** run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, or real browser tests. **All remain NOT TESTED for this branch.**
- Some backend-provided validation and RPC errors may still appear in German or Supabase's native language; do not claim complete localized errors.
- Central announcements must be exercised in rapid-click, polling, mobile and reconnect tests to check for duplicates and timing.
- The existing Vercel production `main` deployment remains unchanged.
- This branch is for review/QA, not immediate merge.

## Verification before merge
```sh
git fetch origin
git switch feat/m3a-interface-language-feedback
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```
Then test each language through selection, join, local Memory and online play; verify overlays, responsive behavior, existing server gameplay parity, and correct no-account behavior.
