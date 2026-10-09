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
