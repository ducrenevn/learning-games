# Next Control Room — Learning Games (LG-A1 planning, 2026-10-12)
**Repo authority:** `ducrenevn/learning-games`. On intake verify live main SHA, open PRs and contents. Read [AGENTS](../AGENTS.md), [START_HERE](START_HERE.md), [CURRENT_STATE](CURRENT_STATE.md), then short [GAME_MAP](GAME_MAP.md). Prior context is subordinate to newer code/evidence.

**At documentation intake:** main `f8ac534026b4fcdcfa0ffa15e61890a4e5389c62`. Memory M3a [PR #10](https://github.com/ducrenevn/learning-games/pull/10) open/draft/unmerged at `ec5e58916406eabf7a94185d92538da535c0812c`; targeted final DE/VI browser gate remains. Never merge/deploy automatically.

**User-approved planning direction:** Sort as generic teacher-defined **categorization**; articles/Kasus are only teaching ideas, not presets. Sequence separate/deferred. Short Game Map → per-game mechanics contract in `docs/activity-specs/` vs evolving pedagogical ideas and real JSON storage in `activity-library/`. No actual reusable JSON committed because Sort schema isn't approved; do not pretend draft examples are import-ready or classroom-tested.

**Next assignment — contract work, NO implementation:** review [LG-A1 spec](activity-specs/GAME_SPEC_sort.md), [portable-file proposal](PORTABLE_ACTIVITY_FILES.md), library and app code. Settle final type, JSON version, validation caps, unknown fields and safety, category/card interaction/editor, check/retry/explanation UX, projector/local behavior, DE/EN/VI and acceptance fixtures. Ask owner to finalize before starting game code.

**Boundaries:** no hosted SQL, SPP Auth/Homework/RLS changes, new game RPC, runtime changes, auto merge/deploy, or exposing capability tokens. Review PR #10 independently. Do not give agents an enormous indiscriminate read list.
