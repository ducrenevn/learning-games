# Learning Games v1 — Production Release Closure

**Release date:** 2026-10-16  
**Status:** RELEASED, final production smoke accepted. **This is the authoritative record of the v1 milestone**, not an invitation to repeat old implementation work.  
**Repository:** [ducrenevn/learning-games](https://github.com/ducrenevn/learning-games)  
**Live production:** https://learning-games-rho.vercel.app  
**Release PR:** [#19](https://github.com/ducrenevn/learning-games/pull/19)  
**Accepted source candidate:** `b9b16d03ea9e0ef8ff5c27afc8d089f231144496`  
**Production merge SHA:** `360f641ba05943f17b78d1993890f2ec865b5ea4`  
**Previous production SHA:** `f8ac534026b4fcdcfa0ffa15e61890a4e5389c62`

## 1. What actually shipped

Learning Games is a **standalone, guest-friendly teaching-game toolkit for adults and vocational language learners**. The product is designed to make classroom interaction easy, not to gamify everything with points, clocks, leaderboards, accounts or childish effects.

| Technical type / route | German name | English name | Vietnamese name | Local play | Live hosted play |
| --- | --- | --- | --- | --- | --- |
| `memory` / `/games/memory` | Memory | Memory | Memory | Teacher presentation and local practice | Existing **Turns** room |
| `sort` / `/games/sort` | Was passt wohin? | Where Does It Go? | Thuộc nhóm nào? | Teacher presentation and independent practice | **Individual** room (new in v1) |
| `sequence` / `/games/sequence` | Der Reihe nach | Line It Up | Xếp đúng thứ tự | Teacher presentation and independent practice | Not implemented |
| `language-detective` / `/games/language-detective` | Auf Fehlersuche | Spot the Mistake | Truy tìm lỗi sai | Teacher presentation and independent practice | Not implemented |

**IMPORTANT:** These are user-facing localized titles. Keep the stable technical game IDs, route slugs, portable JSON `activityType` values and gameplay contracts. A teacher-authored activity title is separate from the game title. The [11-combination multiplayer V1 matrix](../architecture/MULTIPLAYER_V1_CONTRACT.md) is a *target*, not a declaration that all 11 modes have shipped. Currently shipped online combinations are Memory Turns and Sort Individual only.

### Teaching and authoring
- Local activities use teacher-authored/imported portable JSON, editable content, validation, student preview/practice and teacher presentation. Local files are not automatically uploaded to a classroom room.
- Sort: teacher-designated **one category per card**; learner taps/places or drags; online Individual accepts placements and irreversible submissions. A teacher controls close, reveal and finish.
- Sequence: arrange teacher-defined steps/sentences into one intended order; exact-order checking is not semantic grading of alternative valid sequences.
- Detective: mark teacher-designated error segments (including valid **no-error** cases) and optionally suggest corrections. Free-text corrections are compared with a model, **not automatically linguistically graded**.
- Target/learning language belongs to authored teaching material. **Interface language** (DE/EN/VI) is independent. Room policy is either teacher-forced interface language or student-choice on join/lobby; students in the same eligible room can choose different interface languages.

### Product voice and usability
- Friendly, mature, idiomatic copy; German `du`, English conversational, Vietnamese `bạn` and `thầy cô` where appropriate. Translate intent, not German sentence structure. Keep teacher actions explicit and student irreversible-submission warnings accurate.
- Sort online: `Runde starten` → `Abgabe schließen` → `Ergebnisse zeigen` → `Runde abschließen`; results stay private until server-authoritative reveal. No fictitious timer: closing submissions does not imply “time is up”.
- Teacher primary actions span the host panel; `Raum verlassen` is a compact secondary action separated by 14 px. Leaving unfinished Sort host rooms requests localized confirmation because the host capability is otherwise lost; cancellation preserves session. Real native-browser dialog/navigation on the final release was **not independently browser-tested**.
- Information icon uses a 40 px target with hover/focus/press affordance; its help bubble anchors near the icon, above by default, flips when necessary and is viewport-clamped. Confirmed in synthetic local browser checks, not on physical touch devices.
- Responsive screens were reviewed at 1440, 768, 390 and 360 px during feature acceptance. The final Production smoke tested 1440/390 browser emulation. This is **not** proof of physical devices, Safari/Firefox or screen-reader manual audits.

## 2. Architecture and operating boundaries

```text
Standalone React + Vite SPA on Vercel
  ├── Local: four separate game engines; authoring, presentation, practice
  └── Online: guest room join via URL / code
        ├── Memory Turns → public.game_poc_memory_* RPC family
        └── Sort Individual → public.lg_v1_create/join/state/command
              └── shared SPP Supabase Postgres project iizsyphqlezesbvaiztd
```

No SPP Auth or permanent student accounts; online room capabilities are bearer tokens, not durable identities or homework records. Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are public frontend configuration. Never put service-role keys, bearer capabilities, passwords or actual learner data in docs, screenshots, source or room URLs. The same shared database also supports Speak Practice Pro; coordinate any database/permission operation with its owner.

**Installed Learning Games migration-history sources** (do **not** reapply or edit their historical bytes):

| Local file | Hosted migration version | Purpose |
| --- | --- | --- |
| `supabase/migrations/20261011020958_lg_m3a_memory_room_language.sql` | `20261011020958` | Memory DE/EN/VI room-language policy and `create_v2` |
| `supabase/migrations/20261014_001_mp1_ab_sort_individual.sql` | `20261014` | Four-table Sort Individual foundation; four public RPC wrappers |
| `supabase/migrations/20261015023239_mp1_reveal_lifecycle.sql` | `20261015023239` | Explicit server-authoritative `resultsRevealed` and finish-after-reveal guard |

The SPP project used for live checks was `iizsyphqlezesbvaiztd` (`speak-practice-pro-preview`, Supabase Singapore). Its migration ledger had **17/17 recorded entries** at release. The legacy Memory prototype existed *before* these three migrations and is **not reproducibly bootstrapped by this repo's migration chain**. Clean replay / disaster recovery is an open, separate effort.

### Read-only hosted security verification (2026-10-16)
Verified via connected Supabase metadata and SQL catalog inspection, **without writes**:
- Project status ACTIVE_HEALTHY; version `20261015023239` recorded.
- Installed `lg_v1.state` and `lg_v1.command` source bodies **exactly match** the committed reveal migration (MD5 respectively `08c458521792f22d37faedfcba11c443` and `8866e75e3bc95ba6df53e97d2184ceaf`), with expected `SECURITY DEFINER`, `lg_v1_owner`, empty search path, and finish-before-reveal guard.
- All four `lg_v1` tables (`rooms`, `actors`, `attempts`, `snapshots`) have RLS enabled; `anon` has **no direct SELECT/INSERT/UPDATE/DELETE table grants** and no table policies; only the intended four internal entry functions and four public wrappers allow anonymous execution in the inspected function scope.
- Independently checked in the Supabase browser Dashboard, **after refresh**: exposed Data API schemas are `public` and `graphql_public`; `lg_v1` and `private` are **not exposed**. The **Automatically expose new tables** toggle was seen enabled: track for shared-project hardening; do not flip it incidentally.
- These results verify the inspected configuration, **not** defense against all direct anonymous calls. The intentional public wrappers still accept guest traffic.

## 3. Accepted testing and evidence: distinguish scopes

| Stage | Evidence and outcome | Limits |
| --- | --- | --- |
| Previous Memory/local games | Local and hosted Memory QA; four local game review/owner acceptance during MP0/UX2 | Historical milestones, not the final integrated production test |
| Sort Individual synthetic hosted class | **6 checkpoints accepted:** teacher lobby/share → two students join/place → one submits → teacher closes → teacher reveals personal results → teacher finishes; refresh after relevant phases | One synthetic room, one teacher and two synthetic students; viewport emulation |
| Naming/voice and UI micro-polish | Reviewed DE/EN/VI names, 14 px teacher-action spacing, responsive result chips/category pills, popover placement, label `Ngôn ngữ` | Final physical mobile and screen-reader checks not conducted |
| Integrated independent audit | Sonnet: **CONDITIONAL PASS**, no P0; corrections independently reviewed and **ACCEPTED** | Original open risk decisions tracked below |
| Release-preflight `b9b16d03` | `npm run typecheck` PASS, **490/490 Vitest tests across 38 files** PASS; focused repeat 43/43 PASS; `npm run build` PASS; migration-file diff empty | Vitest workers capped at 2 to prevent contention; global timeout unchanged; bundle size warning remains |
| Live Production deployment | Merge PR #19, `main@360f641b`; Vercel Production READY for matching SHA; candidate vs merge tree diff **0 files** | Does not itself prove every interactive game flow |
| Final Production Chromium smoke | **PASS:** home/navigation, DE/EN/VI localization, four game screens and local checks, responsive 1440/390, Memory and Sort join forms. Zero browser runtime errors, zero network failures/404s and no horizontal overflow in checked routes | Sort host-exit confirmation **NOT TESTED** in Production (no new hosted room allowed); not full live multiplayer replay. AG-reported Chromium inspection |

**Browser release smoke specifics:** Sequence local authoring → 3-step creation → student practice reorder and exact `3/3` check → presentation completed; Detective editor/word marking/validation inspected; Memory/Sort local authoring and online join screens inspected. Do not misrepresent these as a second hosted class test.

### Key provenance references
- Source frozen before preflight: `8c14b845ee4ed7892a224e9e336852255612362f` (micro-polish).
- Source after preflight and independently accepted: `b9b16d03ea9e0ef8ff5c27afc8d089f231144496` (host-exit guard, docs, test stability).
- [Production release PR #19](https://github.com/ducrenevn/learning-games/pull/19) merged via merge commit (not squash/rebase).
- [Preflight report and open risk register](../RELEASE_PREFLIGHT.md), [current state](../CURRENT_STATE.md), [MP0 hosted acceptance](../audits/2026-10-14-mp0-hosted-acceptance.md).
- Original independent audit and final browser smoke result were supplied to the control room in its conversation; they are **not asserted to be GitHub-hosted artifacts**. Historical design and test records remain in `docs/audits/`.

## 4. Deliberately open risks and operational follow-up

The product owner authorized a **small initial classroom launch** to test the games and then add more games later. This is **not** a security certification and does not make anonymous endpoints private.

| Item | Current limitation / follow-up |
| --- | --- |
| Shared SPP resources | Sort and Memory guest RPC load share the SPP database. Start with known teachers and small classes; monitor DB/service health when introducing larger classes. |
| Rate limits and quotas | No verified enforceable backend/edge throttling or aggregate create/join/poll/storage quotas. Frontend restrictions do not prevent callers using Supabase directly. |
| Room codes | Sort uses an 8-character / ~32-bit hex room code with no proven join throttling and an existence oracle; don't equate the code with authenticated identity. |
| Data retention | Room expiry ≠ data deletion. Scheduled physical cleanup, participant names, answers/events and backup retention remain unverified / undecided. Prefer minimal or synthetic display names. |
| Input validation | Direct RPC validator is weaker than TypeScript client validation for some additional fields/payload bounds; harden server side before broad-scale usage. |
| API configuration | `lg_v1` not exposed, but Supabase “Automatically expose new tables” setting was observed enabled; shared owner should evaluate, not silently toggle. |
| SPP history | [SPP PR #12](https://github.com/ducrenevn/speak-practice-pro/pull/12) was **open/draft at last check** and missing the third Learning Games migration in its remote branch. Reconcile before any SPP `db push` or migration. Recheck current status when beginning that work. |
| Legacy Memory replay | Original Memory prototype DDL/install provenance is incomplete; fresh database reconstruction unproven. No historical migration edits. |
| Quality gaps | Native host-exit dialog and full-page navigation not tested in real Production browser; no manual Safari/Firefox/physical touch/screen-reader pass; no CI pipeline; Vite output chunk-size warning. |

These are **tracked technical debt for proportionate follow-up**, not implicit permission to alter SPP or install new hosted SQL. Check [RELEASE_PREFLIGHT](../RELEASE_PREFLIGHT.md) for the pre-release risk rationale. Require separate approvals for hosted DDL, grants, migrations, cleanup jobs, high-volume public rollout and user-record integrations.

## 5. How to operate, verify and recover

**Teacher use:** open Production → choose a game → create/import locally and review/preview → present or practice; if the mode supports rooms, create one and share link/QR or room code. For Sort Individual: students join, place all cards and submit; the host can close submissions, show feedback and finish. Host should avoid discarding the only capability; the unfinished-room Leave action has a confirmation. Never imply a room or learner identity persists across unrelated browser sessions.

**Quick verification after frontend changes:** run `npm run typecheck`, `npm test`, `npm run build`; open Production/Preview on desktop and mobile; verify `/`, `/games/memory/join`, `/games/sort/join`, `/games/sequence`, `/games/language-detective`. Real multiplayer acceptance requires separately authorized synthetic rooms and recorded outcomes.

**Rollback (frontend only):** If a release causes a severe user-facing failure, use Vercel's previous known-good Production deployment for `main@f8ac534026b4fcdcfa0ffa15e61890a4e5389c62` (`dpl_AK7NLtyuoWaSqpR6x9gr3spdPK1u`, subject to current availability). Then reconcile Git `main` with an owner-approved revert of the **merge commit** `360f641b` (merge mainline parent 1) to prevent a future push reintroducing it. Verify alias and routes; **do not roll back the shared database**: the already-installed additive migrations support the old frontend. Rolling back the frontend makes in-flight new Sort rooms unreachable through the old app. Verify actual current deployments before taking any rollback action. No rollback is authorized merely by this documentation.

## 6. Next work: learn from classrooms, then expand games

**V1 is closed.** Do not reopen the previous release audit, keep polishing without a reported issue, replay hosted Memory/MP1 SQL, or silently implement unapproved modes.

1. Use released games in real lessons. Capture concrete teacher/student observations: clarity, pacing, mobile input, language-specific wording, checking/feedback, and which activities encourage conversation.
2. Triage feedback as **bug**, **small polish**, **new game/content**, or **separate backend/multiplayer**; create concise reproductions. Prioritize actual classroom impact.
3. Propose the next **local-first, teacher-led** game or lesson format; reuse the existing workspace, localization voice and portable-content patterns without forcing different game mechanics into a generic engine.
4. Candidate ideas from [Product Catalog](../PRODUCT_CATALOG.md): Quick Response Board, Conversation Cards, Information Gap, Listen & Reconstruct, Explain It; these are ideas, not approved shipped features.
5. Where useful, add an online mode in a **separately reviewed slice**. Do not add accounts, SPP Homework, new tables, per-student media or role-based private content implicitly.
6. Keep SPP schema/abuse/retention coordination in its own task lane with explicit approvals; do not expand public volume based solely on successful small-classroom trials.

**Next control room start:** [START_HERE](../START_HERE.md) → [CURRENT_STATE](../CURRENT_STATE.md) → [GAME_MAP](../GAME_MAP.md) → relevant game spec / `library/` → [this closure](2026-10-16-v1-production.md) as historical release authority. For new features, first obtain the owner's desired teaching outcome, choose a small scope, and then commission implementation/review. No task is currently running on this release.
