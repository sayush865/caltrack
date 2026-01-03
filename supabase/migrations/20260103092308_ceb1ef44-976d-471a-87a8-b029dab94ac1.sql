-- Create/replace function for case-insensitive email lookup by username
CREATE OR REPLACE FUNCTION public.get_email_by_username(lookup_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM profiles 
  WHERE LOWER(username) = LOWER(lookup_username) 
  LIMIT 1;
$$;

-- Create function to check if username exists (case-insensitive)
CREATE OR REPLACE FUNCTION public.check_username_exists(lookup_username text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE LOWER(username) = LOWER(lookup_username)
  );
$$;