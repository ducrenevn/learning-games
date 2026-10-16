> **Historical release-preflight evidence (2026-10-16):** This report documents the **pre-merge** state, including candidate `8c14b84` and the correction branch, and preserves the risk register. V1 **subsequently merged and went live** at `main@360f641ba05943f17b78d1993890f2ec865b5ea4`, with accepted source `b9b16d03`. Final Production smoke passed four applicable areas; host-exit native dialog was NOT tested live. See [v1 release closure](releases/2026-10-16-v1-production.md). Any "pending merge" or "STOP after local commit" instructions below are historical.

# Integrated release preflight — 2026-10-16

## Scope and provenance

Independent integrated release audit: **CONDITIONAL PASS**, supplied by the owner. Frozen accepted candidate: `8c14b845ee4ed7892a224e9e336852255612362f`; Production baseline: `f8ac534026b4fcdcfa0ffa15e61890a4e5389c62`. Branch `fix/release-preflight-20261016` starts exactly at the candidate. This is a bounded correction diff, not a repeat of gameplay development or the 114-commit audit.

Owner acceptance: all four local games implemented and accepted on Preview; Memory online functional; Sort Individual online classroom-accepted; three Learning Games migrations including reveal lifecycle installed on shared SPP Supabase. SPP PR #12 remains draft with migration-history reconciliation outstanding. Legacy Memory clean replay remains unproven. These acceptance/installation statements are owner handoff evidence, not new hosted database or classroom proof from this pass.

## Corrections

- Authoritative entrypoints now describe the integrated accepted state and release gate. Earlier milestone reports/design packets remain explicitly historical; their “next” assignments are not active instructions.
- `SortRoom.tsx`: leaving an unfinished host room (lobby, active or review) asks for native confirmation in the room interface language (DE/EN/VI), explicitly explaining that discarding teacher access loses session control. Cancel returns before storage or navigation changes. Confirm follows the existing clear-and-navigate path. Finished hosts and students retain their existing exit behavior. No room-close/finish command, backend change, account or new persistence is introduced.
- Eight focused tests cover cancellation in each unfinished phase, byte-for-byte session preservation and mounted controls on cancellation, confirmation in all three languages, and existing finished-host/student exits. RPCs are mocked; confirmation tests exercise credential deletion. jsdom reports full-page navigation as unsupported, so actual navigation/native dialog appearance is not browser-proven here.

## Timeout investigation

Local environment: Windows PowerShell 5.1, Node `v24.15.0`, npm `11.12.1`, Vitest `4.1.11`, jsdom `29.1.1`; 16 available CPUs. Use `npm.cmd` where execution policy blocks `npm.ps1`.

An initial uncapped full run hit the default five-second test limit in two `pages.dom` locale/import flows, `ux-guided` Sort authoring, `memory-room-unsaved` cancellation and `detective-feedback` correction entry (5.08–5.17s). That diagnostic run was interrupted, not a completed regression result. Installed Vitest chooses CPU-count-minus-one workers for a run: 15 on this machine. These are unrelated jsdom flows with awaited user interactions and state-based waits, not fixed sleeps or live network dependencies.

With `--maxWorkers=2`, all 482 existing tests passed at their existing timeouts. That diagnostic run preloaded old app source while the new tests were being added: six new guard assertions failed against the old handler; it is not the final regression run. A fresh focused run passed all 15 Sort-room tests against the correction. A fresh complete run after the source/config changes passed **490/490 tests in 38 files, 112.64s**.

`vite.config.ts` now caps workers at two, addressing CPU/memory contention rather than extending test deadlines. The global default stays five seconds; four existing long interaction-loop tests keep their previous 30-second budgets. No asynchronous race was reproduced after reducing contention. This is local evidence, not proof that every CI host is race-free; rerun the unchanged suite in the eventual review/release environment.

A focused repeat passed **43/43 tests in five files, 18.77s** (`pages.dom`, `ux-guided.dom`, `memory-room-unsaved.dom`, `detective-feedback.dom`, `sort-room-polish.dom`). Previously timed-out flows completed in 1.19–2.41s in that repeat. The longest was guided Sort authoring at 2.409s, with no timeout increase or application async changes.

## Read-only release checks

| Check | Observed result |
| --- | --- |
| Remote Git (`git ls-remote`) | `main` = Production baseline above; `fix/sort-ui-micro-polish-20261016` = frozen accepted SHA above. Local `main` was not used or changed. |
| Vercel target | `learning-games`, project `prj_QmqtNMpIys26I5ma6jikz6EE3lKq`, team `rene-s-projects1`; framework `vite`, configured Node `24.x`. Preview has SSO protection; Production is outside that Preview-only setting. |
| Active Production | READY `dpl_AK7NLtyuoWaSqpR6x9gr3spdPK1u`, Git `main@f8ac534`; alias `https://learning-games-rho.vercel.app`. |
| Frozen candidate Preview | READY `dpl_J1ZBC994GcqPYs5xMt4dg5wiC51z`, exact accepted SHA; `https://learning-games-m7b2uxz9q-rene-s-projects1.vercel.app`. Left intact. |
| Public environment names | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, each scoped to Production and Preview with no branch override returned. Metadata only; no decryption or values printed. Source consumes these two names with Supabase Auth persistence disabled. Values/endpoint parity were not probed. |
| Deployment build evidence | Both existing Vercel builds ran `npm ci` and `tsc --noEmit && vite build`, Vite `6.4.4`, producing `dist/index.html` and assets. Package engine `>=20.19.0` is unbounded; Vercel logs warn of automatic future major upgrades. No engine/config change in this pass. |
| Runtime qualification | Project setting is Node `24.x`; exact deployed build Node patch is not exposed by these connector responses/logs. This is a static Vite SPA, with no application Node request runtime. Local validation used Node `24.15.0`; do not report that patch as the hosted runtime. |
| Routing | `vercel.json` rewrites `/(.*)` to `/index.html`; `src/app/App.tsx` declares all four games plus Memory/Sort join/room routes. Read-only HTTP GETs to Production `/`, `/games/memory/join`, `/games/sort/join`, `/games/sequence`, `/games/language-detective` returned 200 HTML with the root element. This proves SPA fallback on the old Production baseline, not new game execution there. No JavaScript/room RPC was executed by those GETs. |

