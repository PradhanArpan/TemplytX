# TemplytX

**Just write.** — Submission-ready compliance for research documents.

## Current phase: front-end design (no backend)
The app runs entirely on an in-memory mock data layer. No API keys, no auth,
no Supabase connection needed. Deploys to Vercel with zero configuration.

```
npm install
npm run dev      # local
npm run build    # production build (what Vercel runs)
```

Data resets on hard refresh — that's expected for this phase. Creating a
document, choosing a template, and navigating all work against the mock.

## Architecture
- Block model (`src/types/document.ts`) — single source of truth, editor-agnostic.
- Services (`src/services/`) — mock-only right now. Same signatures the
  Supabase version will restore, so screens never change when the backend lands.
- Compliance engine (`src/features/compliance/`) — pure-function rule registry.
- Design tokens (`src/styles/tokens.css`) — the file the design phase edits.

## Parked for the auth phase (in repo, not wired)
- `supabase/migrations/` — schema + RLS + seed (solo ownership, sharing-ready).
- `src/services/_supabase_later/` — Supabase-backed services (`.bak` = inert).
  When auth is switched on, these replace the mock services 1:1.

## Deploy (GitHub → Vercel)
1. Push repo to GitHub.
2. Import on Vercel — auto-detects Vite, no env vars needed.
3. `vercel.json` handles SPA routing (deep links / refresh).

## Excluded from V1
Real-time collab · track changes · AI content generation · PDF import ·
two-way LaTeX editing · direct journal submission.
