ALTER TABLE public.food_logs
  ADD COLUMN IF NOT EXISTS vitamin_b12 numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS folate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vitamin_d numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zinc numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS magnesium numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS potassium numeric DEFAULT 0;

ALTER TABLE public.meal_templates
  ADD COLUMN IF NOT EXISTS vitamin_b12 numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS folate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vitamin_d numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zinc numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS magnesium numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS potassium numeric DEFAULT 0;