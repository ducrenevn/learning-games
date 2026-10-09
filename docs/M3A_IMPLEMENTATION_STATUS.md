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


## 2026-10-09 follow-on room-language integration — implementation branch

Review branch: `feat/m3a-room-policy-ui-reviewed-20261009` (based on migration-safety review branch, NOT main). **Source changes committed; not built or deployed.**

- Added teacher room-creation radio choices: everyone shares teacher-selected DE/EN/VI language, or students choose their own.
- Wired new room creation to `game_poc_memory_create_v2`, passing both server-owned policy values.
- Validated the authorized `game_poc_memory_state` payload. Missing/invalid policy fails closed instead of inferring teacher intent from a browser toggle.
- Removed the global language switch from online Memory join and room routes; students get a switch inside a room **only when server permits choice**. Locked rooms enforce the server-selected language.
- Added tests of the pure policy validator and locked / selectable language resolution.
- Preserved a previously validated room policy when older Memory turn mutation RPCs return snapshots lacking the new language keys.
- Existing Memory card content remains unmodified and is not translated with the UI.

**Outstanding gates / limitations:**
1. **Do not merge or deploy before M3a backend migration.** New-room creation intentionally calls v2; current production has no such RPC.
2. Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, and actual local/browser flow testing in a proper checkout. Connector review did **not** execute these.
3. Smoke the 3-browser full game, old legacy client, DE/EN/VI locked/choice, refresh/rejoin, and view-state policy under all mutation RPCs against an isolated migrated DB or approved controlled hosted test.
4. Student chooses language in **lobby after joining** (not before entry); this honors the agreed join/lobby option without introducing an unauthenticated room-metadata endpoint.
5. Teacher-selected room language is captured at room creation. The local app language can still change elsewhere; room policy is authoritative after authorized state loading.
6. User-facing PostgREST errors and announcement behavior still require browser review.
7. No database changes, production deployment, Supabase migration ledger changes, or SPP changes were made in this branch.
