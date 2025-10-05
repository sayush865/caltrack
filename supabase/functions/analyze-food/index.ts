import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract userId from authenticated JWT token instead of trusting client
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error('Missing required field: imageBase64');
    }

    // Validate imageBase64 format and size
    if (!imageBase64.startsWith('data:image/')) {
      throw new Error('Invalid image format - must be a data URL');
    }

    // Extract base64 data and validate size (10MB limit)
    const base64Data = imageBase64.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid image data format');
    }

    const estimatedSizeBytes = (base64Data.length * 3) / 4;
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (estimatedSizeBytes > maxSizeBytes) {
      throw new Error('Image size exceeds 10MB limit');
    }

    // Validate base64 format
    try {
      atob(base64Data.substring(0, 100)); // Test decode a small portion
    } catch {
      throw new Error('Invalid base64 encoding');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Analyzing food image with AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `You are a professional nutritionist and food scientist with expertise in visual portion estimation and nutritional analysis. Your goal is to provide accurate, consistent nutritional data from food images.

ANALYSIS PROTOCOL:

1. VISUAL IDENTIFICATION (Be Specific):
   - Identify ALL food items, ingredients, and components visible
   - Describe cooking methods (fried, grilled, baked, raw, steamed, etc.)
   - Note preparation details (sauces, oils, seasonings, toppings)
   - Identify serving vessels for size reference (plate diameter, bowl size, container type)

2. PORTION ESTIMATION (Use Multiple References):
   - Compare to standard plate size (10-12 inches typical dinner plate)
   - Use utensils as reference (fork ~7 inches, spoon ~6 inches)
   - Apply common portion references:
     * Fist = ~1 cup
     * Palm (without fingers) = 3-4 oz protein
     * Thumb = 1 oz cheese or 1 tbsp
     * Handful = 1-2 oz snacks
   - Estimate weight in grams and volume in cups/tablespoons
   - Account for food density (rice vs lettuce have different weights per cup)

3. NUTRITIONAL CALCULATION (Double-Check Math):
   - Calculate macros using USDA database standards
   - Include ALL components: base food + oils + sauces + toppings + garnishes
   - Cooking method adjustments:
     * Fried foods: add 5-10g fat per serving for oil absorption
     * Grilled/baked: minimal added fat unless visible
     * Sauces/dressings: estimate 1-2 tbsp = 10-20g fat typically
   - Verify: Total calories = (Protein × 4) + (Carbs × 4) + (Fat × 9)
   - Cross-check if values match typical servings of this food type

4. CONSISTENCY CHECKS:
   - Does the portion size match what's typically served?
   - Are macros proportional to the food type? (e.g., pizza should be higher carbs/fat, chicken breast higher protein)
   - Do micronutrients align with ingredients? (vegetables = vitamins, dairy = calcium)
   - If values seem off, re-evaluate portion size or ingredients

5. OUTPUT FORMAT:
Return ONLY valid JSON (no markdown, no code blocks, no explanations outside JSON):
{
  "visual_analysis": "Comprehensive description: all foods identified, cooking methods, visible ingredients, serving vessel details for reference",
  "portion_estimation": "Detailed size estimates with multiple reference comparisons (plate coverage, utensil comparison, standard portions) and weight/volume in grams and cups",
  "nutritional_reasoning": "Step-by-step: initial portion × base nutrition + cooking adjustments + sauce/topping additions = final values. Include verification that calories match macro distribution",
  "food_name": "Specific descriptive name (e.g., 'Grilled Chicken Caesar Salad' not just 'Salad')",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "sodium": number,
  "vitamin_a": number,
  "vitamin_c": number,
  "calcium": number,
  "iron": number
}

ACCURACY PRINCIPLES:
- Be conservative with portion sizes when uncertain (slightly underestimate rather than overestimate)
- Account for hidden ingredients (oils in cooking, butter on bread, dressings)
- Use consistent reference standards across all analyses
- Provide specific numbers, not ranges
- Ensure all nutritional values are realistic and properly calculated`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this food image following the multi-step process. Be thorough in portion estimation and verify your calculations for accuracy before providing the final nutrition data.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response received');
    
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const nutritionData = JSON.parse(cleanContent);
    
    // Upload image to storage
    const fileName = `${userId}/${Date.now()}.jpg`;
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const { error: uploadError } = await supabase.storage
      .from('food-images')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error('Failed to upload image');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('food-images')
      .getPublicUrl(fileName);

    console.log('Image uploaded with public URL');

    // Insert food log
    const { data: logData, error: logError } = await supabase
      .from('food_logs')
      .insert({
        user_id: userId,
        image_url: publicUrl,
        food_name: nutritionData.food_name,
        calories: nutritionData.calories,
        protein: nutritionData.protein,
        carbs: nutritionData.carbs,
        fat: nutritionData.fat,
        fiber: nutritionData.fiber,
        sugar: nutritionData.sugar,
        sodium: nutritionData.sodium,
        vitamin_a: nutritionData.vitamin_a,
        vitamin_c: nutritionData.vitamin_c,
        calcium: nutritionData.calcium,
        iron: nutritionData.iron,
        logged_at: new Date().toISOString()
      })
      .select()
      .single();

    if (logError) {
      console.error('Database insert error:', logError);
      throw new Error('Failed to save food log');
    }

    console.log('Food log saved successfully');

    return new Response(
      JSON.stringify({
        nutritionData: logData,
        analysis: {
          visual_analysis: nutritionData.visual_analysis,
          portion_estimation: nutritionData.portion_estimation,
          nutritional_reasoning: nutritionData.nutritional_reasoning
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in analyze-food function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
