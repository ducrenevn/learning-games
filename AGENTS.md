# Learning Games — Working Rules

1. Read `docs/START_HERE.md`, `docs/CURRENT_STATE.md`, `docs/SYSTEM_OVERVIEW.md`, `docs/ROADMAP.md` before substantial work.
2. Working software outranks optimistic documentation. Verify code and tests; report unverified browser/hosted behavior explicitly.
3. Keep game engines independent. Shared components are promoted only when two games actually need them.
4. Never modify Speak Practice Pro's (SPP) speaking, Auth, Homework or database schema as an incidental game task. Hosted DDL requires separately approved migration.
5. For the prototype, use existing `public.game_poc_memory_*` RPCs only. Anonymous capability tokens are not identity assurance or a permanent learning-record solution.
6. No service-role keys in browser code; only public publishable keys. Avoid logging room capabilities or leaking them into QR URLs.
7. Keep the working Canva Code version intact as a reference while the port reaches parity.
8. Never claim tests, Vercel, Realtime, or SPP integration passed unless they were actually performed.
9. Source changes should include relevant documentation updates and tests; review `docs/IMMEDIATE_NEXT_PROMPT.md` when handing off.
10. Development order: local runnable app → Memory parity → multi-browser proof → Vercel → optimization → other games / SPP integration.

## Shared agent execution conventions (configuration alignment, 2026-10-09)

The reusable engineering procedure, skill sources and model/harness routing are maintained in `ducrenevn/ai-agent-config` (`docs/EXECUTION_PROTOCOL.md`, `docs/AGENT_ROUTING.md`, and `docs/HARNESS_CONFIGURATION_AND_VALIDATION.md`). This repository remains authoritative for its own architecture, product invariants, verified commands, provider topology and approval gates. Normal implementation agents must **not** fetch the global repository as a runtime prerequisite; they operate from this checkout, their task handoff and whichever user-level skills are actually installed and recognized by their harness.

Use a lightweight consistent loop: identify this repo and task; inspect branch/HEAD/worktree without discarding user changes; read only task-relevant instructions/code; discover actual OS/shell/CLI commands or use known-good project scripts; verify available and authenticated tools separately from authorization; perform bounded approved work; run proportional checks; report exact evidence and stop. Never assume a `.cmd` shim, Bash/PowerShell quoting, unverified CLI flag, MCP login or release target will work merely because an earlier chat mentioned it. Diagnose failed commands from help/output rather than repeatedly guessing. Do not claim source tests, hosted browser checks, deployment and production behavior are interchangeable.

Roles/subagents are optional execution capabilities, not mandatory ceremony: delegate only for genuine specialist tooling, isolated context or independent review. Model and provider bindings remain global/harness-level rather than being duplicated here. A repository documentation update does **not** install skills or change VS Code settings, local MCP, credentials, application code, or deployment approval.

## Provider routing clarification (verified 2026-10-09)

Learning Games has its own **Vercel** frontend project, but uses the **existing SPP Supabase** project and only its approved narrow Memory prototype RPCs. It is not independently authorized to modify SPP Auth, Homework schema, policies, grants or production learner records. The Vercel project was visible through read-only provider discovery; app/user-level VS Code tools were not verified. Canva is a linking/presentation or original prototype context, not evidence of a synchronized backend or installed Canva coding-agent integration. Use source-defined public environment-variable names only; never expose tokens or room capabilities.
