-- Drop the strict username format constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_username_format;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS username_format;

-- Add a more permissive constraint that just ensures reasonable length
-- Allow any characters, just enforce minimum 1 and maximum 50 characters
ALTER TABLE public.profiles ADD CONSTRAINT username_length_check 
  CHECK (username IS NULL OR (length(trim(username)) >= 1 AND length(username) <= 50));