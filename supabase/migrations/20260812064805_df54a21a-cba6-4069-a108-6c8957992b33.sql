ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS diet_type text,
  ADD COLUMN IF NOT EXISTS cuisines text[],
  ADD COLUMN IF NOT EXISTS allergies text[],
  ADD COLUMN IF NOT EXISTS dislikes text[],
  ADD COLUMN IF NOT EXISTS meals_per_day integer,
  ADD COLUMN IF NOT EXISTS cooking_style text,
  ADD COLUMN IF NOT EXISTS food_notes text;