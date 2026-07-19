-- migrations-v2/0001_integrity.sql
-- Data-integrity restoration for CalTrack v2.
--
-- Background: migration 20251001095049 dropped profiles_id_fkey and
-- food_logs_user_id_fkey as a dev shortcut (and inserted a dummy profile
-- 00000000-...), and every table created after that shipped WITHOUT a
-- user_id foreign key. Result: delete-account orphans nearly all user data.
-- This migration restores FKs with ON DELETE CASCADE everywhere, adds the
-- hot-path indexes, the meal_type CHECK, profiles.timezone / display_name,
-- pg_trgm search on food_database.name, and drops the email-leaking
-- SECURITY DEFINER RPCs.
--
-- Safe to run on a live database: orphaned rows are deleted FIRST so the
-- FK additions cannot fail, and everything is idempotent (IF EXISTS /
-- IF NOT EXISTS / drop-then-add).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Remove orphaned rows (including the dev dummy profile) so FKs validate
-- ---------------------------------------------------------------------------

DELETE FROM public.profiles p
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);

DELETE FROM public.food_logs t
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id);
DELETE FROM public.water_logs t
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id);
DELETE FROM public.exercise_logs t
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id);
DELETE FROM public.weight_logs t
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id);
DELETE FROM public.user_goals t
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id);
DELETE FROM public.user_streaks t
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id);
DELETE FROM public.user_achievements t
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id);
DELETE FROM public.meal_templates t
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id);
DELETE FROM public.weekly_challenges t
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id);

-- ---------------------------------------------------------------------------
-- 2. Restore foreign keys with ON DELETE CASCADE (all user tables → auth.users)
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.food_logs
  DROP CONSTRAINT IF EXISTS food_logs_user_id_fkey;
ALTER TABLE public.food_logs
  ADD CONSTRAINT food_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.water_logs
  DROP CONSTRAINT IF EXISTS water_logs_user_id_fkey;
ALTER TABLE public.water_logs
  ADD CONSTRAINT water_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.exercise_logs
  DROP CONSTRAINT IF EXISTS exercise_logs_user_id_fkey;
ALTER TABLE public.exercise_logs
  ADD CONSTRAINT exercise_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- weight_logs originally referenced public.profiles(id); re-point to auth.users
ALTER TABLE public.weight_logs
  DROP CONSTRAINT IF EXISTS weight_logs_user_id_fkey;
ALTER TABLE public.weight_logs
  ADD CONSTRAINT weight_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_goals
  DROP CONSTRAINT IF EXISTS user_goals_user_id_fkey;
ALTER TABLE public.user_goals
  ADD CONSTRAINT user_goals_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_streaks
  DROP CONSTRAINT IF EXISTS user_streaks_user_id_fkey;
ALTER TABLE public.user_streaks
  ADD CONSTRAINT user_streaks_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_achievements
  DROP CONSTRAINT IF EXISTS user_achievements_user_id_fkey;
ALTER TABLE public.user_achievements
  ADD CONSTRAINT user_achievements_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.meal_templates
  DROP CONSTRAINT IF EXISTS meal_templates_user_id_fkey;
ALTER TABLE public.meal_templates
  ADD CONSTRAINT meal_templates_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- weekly_challenges is slated for deletion in v2 but still exists; cover it
-- so no user table can orphan in the meantime.
ALTER TABLE public.weekly_challenges
  DROP CONSTRAINT IF EXISTS weekly_challenges_user_id_fkey;
ALTER TABLE public.weekly_challenges
  ADD CONSTRAINT weekly_challenges_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 3. Hot-path composite indexes: (user_id, logged_at DESC)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_food_logs_user_logged_at
  ON public.food_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_water_logs_user_logged_at
  ON public.water_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_logged_at
  ON public.exercise_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_logged_at
  ON public.weight_logs (user_id, logged_at DESC);

-- ---------------------------------------------------------------------------
-- 4. meal_type CHECK (normalize legacy values first: v1 wrote 'Other' etc.)
-- ---------------------------------------------------------------------------

UPDATE public.food_logs
  SET meal_type = lower(meal_type)
  WHERE meal_type IS NOT NULL AND meal_type <> lower(meal_type);

UPDATE public.food_logs
  SET meal_type = 'snack'
  WHERE meal_type IS NOT NULL
    AND meal_type NOT IN ('breakfast', 'lunch', 'dinner', 'snack');

ALTER TABLE public.food_logs
  DROP CONSTRAINT IF EXISTS food_logs_meal_type_check;
ALTER TABLE public.food_logs
  ADD CONSTRAINT food_logs_meal_type_check
  CHECK (meal_type IS NULL OR meal_type IN ('breakfast', 'lunch', 'dinner', 'snack'));

-- ---------------------------------------------------------------------------
-- 5. profiles: timezone (IANA name, set by the client at login/onboarding via
--    Intl.DateTimeFormat().resolvedOptions().timeZone) + display_name
--    (free-text; stops onboarding from clobbering the unique signup username)
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- ---------------------------------------------------------------------------
-- 6. Trigram search on food_database.name (substring search hot path)
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_food_database_name_trgm
  ON public.food_database USING gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 7. Drop the email-leaking SECURITY DEFINER RPCs.
--    v2 Auth signs in with email only; these leaked user emails to anonymous
--    callers. (check_username_exists stays: it returns only a boolean.)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_email_by_username(text);
DROP FUNCTION IF EXISTS public.get_user_by_username_or_email(text);

COMMIT;
