# Immediate Next Handoff — Milestone M3 (Multiplayer Polish & Hardening)

Scope: Implement per-player claim coloring, refine turn responsiveness, address cross-platform assets, and evaluate room lifecycle / abuse protections.

## Status (Verified in M2 Acceptance)
- Live production deployment at `https://learning-games-rho.vercel.app/` verified with real smartphone user.
- 3-participant live multiplayer test passed cleanly (turns, auto-advance, scoring, winner screen, phone refresh recovery).
- Full audit report recorded in `docs/audits/2026-10-09-m2-hosted-acceptance.md`.

## Recommended M3 Action Items

1. **Per-Player Claim Coloring (UX feedback from owner):**
   - Assign distinct, accessible colors or badges per player in the lobby/game (e.g. Player 1: Teal, Player 2: Coral/Terracotta, Player 3: Indigo, etc.).
   - When cards are matched, style the revealed borders/backgrounds with the claiming player's assigned color instead of the uniform terracotta frame.

2. **Cross-Platform Emoji / Asset Evaluation:**
   - Observe that system emojis render differently across OS fonts (e.g. Windows vs. iOS/Android emoji color/glyphs).
   - If uniform appearance is desired across platforms, consider adopting an open emoji font/SVG set (e.g. Twemoji) or allow text-only/image asset pairs.

3. **Multiplayer Transport & Realtime Evaluation:**
   - Benchmark polling traffic (currently 1 Hz per client) vs. Supabase Realtime Broadcast.
   - Profile egress and connection behavior for larger groups (e.g. 10–20 students).

4. **Abuse Hardening & Room Lifecycle:**
   - Implement client-side and RPC-level rate limiting or CAPTCHA for anonymous room creation.
   - Clean up abandoned or inactive rooms on a regular schedule.
