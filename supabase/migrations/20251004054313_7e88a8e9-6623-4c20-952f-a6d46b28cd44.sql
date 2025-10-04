-- Add image_url column to food_database
ALTER TABLE public.food_database 
ADD COLUMN image_url text;