Vercel connector reads: project, deployment list/details, environment metadata (`decrypt=false`) and existing build events only. No Vercel configuration was modified. No hosted SQL/security/function-parity probe, test rooms, browser gameplay or SPP operation was performed. The separate SPP control room owns the hosted database probe.

## Release risk register

Limited pilot means supervised classes, known teachers, low traffic and synthetic/minimal participant names. It is an operational restriction, **not** a technical barrier to anonymous direct RPC traffic. Any temporary acceptance below requires an explicit owner release decision and the separate SPP probe result; none authorizes unrestricted public rollout.

| Risk | Temporary limited-pilot disposition | Requirement before unrestricted public rollout |
| --- | --- | --- |
| Shared SPP database exposure | Anonymous Learning Games RPC traffic shares SPP production resources. Owner must accept the blast radius, name an operator and monitor SPP health; halt the pilot if SPP performance/security is affected. Await SPP control room security/parity findings. | Demonstrate privilege/domain isolation and load/resource safeguards; decide shared versus isolated hosting with SPP ownership. Room capabilities do not provide identity assurance. |
| Edge throttling / aggregate quotas | No effective edge throttling or aggregate room/traffic/storage quota was verified. Low class size and invitation-only circulation reduce expected traffic but do not prevent direct Supabase abuse. Owner must explicitly accept this exposure for a bounded pilot. | Verify enforceable rate limits and aggregate creation, polling, concurrency and storage budgets across direct Supabase RPC access, with monitoring and response ownership. Frontend/Vercel-only limits cannot protect a bypassable Supabase endpoint. |
| Room / participant-data retention | Expiry is not physical deletion. In checked-in Sort SQL, `purge_expired_rooms` updates room status; it does not delete room/actor/attempt/event rows, and scheduled cleanup is not proven. Memory deletion is also unproven. Use synthetic/minimal names and an owner-approved pilot duration/data-cleanup plan. | Approve retention periods and deletion responsibilities for both backends, including finished rooms, attempts/events and backups; verify actual deletion and scheduled operation. |
| Server-side validation gaps | Browser checks cannot secure direct RPC callers. Source comparison shows Sort SQL lacks full TS parity for unknown fields, strict text types, visible/control/markup checks, normalized duplicate labels/text and slug length. This is source evidence, not a new hosted exploit probe. Restrict pilot authoring to known teachers and record explicit risk acceptance. | Independently verify and close server validation/parity gaps and payload bounds against the corpus and hostile inputs. Any fixes require a separately approved additive backend change; never rewrite applied migration files. |
| Legacy Memory clean replay | Installed Memory works, but its complete original baseline is not reproducible from this repo's migration chain. Pilot acceptance must record the recovery limitation; do not replay existing SQL. | Capture/reconcile the full legacy baseline and demonstrate clean replay/recovery independently in a disposable environment. |
| SPP migration-history mirror | SPP PR #12 remains draft; shared-history reconciliation is outstanding. SPP control room owns it; no migration repair or SPP edits here. | Reconcile the exact versioned migration sources/history byte-for-byte in SPP, resolve PR #12 under its own approvals and verify replay/history before relying on it as recovery authority. |

Additional release decision: preserve the current Node-major setting or separately authorize an engine pin, and accept/defer the existing bundle-size warning (local JS 816.44 kB, gzip 247.64 kB). Neither is corrected incidentally here.

## Verification and stop gate

- `npm.cmd run typecheck`: PASS.
- `npm.cmd test`: PASS, 490/490 tests, 38 files, two workers; global timeout unchanged.
- `npm.cmd run build`: PASS; existing >500 kB chunk warning remains.
- `git diff --check`: PASS; applied SQL migration diff is empty.
- Focused repeat of timeout-affected files and Sort regressions: PASS, 43/43, five files.

Changed files (15):

```text
AGENTS.md
docs/START_HERE.md
docs/CURRENT_STATE.md
docs/IMMEDIATE_NEXT_PROMPT.md
docs/ROADMAP.md
docs/RELEASE_PREFLIGHT.md
docs/architecture/SYSTEM_OVERVIEW.md
docs/architecture/BACKEND_BASELINE.md
docs/architecture/MP1_BACKEND_CONTRACT.md
docs/architecture/MP1_REVIEW_AND_ROLLOUT.md
docs/architecture/MP1_SORT_CLIENT_HANDOFF.md
src/games/sort/online/SortRoom.tsx
src/games/sort/online/sortRoomCopy.ts
tests/sort-room-polish.dom.test.tsx
vite.config.ts
```

Control room next: independent review of this correction diff, obtain the separate SPP hosted probe outcome, then owner disposition of pilot risks and a separate release decision. **STOP after local commit: no push, merge, deploy, hosted writes, SQL or SPP changes.**
