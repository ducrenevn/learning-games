# MP1 — Opus v2 delta reconciliation (2026-10-14)

**Opus verdict:** APPROVED WITH REQUIRED CORRECTIONS for contract v2 `eedaa67`. No new P0. This is a documentation and source review only, not a tested SQL implementation.

**Control-room action:** contract v3 on the same docs-only branch implements B1–B4 and C1–C6:

| Finding | Contract v3 resolution |
|---|---|
| B1 locks and host polls | Join, submit and all host commands use room FOR NO KEY UPDATE before reading/updating roster; place uses FOR SHARE; state no locks. Join and submit increment room_revision so host polls see receipts. Test concurrent admission and close races. |
| B2 lost replies and stale placement | Expected attempt revision mandatory per place/submit command; identical placement returns success without increment; otherwise stale fails, current applies and increments. Browser queues one command per attempt. |
| B3 SQL owner | Public SECURITY INVOKER wrappers call four restricted nonexposed-schema SECURITY DEFINER entry functions. Dedicated NOLOGIN owner holds private schema. Exact grants/role membership must be proved locally, with no shared public CREATE grant for the restricted owner. |
| B4 retry after join closed | Existing bearer digest lookup and canonical original request comparison before admission, capacity and rate checks; expired/revoked responses remain safe. |
| C1 Unicode | Pin JS Unicode/ICU version, generate SQL classes with reproducible script, test trim/collation/NFC and all corpus parity. |
| C2 JSONB duplicates | JS and jsonb both last-key-wins; preserve separate original body byte limits. |
| C3 randomness | Use cryptographic gen_random_uuid handles and shuffle keys, not random(). |
| C4 submission | Explicit submit requires complete placement; host close freezes incomplete as closed_unsubmitted, counts missing wrong; removed participant submission kept privately until purge. |
| C5 host view | Server excludes keys and private responses before review/finished; subsequent frontend projector toggle is an additional visual safeguard. |
| C6 local-only | Local Supabase CLI PostgreSQL version, no remote read, link, push, linked flags or remote project config. |

**Status:** design proposal reconciled, pending owner authorization for MP1-AB-db disposable-only implementation. Owner rules before frontend integration and project/retention/abuse choice before hosted installation remain reserved. No SQL/source/deployment changes performed by this documentation step.

See [MP1_BACKEND_CONTRACT](../architecture/MP1_BACKEND_CONTRACT.md) and [review gates](../architecture/MP1_REVIEW_AND_ROLLOUT.md).
