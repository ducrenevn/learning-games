# MP0 — closure and hosted functional verification (2026-10-14)

**Decision:** Control room accepts MP0 engineering, AG browser QA and hosted Memory *functional* QA. **Not an owner-authorized merge or production release.** Source branch `feat/lg-mp0-ux2-m3a-integration-20261013` at `b569d767e18ae0330cfbb028192470fde60a710d`; docs are tracked separately.

## Evidence provenance

- **Independently confirmed by control room:** GitHub commit `b569d76` on isolated branch, three commits above UX-2 base `d998237`; Vercel Preview `learning-games-k7194h9ue-rene-s-projects1.vercel.app`, commit `b569d76`, READY, target Preview (`null`), Vercel deployment ID `dpl_AMZ5NxPKyHZypFCZJXCrxuF7qF14`. Recorded Production remained `main@f8ac534`. No merge/promotion performed by control room.
- **Implementer report (not independently rerun):** `npm run typecheck`, `npm test` 454/454 across 34 files, `npm run build`, `git diff --check` PASS; targeted F1–F5 regression/mutation checks. Agent also reported local intercepted browser checks.
- **AG frontend browser report:** 42/42 across navigation, Sort, Sequence, Detective, Memory local and online configuration, DE/EN/VI and 1440/768/390px; zero P0/P1 findings. Minor join-form `id/name` note and Safari/screen-reader follow-ups. QA agent reported direct Vercel Preview inspection.
- **AG MP0-H hosted test (owner-provided report):** 2 synthetic Memory rooms, 2 synthetic students per room, both room-language policies, three isolated browser runtimes, actual `game_poc_memory_*` RPCs, normal turn controls, polling sync/reconnect, 2 completed games. Room 1 Vietnamese fixed language; Room 2 DE host / EN student A / VI student B with independent choices. AG reported no functional, sync or ordinary-role defects; no SQL/DDL/SPP work. This is AG-reported hosted functional evidence, **not independently replayed** by the control room.
- **Metadata distinction:** AG provided a deployment ID `dpl_H9dMnkrqJuzdNsct8cStjyqz3sWF`; connected Vercel metadata for the exact URL and commit returned `dpl_AMZ5NxPKyHZypFCZJXCrxuF7qF14`. Use verified Vercel metadata, not the report's ID.

## Accepted, and not proven

**Accepted for this milestone:** UX-2 all-four-game local interaction QA; Memory turn multiplayer in ordinary hosted scenarios; create_v2 language policy; DE/EN/VI localized join/lobby/play/results; no room capabilities in join link/QR; synthetic completion; no Production change.

**Not proven:** adversarial server-side authorization (disabled student buttons do not substitute for directly testing RPC privileges); real physical devices / WebKit / screen-reader virtual cursor; high concurrency and fault injection; room expiry **purge** (AG saw `expiresAt` about 3 hours after creation, which does not prove physical deletion); permanent account identity or SPP integration; true realtime transport (existing Memory uses polling). Join input missing id/name is a P2 semantic backlog item, not a release blocker found in AG's Chromium run.

## Freeze and next gate

Freeze MP0 code at `b569d76`. No automatic merge of UX-2/M3a/MP0 stack; release and PR sequencing remain a **separate owner decision**. MP1 is an additive design proposal in [MP1_BACKEND_CONTRACT](../architecture/MP1_BACKEND_CONTRACT.md) with review gates in [MP1_REVIEW_AND_ROLLOUT](../architecture/MP1_REVIEW_AND_ROLLOUT.md). No new hosted SQL is authorized. Do not confuse AG's two hosted synthetic room writes (authorized in MP0-H) with a zero-hosted-write claim for *that* test.
