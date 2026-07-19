-- migrations-v2/0002_items.sql
-- food_log_items: per-item child table for decomposed AI analyses.
--
-- v1 flattened Gemini's per-item breakdown into one aggregated food_logs row
-- at save time (destroying per-item editing forever). The v1.5 client works
-- around the frozen schema by writing ONE food_logs row PER item and packing
-- item metadata (portion, confidence, quantity, shared mealId) into
-- food_logs.notes as LogMeta JSON. This table is the proper home for that
-- data once v2 is live: food_logs becomes the meal envelope, food_log_items
-- carries the items.
--
-- Requires 0001_integrity.sql (FKs restored) to have run first.

BEGIN;

CREATE TABLE IF NOT EXISTS public.food_log_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_log_id UUID NOT NULL REFERENCES public.food_logs(id) ON DELETE CASCADE,
  -- Denormalized owner column so RLS never needs a join.
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  portion TEXT,                                   -- "1 katori (160 g)"
  quantity NUMERIC NOT NULL DEFAULT 1
    CHECK (quantity > 0 AND quantity <= 50),      -- multiplier on base macros
  unit TEXT,                                      -- optional explicit unit ("g", "ml", "piece")
  confidence NUMERIC
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100)),
  -- Per-1x base nutrition (display = base * quantity; never mutate base).
  calories NUMERIC NOT NULL DEFAULT 0 CHECK (calories >= 0),
  protein NUMERIC NOT NULL DEFAULT 0 CHECK (protein >= 0),
  carbs NUMERIC NOT NULL DEFAULT 0 CHECK (carbs >= 0),
  fat NUMERIC NOT NULL DEFAULT 0 CHECK (fat >= 0),
  fiber NUMERIC CHECK (fiber IS NULL OR fiber >= 0),
  sugar NUMERIC CHECK (sugar IS NULL OR sugar >= 0),
  sodium NUMERIC CHECK (sodium IS NULL OR sodium >= 0),
  is_water BOOLEAN NOT NULL DEFAULT false,
  source TEXT CHECK (source IS NULL OR source IN ('photo', 'text', 'quick', 'library', 'manual', 'barcode')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Owner-only RLS
ALTER TABLE public.food_log_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own food log items" ON public.food_log_items;
CREATE POLICY "Users can view own food log items"
  ON public.food_log_items FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own food log items" ON public.food_log_items;
CREATE POLICY "Users can insert own food log items"
  ON public.food_log_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own food log items" ON public.food_log_items;
CREATE POLICY "Users can update own food log items"
  ON public.food_log_items FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own food log items" ON public.food_log_items;
CREATE POLICY "Users can delete own food log items"
  ON public.food_log_items FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_food_log_items_food_log
  ON public.food_log_items (food_log_id);
CREATE INDEX IF NOT EXISTS idx_food_log_items_user_created
  ON public.food_log_items (user_id, created_at DESC);

COMMIT;

-- ---------------------------------------------------------------------------
-- BACKFILL NOTE (run manually AFTER the v2 client that reads food_log_items
-- ships; do NOT run while the v1.5 row-per-item client is the live writer):
--
-- The v1.5 client stores one food_logs row per item with LogMeta JSON in
-- notes ({"v":2,"source":...,"portion":...,"confidence":...,"quantity":...,
-- "mealId":...}). A faithful backfill creates one food_log_items row per
-- existing food_logs row:
--
--   INSERT INTO public.food_log_items
--     (food_log_id, user_id, name, portion, quantity, confidence,
--      calories, protein, carbs, fat, fiber, sugar, sodium, source)
--   SELECT
--     fl.id, fl.user_id, COALESCE(fl.food_name, 'Food'),
--     NULLIF(fl.notes::jsonb ->> 'portion', ''),
--     COALESCE(NULLIF(fl.notes::jsonb ->> 'quantity', '')::numeric, 1),
--     NULLIF(fl.notes::jsonb ->> 'confidence', '')::numeric,
--     COALESCE(fl.calories, 0), COALESCE(fl.protein, 0),
--     COALESCE(fl.carbs, 0), COALESCE(fl.fat, 0),
--     fl.fiber, fl.sugar, fl.sodium,
--     NULLIF(fl.notes::jsonb ->> 'source', '')
--   FROM public.food_logs fl
--   WHERE fl.status = 1
--     AND fl.notes IS NOT NULL
--     AND fl.notes ~ '^\s*\{'          -- only LogMeta-JSON rows
--     AND NOT EXISTS (SELECT 1 FROM public.food_log_items i
--                     WHERE i.food_log_id = fl.id);
--
-- Rows whose notes are not JSON (legacy free-text notes) are left as
-- envelope-only meals — the client already renders those from food_logs.
-- ---------------------------------------------------------------------------
