# MP1 Sort Individual — client foundation handoff

> **Historical foundation handoff:** the wiring checklist and unverified-foundation status below predate the implemented, classroom-accepted integrated Preview at `8c14b845ee4ed7892a224e9e336852255612362f`. Current authority: [CURRENT_STATE](../CURRENT_STATE.md) and [release preflight](../RELEASE_PREFLIGHT.md). Preserve this record for module ownership and design provenance; do not repeat its completed implementation tasks.

**Branch:** `feat/mp1-sort-client-foundation-20261014` (not merged; no deployment).
**Base:** `a01fd13768bb21cc762353f59d421bfb93d14921`.
**Scope:** Sort-only API/types, actor-scoped normalization, session identity, polling and contract tests. Memory files, application routes, hosted Supabase and UI remain unchanged.

## Reuse in the next frontend integration

- `src/shared/lib/supabase.ts`: existing publishable-key Supabase client, no accounts.
- `src/games/memory/RoomSetupDialog.tsx`: language-policy dialog.
- `src/shared/classroom/useRoomInterfaceLocale.ts`: server-validated language policy.
- `src/shared/classroom/roomCopy.ts`: common translated room text.
- `src/games/memory/MemoryJoin.tsx`, `MemoryRoom.tsx`, `RoomShare.tsx`: visual behavior only; DO NOT reuse Memory's six-character code or memory storage namespace.
- `src/games/sort/SortPlayer.tsx`: tap/drag sorting behavior needs a multiplayer adapter; do not reuse the local truth-bearing `SortActivity` as the student's server DTO.

## New Sort modules

- `online/types.ts`: typed actor-visible response and receipt shapes.
- `online/sortRpc.ts`: 256-bit client-generated capabilities and four `lg_v1_*` RPCs. `createSortRoom` / `joinSortRoom` accept caller-generated capability to support exact-token retry.
- `online/parseSortState.ts`: strict response validation, opaque-handle mapping, actor-safe fields, partial/unchanged polling and revision monotonicity. It intentionally strips SQL's authored `score.perItem` identifiers from student results.
- `online/identity.ts`: separate `learning-games:sort:` sessionStorage namespace.
- `online/useSortRoom.ts`: actor-safe polling, room/attempt revisions and command dispatch. Receipts cause a state refresh; errors never auto-retry a mutation.
- `tests/sort-online-contract.test.ts`: DTO/contract tests.

## Remaining UI wiring (bounded)

1. Adapt `ActivityWorkspace.createRoom`: its Memory-only `pairs` gate must apply only to Memory; preserve the validator for Sort.
2. `SortPage`: use Memory's RoomSetupDialog and unsaved navigation handling; validate the activity and call `createSortRoom` with a fresh host token. Save the capability **before** the network call so a retry uses the exact same token; commit active identity only after success.
3. Sort join route: accept **eight** characters; generate and retain the same student token through retries; scope identity to Sort.
4. Sort room route: reuse Memory's lobby/QR/language/copy and share visuals, but use Sort's `useSortRoom` and opaque cards/categories from `studentView` for students. Author-supplied `categoryId`, `explanation`, answer key, `scoreSort` and imported activity must NEVER be passed into the student room.
5. Implement teacher `room.start`, `room.close`, `room.reveal`, `room.finish`, `room.remove_participant`; student `sort.place` and `sort.submit`. Use the hook's `send(kind,payload)`, and render only server-authorized review/results.
6. Make `RoomShare` take a join-path prop instead of hard-coded Memory URL; keep Memory default unchanged.
7. Wire `/games/sort/join` and `/games/sort/room/:roomCode` routes; hide app-bar flags on both Memory and Sort room routes, preserving language policy.

## Release gates and known limitations

- This is a source-only foundation **not yet typechecked, tested or browser-verified**. Run `npm run typecheck`, `npm test`, `npm run build` in local checkout, then fix any findings.
- The SQL's student `result.score.perItem` includes authored IDs; parser drops this field before displaying results. Continue treating the original network payload as sensitive and do not log it.
- `sort.place` uses attempt revision; mutating room commands use room revision; `sort.submit` uses both.
- `roomCode` (eight characters) is the only capability in invitation URL; **never put host/student token in URL**.
- Hosted Supabase MP1 migration was applied separately. Do not rerun it. Learning Games remote `main` is Vercel Production-linked; merging/deploying requires separate authorization.
