# CalTrack Backend v2 — Deployment Guide

The v2 backend package lives in `supabase/functions-v2/` and `supabase/migrations-v2/`.
It is **NOT wired into the running app** — the deployed v1 functions and frozen schema
stay live until the steps below are executed. Nothing in the client breaks if v2 is
deployed first (all response changes are additive; see §5).

**What's in the package**

| Path | What it is |
|---|---|
| `supabase/functions-v2/_shared/mod.ts` | Shared module: CORS, auth, `{error:{code,message}}` envelope (never leaks raw errors), hand-rolled validators, Postgres-backed per-user rate limiter, gateway caller with forced tool-call + one repair-retry |
| `supabase/functions-v2/analyze-food/index.ts` | Photo analysis v2 — gemini-2.5-flash, scene-check/scale-anchor/grams-first/bias-corrected vision prompt, Indian-food priors, `is_food:false` path, one clarifying question, optional micros |
| `supabase/functions-v2/analyze-food-text/index.ts` | Text analysis REBUILT to the same `items[]` contract, tool-called, Hinglish few-shots, per-item `is_water` flag |
| `supabase/functions-v2/generate-insights/index.ts` | Insights v2 — tool-called, max 3, anti-generic (must cite a number/food/day; banned-phrase validation with repair-retry), user-timezone day bucketing |
| `supabase/migrations-v2/0001_integrity.sql` | FKs + ON DELETE CASCADE restored on all user tables, hot-path indexes, meal_type CHECK, `profiles.timezone`/`display_name`, pg_trgm on `food_database.name`, drops email-leaking RPCs |
| `supabase/migrations-v2/0002_items.sql` | `food_log_items` child table + owner RLS + commented backfill |
| `supabase/migrations-v2/0003_rate_limits.sql` | `rate_limits` table + atomic `rate_limit_hit()` RPC |

**Order matters:** run migrations `0001 → 0002 → 0003` first, then deploy functions.
(The functions *fail open* on rate limiting until `0003` exists — they log an error
but keep working — so the reverse order degrades gracefully, it just leaves AI spend
uncapped in the gap.)

---

## 1. Path A — Lovable-managed project (no CLI access)

This project (`misnkzxiahkxmrfinknn`) is Lovable-managed; Lovable owns the Supabase
connection and deploys `supabase/functions/*` and `supabase/migrations/*` automatically
on publish. The v2 package deliberately sits in `-v2` directories so nothing deploys
by accident. To ship it through Lovable:

### 1a. Migrations

Paste this into the Lovable chat (one migration at a time, in order):

> Run the following SQL migration on the connected Supabase project. Do not modify it:
> *(paste full contents of `supabase/migrations-v2/0001_integrity.sql`)*

Repeat for `0002_items.sql`, then `0003_rate_limits.sql`. Lovable will run each through
its migration tool (it will also append them to `supabase/migrations/` with a timestamp —
that is expected and correct).

Alternatively, paste each file directly into **Supabase Dashboard → SQL Editor → Run**
(dashboard access via Lovable → Project Settings → Integrations → Supabase → Manage).
Each file is a single `BEGIN…COMMIT` block, safe to run exactly once, idempotent if re-run.

### 1b. Edge functions

Paste into Lovable chat, one function at a time:

> Replace the contents of `supabase/functions/analyze-food/index.ts` with the file
> `supabase/functions-v2/analyze-food/index.ts`, create
> `supabase/functions/_shared/mod.ts` from `supabase/functions-v2/_shared/mod.ts`,
> and redeploy the function. Do not change the code.

Repeat for `analyze-food-text` and `generate-insights`. Notes:

- `_shared/mod.ts` must be copied **once** into `supabase/functions/_shared/mod.ts`;
  all three functions import it as `../_shared/mod.ts`. Supabase bundles `_shared`
  automatically (directories starting with `_` are not deployed as functions).
