-- Create food database table with comprehensive nutritional information
CREATE TABLE public.food_database (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  serving_size text NOT NULL,
  serving_unit text NOT NULL DEFAULT 'g',
  calories numeric NOT NULL,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric NOT NULL DEFAULT 0,
  fat numeric NOT NULL DEFAULT 0,
  fiber numeric DEFAULT 0,
  sugar numeric DEFAULT 0,
  sodium numeric DEFAULT 0,
  vitamin_a numeric DEFAULT 0,
  vitamin_c numeric DEFAULT 0,
  calcium numeric DEFAULT 0,
  iron numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.food_database ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read from food database
CREATE POLICY "Anyone can view food database" 
ON public.food_database 
FOR SELECT 
USING (true);

-- Create index for faster searches
CREATE INDEX idx_food_database_name ON public.food_database(name);
CREATE INDEX idx_food_database_category ON public.food_database(category);

-- Insert sample food items with accurate nutritional data
INSERT INTO public.food_database (name, category, serving_size, serving_unit, calories, protein, carbs, fat, fiber, sugar, sodium, vitamin_a, vitamin_c, calcium, iron) VALUES
-- Fruits
('Apple', 'Fruits', '100', 'g', 52, 0.3, 14, 0.2, 2.4, 10, 1, 54, 4.6, 6, 0.12),
('Banana', 'Fruits', '100', 'g', 89, 1.1, 23, 0.3, 2.6, 12, 1, 64, 8.7, 5, 0.26),
('Orange', 'Fruits', '100', 'g', 47, 0.9, 12, 0.1, 2.4, 9, 0, 225, 53, 40, 0.1),
('Strawberry', 'Fruits', '100', 'g', 32, 0.7, 8, 0.3, 2, 4.9, 1, 12, 58.8, 16, 0.41),
('Blueberry', 'Fruits', '100', 'g', 57, 0.7, 14, 0.3, 2.4, 10, 1, 54, 9.7, 6, 0.28),

-- Vegetables
('Broccoli', 'Vegetables', '100', 'g', 34, 2.8, 7, 0.4, 2.6, 1.7, 33, 623, 89.2, 47, 0.73),
('Carrot', 'Vegetables', '100', 'g', 41, 0.9, 10, 0.2, 2.8, 4.7, 69, 835, 5.9, 33, 0.3),
('Spinach', 'Vegetables', '100', 'g', 23, 2.9, 3.6, 0.4, 2.2, 0.4, 79, 469, 28, 99, 2.7),
('Tomato', 'Vegetables', '100', 'g', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 5, 833, 13.7, 10, 0.27),
('Cucumber', 'Vegetables', '100', 'g', 16, 0.7, 3.6, 0.1, 0.5, 1.7, 2, 105, 2.8, 16, 0.28),

-- Proteins
('Chicken Breast', 'Proteins', '100', 'g', 165, 31, 0, 3.6, 0, 0, 74, 21, 0, 15, 1),
('Salmon', 'Proteins', '100', 'g', 208, 20, 0, 13, 0, 0, 59, 149, 0, 12, 0.8),
('Eggs', 'Proteins', '100', 'g', 155, 13, 1.1, 11, 0, 1.1, 124, 540, 0, 56, 1.75),
('Greek Yogurt', 'Dairy', '100', 'g', 59, 10, 3.6, 0.4, 0, 3.2, 36, 27, 0, 110, 0.04),
('Tofu', 'Proteins', '100', 'g', 76, 8, 1.9, 4.8, 0.3, 0.7, 7, 85, 0.1, 350, 5.4),

-- Grains
('Brown Rice', 'Grains', '100', 'g', 111, 2.6, 23, 0.9, 1.8, 0.4, 5, 0, 0, 10, 0.4),
('Quinoa', 'Grains', '100', 'g', 120, 4.4, 21, 1.9, 2.8, 0.9, 7, 5, 0, 17, 1.5),
('Oats', 'Grains', '100', 'g', 389, 16.9, 66, 6.9, 10.6, 0, 2, 0, 0, 54, 4.7),
('Whole Wheat Bread', 'Grains', '100', 'g', 247, 13, 41, 3.4, 6, 5, 400, 0, 0, 107, 3.6),
('Pasta', 'Grains', '100', 'g', 131, 5, 25, 1.1, 1.8, 0.6, 1, 0, 0, 7, 0.5),

-- Nuts & Seeds
('Almonds', 'Nuts', '100', 'g', 579, 21, 22, 50, 12.5, 4.4, 1, 2, 0, 269, 3.7),
('Walnuts', 'Nuts', '100', 'g', 654, 15, 14, 65, 6.7, 2.6, 2, 20, 1.3, 98, 2.9),
('Chia Seeds', 'Seeds', '100', 'g', 486, 17, 42, 31, 34, 0, 16, 54, 1.6, 631, 7.7),
('Peanut Butter', 'Nuts', '100', 'g', 588, 25, 20, 50, 6, 9, 476, 0, 0, 49, 1.9),

-- Dairy
('Milk', 'Dairy', '100', 'ml', 42, 3.4, 5, 1, 0, 5, 44, 46, 0, 113, 0.03),
('Cheddar Cheese', 'Dairy', '100', 'g', 403, 25, 1.3, 33, 0, 0.5, 621, 330, 0, 721, 0.14);

-- Add trigger for updated_at
CREATE TRIGGER update_food_database_updated_at
BEFORE UPDATE ON public.food_database
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();