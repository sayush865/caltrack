-- Make food-images bucket public for permanent image access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'food-images';