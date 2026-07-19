-- migrations-v2/0003_rate_limits.sql
-- Per-user rate limiting for AI edge functions.
--
-- Supabase does not rate-limit inbound edge-function calls, so any
-- authenticated user could spend unlimited gateway credits. The v2 shared
-- module (functions-v2/_shared/mod.ts, enforceRateLimit) calls
-- rate_limit_hit() before every AI call. The counter bump is ONE atomic
-- INSERT ... ON CONFLICT DO UPDATE ... RETURNING — no read-modify-write race.
--
-- Windows are fixed buckets: window_start = epoch floored to the window size.
-- Defaults used by the functions: analyze-food 10/min, analyze-food-text
-- 15/min, generate-insights 6/hour.

BEGIN;

CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, endpoint, window_start)
);

-- RLS on with NO policies: clients can never read or write this table.
-- Edge functions use the service role, which bypasses RLS, and go through
-- the SECURITY DEFINER function below anyway.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rate_limits_window
  ON public.rate_limits (window_start);

CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_window_seconds INTEGER,
  p_limit INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  v_window := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO rate_limits (user_id, endpoint, window_start, count)
  VALUES (p_user_id, p_endpoint, v_window, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO v_count;

  -- Opportunistic cleanup of stale windows (~1% of calls, cheap via the index).
  IF random() < 0.01 THEN
    DELETE FROM rate_limits WHERE window_start < now() - interval '2 days';
  END IF;

  RETURN v_count <= p_limit;
END;
$$;

-- Only the service role may execute (it would bypass RLS regardless, but
-- locking EXECUTE keeps authenticated users from spinning the counter).
REVOKE EXECUTE ON FUNCTION public.rate_limit_hit(UUID, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(UUID, TEXT, INTEGER, INTEGER)
  TO service_role;

COMMIT;
