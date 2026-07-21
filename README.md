# CalTrack AI

**Log it in a photo. Trust the number. Keep the habit.**

AI-first calorie & nutrition tracker: snap a plate (or describe it in a sentence) and get a
decomposed, editable, confidence-labeled breakdown in seconds — with adherence-neutral,
weekly-adaptive targets instead of red numbers and guilt.

## Stack

- React 18 + TypeScript + Vite, Tailwind + shadcn/ui, TanStack Query, react-router
- Supabase (Postgres, Auth, Storage, Edge Functions)
- Gemini vision/text models for food analysis (via edge functions)

## Develop

```sh
npm install
npm run dev        # http://localhost:8080
```

Environment (see `.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.

## Deploy

- **Frontend:** static Vite SPA — Vercel/Netlify/Cloudflare Pages (`npm run build`, SPA rewrites in `vercel.json`).
- **Backend:** migrations in `supabase/migrations` (+ staged improvements in `supabase/migrations-v2`),
  edge functions in `supabase/functions` (+ improved `supabase/functions-v2`). See `docs/DEPLOY.md`.

## Product docs

The product strategy behind the 2026 rebuild lives in [`docs/`](docs/): PRD, design system,
information architecture & flows, research takeaways, and code contracts.
