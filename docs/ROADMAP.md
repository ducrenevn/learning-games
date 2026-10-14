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
