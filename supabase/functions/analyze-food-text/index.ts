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

    const { description } = await req.json();
    
    if (!description || typeof description !== 'string') {
      throw new Error('Missing required field: description');
    }

    if (description.length > 1000) {
      throw new Error('Description too long - maximum 1000 characters');
    }

    console.log(`Analyzing food description: "${description.substring(0, 100)}..."`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiStartTime = Date.now();
    console.log('Starting AI analysis with google/gemini-3.1-pro-preview...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-pro-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert nutritionist. Analyze food descriptions and calculate accurate nutrition values.

Given a food description, identify all food items mentioned, estimate realistic portions, and calculate the total nutritional content.

Guidelines:
- Parse multiple items (e.g., "2 eggs with toast and butter" = eggs + toast + butter)
- Use standard serving sizes when portions aren't specified
- Account for cooking methods (fried adds oil, grilled is leaner)
- Include hidden calories (oils, sauces, dressings)
- Be conservative with estimates

Return ONLY valid JSON:
{
  "food_items_parsed": "List of identified items with estimated portions",
  "portion_estimation": "How you determined portions",
  "nutritional_reasoning": "Brief calculation breakdown",
  "food_name": "Concise descriptive name for the meal",
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

Verify: calories ≈ (protein×4) + (carbs×4) + (fat×9)`
          },
          {
            role: 'user',
            content: `Analyze this food description and calculate total nutrition: "${description}"`
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
          visual_analysis: nutritionData.food_items_parsed,
          portion_estimation: nutritionData.portion_estimation,
          nutritional_reasoning: nutritionData.nutritional_reasoning
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in analyze-food-text function:', error);
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
