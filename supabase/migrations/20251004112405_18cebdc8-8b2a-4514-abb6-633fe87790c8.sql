-- Fix 1: Make food-images bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'food-images';

-- Fix 2: Update storage RLS policies to require user ownership
-- Drop existing policies for food-images bucket if any
DROP POLICY IF EXISTS "Users can upload their own food images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own food images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own food images" ON storage.objects;

-- Create secure RLS policies for food-images bucket
CREATE POLICY "Users can upload their own food images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'food-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own food images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'food-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own food images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'food-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own food images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'food-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix 3: Add database constraints for input validation
-- Add check constraints on user_goals table
ALTER TABLE public.user_goals
ADD CONSTRAINT check_daily_calories CHECK (daily_calories >= 800 AND daily_calories <= 10000),
ADD CONSTRAINT check_daily_protein CHECK (daily_protein >= 0 AND daily_protein <= 500),
ADD CONSTRAINT check_daily_carbs CHECK (daily_carbs >= 0 AND daily_carbs <= 1000),
ADD CONSTRAINT check_daily_fat CHECK (daily_fat >= 0 AND daily_fat <= 500),
ADD CONSTRAINT check_current_weight CHECK (current_weight IS NULL OR (current_weight >= 20 AND current_weight <= 500)),
ADD CONSTRAINT check_goal_weight CHECK (goal_weight IS NULL OR (goal_weight >= 20 AND goal_weight <= 500));

-- Add username format constraint
ALTER TABLE public.profiles
ADD CONSTRAINT check_username_format CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');