# Handoff — Wave F owner acceptance and release decision
**Date: 2026-10-12.** Supersedes the earlier "BUILD LG-A1, LG-A2, LG-A3" handoff: the three games are built, and the independent Sonnet review and fixes are done. **Do not rebuild them.**

## State
- Branch `feat/wave-f-local-games-a1-a3-20261012`, draft [PR #12](https://github.com/ducrenevn/learning-games/pull/12), based on docs PR #11 `6e7e27e`. Authoring commits end at `7bdda96`; the review added local commits on top (list in the [review report](audits/2026-10-12-wave-f-independent-review.md), section 8). **The review commits are not pushed** — check `git log origin/feat/wave-f-local-games-a1-a3-20261012..HEAD` before assuming the remote has them.
- Verified: `npm ci`, typecheck, 172 tests, production build; real-Chrome layout/keyboard/files/touch evidence. **Not verified:** screen readers, Safari/Firefox, real phone/projector, Vercel hosting, Memory online play, anything with Supabase/SPP.
- `main` was `f8ac534026b4fcdcfa0ffa15e61890a4e5389c62` at review time; M3a [PR #10](https://github.com/ducrenevn/learning-games/pull/10) was draft/unmerged. Re-verify both live before acting.

## Next gates, in order — each needs the owner
1. **Owner hands-on acceptance** with the checklist in section 7 of the review report and the fixtures in `tests/fixtures/wave-f/`. Record what was actually done; do not mark a gate passed without evidence.
2. Fix anything the owner finds (same branch, separate commits, tests with each fix).
3. **Separate release decision:** push, un-draft, merge PR #12 and any deployment are each explicitly owner-approved. A push can start Vercel builds. No Supabase/SPP/SQL change is part of this wave.
4. After an authorised M3a (PR #10) merge, reconcile `src/shared/activities/i18n.ts` with the M3a localisation and update the German-string assertions in `tests/*.dom.test.tsx`.

## Constraints (unchanged)
No new Supabase tables, functions, policies, migrations or hosting edits; no networked multiplayer, student accounts, stored submissions, analytics, optional media hosting or in-app AI; do not refactor Memory; do not touch SPP Auth/Homework/speaking. Wave F stays frontend-only, text-first, local to the browser. Read [AGENTS.md](../AGENTS.md) first; preserve unrelated and uncommitted work.

## Open product questions for the owner
- Should Presentation differ more from Independent for Sort/Sequence (e.g. no Retry button, teacher-only Reveal)? Today they differ in layout only (Language Detective's Presentation also has no typing boxes).
- Should the interface language be remembered between pages/reloads (it defaults to German each time)?
- Do you want teachers to be able to rename category/card ids, or keep them generated?
- Stage 2 (networked rooms) remains separately gated; nothing here prepares or authorises it.
