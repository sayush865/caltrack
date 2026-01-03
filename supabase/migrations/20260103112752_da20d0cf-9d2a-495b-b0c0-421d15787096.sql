-- Create water_logs table for hydration tracking
CREATE TABLE public.water_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount_ml INTEGER NOT NULL DEFAULT 250,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own water logs" 
ON public.water_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own water logs" 
ON public.water_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own water logs" 
ON public.water_logs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add daily_water goal to user_goals table
ALTER TABLE public.user_goals 
ADD COLUMN IF NOT EXISTS daily_water INTEGER NOT NULL DEFAULT 2000;

-- Enable realtime for water_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.water_logs;