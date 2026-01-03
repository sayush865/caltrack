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

  const startTime = Date.now();

  try {
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

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Auth completed in ${Date.now() - startTime}ms`);

    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error('Missing required field: imageBase64');
    }

    if (!imageBase64.startsWith('data:image/')) {
      throw new Error('Invalid image format - must be a data URL');
    }

    const base64Data = imageBase64.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid image data format');
    }

    const estimatedSizeBytes = (base64Data.length * 3) / 4;
    const maxSizeBytes = 10 * 1024 * 1024;
    if (estimatedSizeBytes > maxSizeBytes) {
      throw new Error('Image size exceeds 10MB limit');
    }

    console.log(`Image size: ${Math.round(estimatedSizeBytes / 1024)}KB`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiStartTime = Date.now();
    console.log('Starting AI analysis with openai/gpt-5-mini...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: `You are a nutritionist analyzing food images. Identify foods, estimate portions using plate/utensil references, and calculate accurate nutrition.

Return ONLY valid JSON:
{
  "visual_analysis": "Foods identified, cooking methods, ingredients",
  "portion_estimation": "Size estimates with references (plate coverage, grams, cups)",
  "nutritional_reasoning": "Calculation steps: portion × base nutrition + adjustments",
  "food_name": "Descriptive name",
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

Be conservative with portions. Account for oils, sauces, toppings. Verify: calories ≈ (protein×4)+(carbs×4)+(fat×9).`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this food image. Identify items, estimate portions, calculate nutrition.'
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

    console.log(`AI response received in ${Date.now() - aiStartTime}ms`);

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
    
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const nutritionData = JSON.parse(cleanContent);
    
    console.log(`Total processing time: ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({
        nutritionData: {
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
          iron: nutritionData.iron
        },
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
