-- Add DELETE policies for profiles and user_goals tables
CREATE POLICY "Users can delete own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = id);

CREATE POLICY "Users can delete own goals" 
ON public.user_goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add username validation constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT username_format 
CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');

-- Add constraint to prevent reserved usernames
ALTER TABLE public.profiles 
ADD CONSTRAINT username_not_reserved 
CHECK (username IS NULL OR username NOT IN ('admin', 'root', 'system', 'moderator', 'administrator', 'support', 'help', 'api', 'www', 'mail', 'smtp', 'ftp', 'abuse'));