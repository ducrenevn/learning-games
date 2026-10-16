# Release roadmap — 2026-10-16

1. **Accepted on Preview:** all four local games, functional Memory online and classroom-accepted Sort Individual online at frozen candidate `8c14b845ee4ed7892a224e9e336852255612362f`.
2. **Installed per owner handoff:** three Learning Games migrations on shared SPP Supabase, including reveal lifecycle correction. Applied SQL remains immutable.
3. **Current gate:** bounded local release-preflight corrections and verification, local commit, then STOP for focused independent correction review. See [release evidence/risk register](RELEASE_PREFLIGHT.md).
4. **Separate dependencies/decisions:** SPP PR #12 remains draft with migration-history reconciliation outstanding; legacy Memory clean replay unproven; SPP control room owns the hosted read-only security/function-parity probe. Production merge/release still requires a separate owner decision.
5. **Future only:** unrestricted-public hardening and quotas/retention/validation proof; further multiplayer modes and SPP Homework integration require separately scoped approval. No new backend implementation in this preflight.

---

## Historical roadmap — 2026-10-14 and earlier

Earlier “next” steps, design-only status and authorization claims below are milestone records superseded by the current roadmap above.

# MP1 v3 roadmap update (2026-10-14, historical)

Opus second delta: APPROVED WITH REQUIRED CORRECTIONS (B1–B4, C1–C6). Documentation reconciled to [MP1 v3](architecture/MP1_BACKEND_CONTRACT.md). **Next gated work:** owner-authorized, disposable-only MP1-AB-db Sort Individual backend; local SQL and PostgREST security/race/corpus proof, then independent executable SQL review. No further contract design pass is required absent a blocker. No hosted access or frontend integration as part of that task.

---

# Roadmap update — MP1 review reconciled (2026-10-14)

1. **Done:** MP0 engineering/browser/hosted ordinary Memory functional QA; accepted Preview code `b569d76`, no production release.
2. **Done:** Opus independent MP1 review (`APPROVE WITH CHANGES`), v2 documentation reconciliation [audit](audits/2026-10-14-mp1-opus-reconciliation.md).
3. **Next:** focused independent v2 delta acceptance, with no code edits.
4. **After owner authorization:** MP1-AB-db — *one* disposable PostgreSQL/PostgREST SQL foundation + Sort Individual, 4 private tables and 4 public VOLATILE POST-only RPCs, safety tests.
5. **After independent executable SQL review and new owner authorization:** Sort Individual browser client; hosted project choice/security/abuse/backup gates before any installation.
6. **Future:** Sort Teacher-paced and Collaborative, Sequence 3 modes, Detective 3 modes, Memory Individual; legacy Memory Turns preserved. SPP Homework separately gated.

---

# Learning Games Roadmap — current control-room update (2026-10-14)

## Accepted, unreleased
**MP0:** UX-2 local experience for Memory/Sort/Sequence/Detective plus M3a Memory online language-policy integration; source `b569d76`; 454/454 implementer-reported tests, 42/42 AG browser scenarios, 2 hosted Memory synthetic games completed under both room language policies. See [MP0 closure](audits/2026-10-14-mp0-hosted-acceptance.md). Source/Preview accepted; Production release and merges remain gated.

## Next gated phase
1. **MP1 contract review — NOW:** control-room-authored [MP1 backend draft](architecture/MP1_BACKEND_CONTRACT.md) and [review packet](architecture/MP1_REVIEW_AND_ROLLOUT.md) for independent evaluation. Locked 11 game/mode combinations remain [here](architecture/MULTIPLAYER_V1_CONTRACT.md).
2. **MP1-A:** after review and owner authorization, develop *disposable-only* shared room lifecycle, capabilities, validation, actor-specific projections, revision/idempotency/security proof. No hosted SQL implicitly authorized.
3. **MP1-B:** first independently gated full multiplayer implementation, provisionally **Sort Individual**, with strict private answer keys and attempts.
4. **Following slices:** Sort teacher-paced/collaborative; Sequence modes; Detective modes; Memory Individual. Existing Memory Turns remains on its installed prototype until a separately reviewed migration.
5. **Separate later tracks:** SPP Homework assignment adapter; Production merge/release sequencing for UX-2/MP0; accessibility/security hardening.

**No current authorization:** new SQL, hosted installation, merging MP0 into main, changing SPP, adding accounts, generic turns for Sort/Sequence/Detective, fifth mode, unreviewed Realtime.

---

# Learning Games Roadmap — 2026-10-12
**Check [CURRENT_STATE](CURRENT_STATE.md) and live GitHub refs, not only this plan.**

## Delivered
M0 app foundation, M1 Memory parity and M2 Vercel hosted acceptance completed 2026-10-09; [M1](audits/2026-10-09-m1-qa-report.md) · [M2](audits/2026-10-09-m2-hosted-acceptance.md).

## Separate Memory release lane
**M3a localization** migration reported applied; draft [PR #10](https://github.com/ducrenevn/learning-games/pull/10) still needs targeted corrected-HEAD browser checks and separate merge/deployment approval. Do not conflate with new games. **M3 Memory hardening** remains backlog.

## Wave F — teacher-first, local-first, multiplayer-ready (approved for development)
**Product decision:** implement THREE games in order, then Sonnet independent review/corrections, then owner hands-on testing. See [shared implementation contract](architecture/LOCAL_FIRST_ACTIVITY_CONTRACT.md).
- **LG-A1 Sort:** [spec](games/sort.md), arbitrary teacher-authored categories/cards, one correct category. Establish the portable-file workflow.
- **LG-A2 Sequence:** [spec](games/sequence.md), exact intended order, separate sorting/ordering engine.
- **LG-A3 Language Detective:** [spec](games/language-detective.md), identify pre-authored issues; free-text corrections teacher-reviewed, never falsely auto-graded.
- **Each game:** Presentation Mode (teacher guides group on one screen) + Independent Mode (single browser per student); teacher create/edit/validate/preview/import/export JSON; accessible touch/keyboard, DE/EN/VI UI, robust negative tests and Memory regression.
- No online synchronization, live turns, classroom submissions, room links, private role delivery, server storage or new Supabase objects in Wave F.
- Work incrementally with separate commits/tests per game; stop for independent **Sonnet review and fixes** after all three, then **owner manual/classroom QA**. Code branch/PR is not release approval.

## Stage 2 — deferred
Add optional synchronized rooms/turns/submissions to proven games *selectively* after teacher testing and a separate backend/security contract. Existing Memory RPCs are specific to Memory; don't pass arbitrary game actions through them. Supabase Realtime alone is not a substitute for trusted state/reconnect/permissions.

## Later candidates
Conversation Cards and Information Gap require careful role isolation for online delivery; local printed versions could be built separately. Quick Response, listening and further mechanics remain in [product catalog](PRODUCT_CATALOG.md). SPP Auth, Homework, persistence and integrations require separate owner approval.
