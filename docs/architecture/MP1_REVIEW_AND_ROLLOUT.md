# MP1 review status update — reconciled v2 (2026-10-14)

**First Opus review completed:** APPROVE WITH CHANGES against `ea403e3`; see [finding-by-finding reconciliation](../audits/2026-10-14-mp1-opus-reconciliation.md). [MP1_BACKEND_CONTRACT](MP1_BACKEND_CONTRACT.md) is rewritten as **v2**. The original open-ended review brief below is now historical; do not rerun it as if no review occurred.

**Next reviewer action:** focused **read-only v2 delta check**, not implementation. Concentrate on (a) no authored ID/order leakage including Detective, (b) SQL/server validator parity with TS corpus, (c) restricted NOLOGIN owner and POST-only/ VOLATILE function hardening, (d) create/join retry token recovery and actor-attempt CAS for stale absolute placements, (e) READ COMMITTED locks and freeze, (f) four-table single disposable Sort Individual design. Return unresolved blockers and exact targeted amendments, then STOP.

**Only after owner go:** develop isolated disposable-only MP1-AB-db (Sort Individual + minimal room service); proof of pgTAP ACL, PostgREST boundary, GET rejection, modes 11/5, key confidentiality, Unicode/duplicate corpus, bad capabilities, lost replies, simultaneous edits/host close, expiry and purge. No hosted SQL, DDL, roles, deployments, application integration or SPP changes.

---

# MP1 — independent backend review packet and release gates

**State:** Review-ready **proposal** prepared 2026-10-14. MP1 backend contract is not an approved schema/migration, installed code or permission to implement. Product V1 matrix remains locked in [MULTIPLAYER_V1_CONTRACT](MULTIPLAYER_V1_CONTRACT.md). Start with [MP1_BACKEND_CONTRACT](MP1_BACKEND_CONTRACT.md).

## Review assignment — Opus (read-only, independent)

**Source authority:** `ducrenevn/learning-games`, accepted MP0 implementation `b569d767e18ae0330cfbb028192470fde60a710d`, documentation branch containing this contract, actual `src/games/{sort,sequence,language-detective,memory}` engines/validators, `src/shared/activities/{contract,portable}.ts`, `docs/architecture/BACKEND_BASELINE.md`, `docs/architecture/DETECTIVE_V2_CONTRACT.md`; inspect relevant installed RPC/migration definitions read-only if available. Do not rely on product prose as proof of installed SQL. Shared production Supabase ref: `iizsyphqlezesbvaiztd`.

**Deliverables (specific):**
1. **Architecture verdict:** APPROVE / APPROVE WITH CHANGES / REJECT. Compare additive typed shared lifecycle vs separate game-specific RPC families, with maintenance cost, attack surface and versioning. Explicitly decide whether shared `lg_v1_command` with allowlisted discriminants is safe, or needs separate function entrypoints.
2. **Data & permissions:** Review every proposed private table, immutable canonical snapshot, teacher key, student-safe projection, host-only DTO, capabilities, token-hash construction, `anon`/authenticated/PUBLIC grants, SECURITY DEFINER, search-path hardening, RLS/owner and SPP isolation. Demand exact security proofs before hosted use.
3. **Concurrency & retry:** Analyze transaction isolation, lock order, optimistic per-room/per-attempt/per-field revisions, idempotency of create/join/commands and duplicate replies; propose concrete solutions to ambiguous timeout and create-result recovery that do not leak host capabilities.
4. **Game logic:** Confirm no Sort category IDs, Sequence canonical order, Detective issue/correction key leak; validate v1/v2 task-local IDs, no-error and free text remains ungraded. Verify all 11 YES and 5 NO, including current legacy Memory Turns lane.
5. **Resource/retention:** Room codes, anonymous abuse limits, size/capacity/poll frequency, role-token replay, room expiry vs actual purge, cleanup and no SPP impact. Identify product-owner decisions needed before MP1-A.
6. **Implementation plan:** Return a precise minimum MP1-A foundation contract plus MP1-B Sort Individual vertical slice, exact files/migration/RPC/test surface, disposable DB version and ACL/negative tests, hosted preflight/backup/rollback gates. Separate design dependencies from optional polish. Avoid speculative generic abstractions.

**Stop:** Review and report only. No code, docs edits, commits, PR updates, migrations, grants, hosted RPC writes, deployment, Memory room creation, or SPP changes.

## Disposition format

| Finding | Severity P0/P1/P2 | Evidence (file/line or SQL) | Minimal change | Blocker for MP1-A? |
|---|---|---|---|---|

Review should enumerate accepted and disputed decisions, recommended exact changes to contract, owner questions, runnable proof matrix, and readiness for first implementation. No blanket approval of uninspected executable migrations.

## Control-room response

1. Compare reviewer findings against actual MP0 code and the locked matrix.
2. Revise draft MP1 docs (new docs-only commit) with explicit design decisions and unresolved policy choices; do **not** silently change owner-approved V1 matrix.
3. Request owner approval for **exact MP1-A isolated disposable-only work**, not hosted SQL.
4. Agent implements foundation proof with tightly scoped tests; control room performs source/SQL audit; Opus reviews executable security-critical delta before hosted installation.
5. Only with current hosted schema/grants inspection, backup/recovery verification, SPP coordination and explicit owner installation authorization may any SQL touch project `iizsyphqlezesbvaiztd`.
6. First full functionality: Sort Individual. Independent QA and owner go/no-go before further modes.
7. Preserve MP0 `b569d76` and production `main` until separate merge/release authorization.

## Product decisions reserved for owner

- Anonymous live-room limits (participant capacity, rate limits, anti-abuse mechanism).
- Individual results: student receipt vs immediate feedback, teacher visibility timing and reveal.
- Expiry/retention and whether physical cleanup can be implemented reliably.
- Late joining after start, disconnect/rejoin and capacity behavior.
- Future timers/leaderboards (not part of first slice).
- Whether shared SPP production Supabase remains suitable for the new anonymous multi-game service after isolation review.

Do not conflate **review of this design** with approval to code, migrate, merge, release or link SPP Homework.
