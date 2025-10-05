import { z } from 'zod';

// Nutrition goals validation schema
export const nutritionGoalsSchema = z.object({
  daily_calories: z.number().int().min(800, 'Calories must be at least 800').max(10000, 'Calories cannot exceed 10,000'),
  daily_protein: z.number().int().min(0, 'Protein cannot be negative').max(500, 'Protein cannot exceed 500g'),
  daily_carbs: z.number().int().min(0, 'Carbs cannot be negative').max(1000, 'Carbs cannot exceed 1,000g'),
  daily_fat: z.number().int().min(0, 'Fat cannot be negative').max(500, 'Fat cannot exceed 500g'),
  current_weight: z.number().min(20, 'Weight must be at least 20 lbs').max(500, 'Weight cannot exceed 500 lbs').optional().nullable(),
  goal_weight: z.number().min(20, 'Weight must be at least 20 lbs').max(500, 'Weight cannot exceed 500 lbs').optional().nullable(),
});

// Auth validation schemas
export const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores');

export const emailSchema = z.string()
  .email('Invalid email address')
  .max(255, 'Email must be at most 255 characters');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be at most 100 characters');

export const authSignUpSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const authSignInSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required'),
  password: passwordSchema,
});

// Search query validation
export const searchQuerySchema = z.string()
  .max(100, 'Search query is too long')
  .transform(str => str.trim());

// Profile validation schema
export const profileSchema = z.object({
  username: usernameSchema.optional(),
  age: z.number().int().min(13, 'Must be at least 13 years old').max(120, 'Age cannot exceed 120').optional().nullable(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional().nullable(),
  height: z.number().min(20, 'Height must be at least 20').max(300, 'Height cannot exceed 300').optional().nullable(),
  activity_level: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active']).optional().nullable(),
  units_preference: z.enum(['imperial', 'metric']).default('imperial'),
});

export type NutritionGoals = z.infer<typeof nutritionGoalsSchema>;
export type AuthSignUp = z.infer<typeof authSignUpSchema>;
export type AuthSignIn = z.infer<typeof authSignInSchema>;
export type Profile = z.infer<typeof profileSchema>;
