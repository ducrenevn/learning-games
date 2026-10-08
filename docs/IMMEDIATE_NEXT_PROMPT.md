# Immediate Next Handoff

Scope: verify and harden `feat/memory-foundation` without deploying it yet.

1. Install dependencies and run `npm run typecheck`, `npm test`, `npm run build`. Capture real output.
2. Compare source with latest Canva HTML baseline. Fix code regressions or edge cases found by review.
3. Local-browser test 1/2 players, matches/mismatches, end state, variable pair lists.
4. Configure the public Supabase URL and publishable key locally, using synthetic data only.
5. Verify online create → join from another browser → start → flip two cards → auto-next → scores → finish → reload → leave.
6. Check that the room result/phase cannot be faked in client and that hidden pairs stay hidden.
7. Fix layout and accessibility defects on desktop/mobile.
8. Update `CURRENT_STATE.md` with exact evidence, branch SHA, clean/dirty status, blockers.
9. Keep SPP database and Vercel unmodified until the owner explicitly approves deployment.

This list is a test plan, not proof of successful tests.
