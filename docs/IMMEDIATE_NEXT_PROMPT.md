# Immediate Next Handoff — Milestone M2 (Vercel Deployment)

Scope: Connect `ducrenevn/learning-games` to Vercel, deploy, and perform hosted phone smoke testing.

## Prerequisites (Verified in M1)
- Branch `feat/memory-foundation` is tested and verified.
- 20/20 unit tests pass (`npm test`).
- Production build succeeds (`npm run build`).
- `vercel.json` rewrite configuration is in place for SPA routing.
- Audit report available in `docs/audits/2026-10-09-m1-qa-report.md`.

## Step-by-Step Next Actions

1. **Review and Merge/Deploy Branch:**
   - Commit and push `feat/memory-foundation` to GitHub.
   - Review changes or open PR into `main` (owner decision).
   - In Vercel, import `ducrenevn/learning-games`.

2. **Configure Vercel Project Settings:**
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variables:
     - `VITE_SUPABASE_URL`: `https://iizsyphqlezesbvaiztd.supabase.co`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`: *(Set public publishable key only; NEVER add secret/service-role keys)*

3. **Deploy & Smoke Test:**
   - Trigger initial deployment.
   - Test hosted URL:
     - Check homepage `/` and Memory `/games/memory`.
     - Test deep link refresh (e.g. `/games/memory/join`) to confirm `vercel.json` rewrite serves `index.html`.
     - Teacher creates a test room on desktop; student joins by scanning the QR code on a mobile phone.
     - Play one full game to completion to verify hosted WebSocket/polling and turn advancement.