- `verify_jwt = true` already set for all three in `supabase/config.toml` — unchanged.
- Required secrets (`LOVABLE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
  already exist from v1 — nothing new to configure.
- `delete-account` is untouched by v2 (and with 0001's cascades it now actually
  deletes everything, fixing the orphaned-data GDPR bug).

## 2. Path B — Supabase CLI (requires project-owner access)

`supabase link --project-ref misnkzxiahkxmrfinknn` prompts for the database password
and requires owner/admin membership on the Supabase org — Lovable-created projects
grant this only to the Lovable account owner, so log in with that account
(`supabase login` opens the browser).

```sh
cd /Users/ayushsharma/caltrack

supabase login
supabase link --project-ref misnkzxiahkxmrfinknn

# Migrations: copy into the tracked migrations dir with fresh timestamps, then push
ts=$(date +%Y%m%d%H%M%S)
cp supabase/migrations-v2/0001_integrity.sql   supabase/migrations/${ts}_v2_integrity.sql
cp supabase/migrations-v2/0002_items.sql       supabase/migrations/$((ts+1))_v2_items.sql
cp supabase/migrations-v2/0003_rate_limits.sql supabase/migrations/$((ts+2))_v2_rate_limits.sql
supabase db push

# Functions: copy v2 sources over the deployable dirs, then deploy
cp supabase/functions-v2/analyze-food/index.ts      supabase/functions/analyze-food/index.ts
cp supabase/functions-v2/analyze-food-text/index.ts supabase/functions/analyze-food-text/index.ts
cp supabase/functions-v2/generate-insights/index.ts supabase/functions/generate-insights/index.ts
mkdir -p supabase/functions/_shared
cp supabase/functions-v2/_shared/mod.ts             supabase/functions/_shared/mod.ts

supabase functions deploy analyze-food
supabase functions deploy analyze-food-text
supabase functions deploy generate-insights
```

Caution: if Lovable later publishes, it re-deploys whatever is in
`supabase/functions/` — which is why the copy step above overwrites those files
in the repo rather than deploying from `-v2` paths directly.

## 3. Storage: make `food-images` private + signed URLs

The bucket was fixed once and reverted to public. With v2:

```sql
-- SQL editor (or ask Lovable to run it)
UPDATE storage.buckets SET public = false WHERE id = 'food-images';

-- Owner-scoped policies (uploads already go to <uid>/<filename>)
DROP POLICY IF EXISTS "Users can read own food images" ON storage.objects;
CREATE POLICY "Users can read own food images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload own food images" ON storage.objects;
CREATE POLICY "Users can upload own food images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own food images" ON storage.objects;
CREATE POLICY "Users can delete own food images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

Client change (required at the same time — public URLs stop resolving):

- Keep storing the storage **path** (`<uid>/<file>.webp`) in `food_logs.image_url`
  (or keep full URLs and extract the path).
- Wherever a thumb is rendered (`LogItemRow`, MealDetail), resolve via
  `supabase.storage.from("food-images").createSignedUrl(path, 3600)` — do this inside
  a small `useSignedImage(path)` hook in the hooks layer with a React Query cache
  (staleTime ≤ signed TTL), NOT per-component.
- Upload flow is unchanged (`upload()` works the same on private buckets).

## 4. Auth RPC removal

`0001_integrity.sql` drops `get_email_by_username(text)` and
`get_user_by_username_or_email(text)` — SECURITY DEFINER functions that leaked user
emails to **anonymous** callers. v2 Auth signs in with email only and no longer calls
them (verify with `grep -r "get_email_by_username\|get_user_by_username_or_email" src/`
→ must be empty before running 0001). `check_username_exists` is kept: it returns only
a boolean. After running the migration, regenerate `src/integrations/supabase/types.ts`
(Lovable does this automatically; CLI: `supabase gen types typescript --linked`).

## 5. Client changes when v2 functions are live (`src/lib/analyze.ts`)

All v2 response changes are **additive**, so the current client keeps working
unmodified. To use the new capabilities:

1. **`analyzeText()` — biggest win.** `analyze-food-text` now returns the same
   `items[]` array as the photo flow (request body stays `{ description }`).
   Map `items[] → DraftItem[]` exactly as `analyzePhoto` does, instead of wrapping
   the single `nutritionData` blob into one DraftItem. Keep the blob path as a
   fallback while v1 might still be deployed:
   `if (Array.isArray(data.items) && data.items.length) → per-item; else → blob`.
2. **`is_food:false`** (both analyze functions): response now carries
   `{ is_food: false, reason, items: [] }` with HTTP 200. Check it before mapping and
   surface `reason` as a friendly sonner toast ("That looks like a very good dog…")
   instead of the generic "Invalid response from analysis" error.
3. **`clarifying_question`** (both): optional string. Surface it as a single tappable
   chip on the review sheet (answering appends to the description / hint and re-runs
   the analysis). Never block logging on it — items are always present.
4. **`items[].is_water`** (text only): route items with `is_water: true` to
   `useLogWater` (portion string carries the ml) instead of creating a food log.
5. **`items[].confidence`** stays 0–100 — no change to the confidence pip.
6. **Micros are now optional** — `vitamin_a`/`vitamin_c`/`calcium`/`iron` may be
   absent from items and `nutritionData`. The v2 client already ignores them
   (`toMacroSet` reads only the 7 core fields) — just never assume they exist.
7. **Error envelope**: failures are now `{ error: { code, message } }` with proper
   status codes (401/400/429/402/502/500) and `message` is always user-safe.
   `supabase.functions.invoke` puts the parsed body on `error.context` /
   the response; show `error.code === "rate_limited"` as "Give it a minute" and
   anything else via the safe `message`. `generate-insights` no longer returns
   HTTP 200 with canned fallback insights on failure — keep the client-side
   fallback in `useInsight` (it already caches per-day in localStorage).
8. **`items[].portion_basis`** (photo only, optional): short provenance string
   ("anchored on fork ≈ 19 cm"). Nice for a tooltip; safe to ignore.
9. **Timezone**: after 0001, have the client write
   `Intl.DateTimeFormat().resolvedOptions().timeZone` to `profiles.timezone` at
   login/onboarding (one `useUpdateProfile` call) so insights bucket days correctly.

## 6. Post-deploy verification checklist

- [ ] `analyze-food` with a food photo → itemized result, confidences, portion grams.
- [ ] `analyze-food` with a non-food photo (pet/desk) → `is_food:false` + friendly reason, HTTP 200.
- [ ] `analyze-food-text` with `"2 roti with dal and a glass of lassi"` → 3 items, desi portions, clarifying question about the lassi.
- [ ] `analyze-food-text` with `"ek glass paani"` → 1 item with `is_water:true`, 0 kcal.
- [ ] 11 rapid `analyze-food` calls → 11th returns 429 `{error:{code:"rate_limited"}}`.
- [ ] `generate-insights` → ≤3 insights, each citing a number/food/day; no banned phrases.
- [ ] `DELETE` a test account via `delete-account` → zero rows remain in any user table.
- [ ] `SELECT * FROM pg_indexes WHERE indexname LIKE 'idx_%logged_at';` → 4 rows.
- [ ] Food image URL from another user's session → 403 (bucket private).
