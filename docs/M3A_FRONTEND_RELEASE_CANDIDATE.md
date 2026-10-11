# M3a frontend release candidate — 2026-10-11

**Status: implementation-only review branch; NOT approved for merge or production deployment.**

Base: `main@f8ac534026b4fcdcfa0ffa15e61890a4e5389c62`.
Browser-tested source: `feat/m3a-room-policy-ui-reviewed-20261009@e06c3acbce6c4694dc01566ea97fada76865c409`.

## Included

- Selectively port M3a DE/EN/VI interface, server-authoritative Memory room-language policy, host/student controls, announcements, and existing policy tests.
- Preserve no-account room capabilities and teacher-provided vocabulary verbatim.
- Improve native-looking setup radios into calm responsive single-select choices, with descriptions and keyboard focus states.
- Translate visible vocabulary validation and known room/network errors through typed DE/EN/VI dictionaries, without surfacing unknown server diagnostics.
- Add focused tests for localized validation and safe fallback errors.
- Keep the existing frontend GitHub check workflow.

## Excluded

No SQL migration drafts, migration runbooks, SPP or Supabase writes, new database migrations, Auth, account/profile persistence, or legacy production code changes.

The canonical M3a database migration has already been installed and verified by the SPP control room and must not be re-executed.

## Owner's next verification steps (not claimed complete here)

1. Run `npm ci && npm run typecheck && npm test && npm run build` on this exact branch/commit, and inspect GitHub CI.
2. Inspect the preview generated from this branch. Check mobile layout, policy-radio keyboard focus, German/English/Vietnamese validation and invalid-room errors.
3. Verify locked DE and VI rooms, refresh enforcement, independent language choice and unchanged vocabulary; quickly smoke a complete 3-browser game because release source was re-integrated onto main.
4. Confirm tested preview SHA exactly matches release PR head. Only then separately decide on merge and production deployment.

Antigravity's prior browser acceptance PASS applies to `e06c3ac`, not automatically to this new integration commit.
