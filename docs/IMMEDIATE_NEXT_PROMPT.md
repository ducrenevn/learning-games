# New Control Room Handoff — BUILD LG-A1, LG-A2, LG-A3
**Date: 2026-10-12. Owner has explicitly authorized implementation of three teacher-first/frontend-only games.** The preceding control room updated documentation only; it did NOT create game source code or freeze a hosted DB change.

## Intake and branch discipline
Repository `ducrenevn/learning-games`. Begin by verifying live `main`, draft docs [PR #11](https://github.com/ducrenevn/learning-games/pull/11), and Memory M3a [PR #10](https://github.com/ducrenevn/learning-games/pull/10). At handoff intake, `main=f8ac534026b4fcdcfa0ffa15e61890a4e5389c62` and M3a PR #10 was draft/unmerged at `ec5e58916406eabf7a94185d92538da535c0812c`. Verify rather than assuming they are unchanged.

**Document authority:** docs PR #11 contains the latest specs, architecture, map and this handoff. For coding, branch from an explicitly verified, clean reference containing PR #11 docs; do not silently merge to deployment-linked `main` or cherry-pick/release M3a PR #10. Coordinate branch stacking if docs PR still unmerged. Respect existing `AGENTS.md`; preserve unrelated work.

**Minimal reading order:**
1. `AGENTS.md`, `docs/START_HERE.md`, `docs/CURRENT_STATE.md`, `docs/ROADMAP.md`.
2. `docs/architecture/LOCAL_FIRST_ACTIVITY_CONTRACT.md`, `docs/architecture/PORTABLE_ACTIVITY_FILES.md`.
3. For each game, only its own `docs/games/sort.md`, `sequence.md` or `language-detective.md`; `docs/GAME_MAP.md` for navigation. Read source `src/app`, Memory, `src/games/registry.ts`, i18n status as needed.
Do not read entire teaching library or old exploratory specs by default.

## Deliverable: THREE complete, independently playable games
**A1 Sort:** arbitrary teacher-authored category/card classification; select-to-place keyboard and touch; check/retry; explained teacher key.
**A2 Sequence:** teacher authors correct linear order; player reorders shuffled items with accessible move controls, checks, retries.
**A3 Language Detective:** teacher segments text, marks known error segments, supplies corrections/explanations; player flags segments and optionally writes corrections, then reviews. Only issue identification automatically scored; free-text corrections always presented as self/teacher review.

**Both modes on all 3:** teacher-run Presentation Mode (projector / Google Meet screen share, explicit check/reveal) and Independent Mode (student's local browser, no interaction/collection). Teacher can create/edit/import/validate/preview/export JSON, replay/reset. Same game engine/content across modes.

**Contract baseline:** portable JSON envelope v1 `format: "learning-games.activity"`, `schemaVersion: 1`, one of `activityType: sort | sequence | language-detective`, content validated per spec, 128 KiB input cap, no unknown fields. Data-only safe rendering; no other app's student state. Text-first, DE/EN/VI UI, target language never auto-translated. Use small shared import/export helper, independent per-game engines; do not invent universal turns/scoring.

## Execution plan
1. Inspect repo/PR/CI, establish clean non-production branch; clarify local merge strategy. If M3a PR #10 unmerged, do not assume its i18n exists in base. Implement new-game localization without changing Memory behavior; record later reconciliation.
2. Build A1 end-to-end; local engine/schema/UI tests + typecheck/build.
3. Build A2 using proven shared content plumbing; distinct ordering engine/tests.
4. Build A3 with review-not-auto-grading discipline; robust editor/player/tests.
5. Integration: catalog/routes, docs library discovery, DE/EN/VI, responsive/touch/keyboard, all-game import/export, negative/fuzz-ish validator testing, Memory local/online regression where safe.
6. Commit/push separated milestones to isolated feature branch; prepare one reviewable PR (draft if awaiting review), report exact SHAs, tests and known gaps.

## External review and acceptance gates
**After all three are implemented:** owner will ask **Sonnet** to independently review and fix issues. New control room should prepare an exact Sonnet review prompt and evidence bundle, then stop; **do not claim Sonnet was run**. After Sonnet completion, owner will personally test. No merge, release or production deployment without separate owner instruction.

## Strict prohibitions
No new Supabase tables, functions, policies, migrations, hosting environment edits or production DDL. No networked multiplayer/turns/realtime, student accounts, stored submissions, teacher analytics, room QR invitations for these three, optional media hosting, or in-app AI. No refactoring Memory as part of this implementation and no touching SPP Auth/Homework/speaking domains.

## Report expected from new control room
Per-game working paths/modes, content JSON decisions and safety checks, commit SHAs, unit/type/build results, browser limitations, manual test checklist, exact Sonnet handoff prompt. Distinguish tests performed from planned; avoid unverified `production-ready` claims.
