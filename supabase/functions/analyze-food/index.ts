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
    const authStartTime = Date.now();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Auth completed in ${Date.now() - authStartTime}ms`);

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

    const imageSizeKB = Math.round(estimatedSizeBytes / 1024);
    console.log(`Image size: ${imageSizeKB}KB`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiStartTime = Date.now();
    console.log('Starting AI analysis with google/gemini-3.1-pro-preview...');

    // Use tool calling for guaranteed structured output
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
            content: `You are a nutrition analysis AI. Analyze food images quickly and accurately.

For each distinct food item visible:
1. Identify the food and cooking method
2. Estimate portion using visual cues (plate size, utensils, hand for scale)
3. Calculate nutrition per item
4. Provide confidence level (0-100)

Guidelines:
- Be conservative with portions
- Account for oils, sauces, and hidden calories
- Detect ALL distinct food items (main dish, sides, drinks, condiments)
- Use USDA nutrition data as reference
- Hydration: for any drink, also report water_ml — the water content of that serving. Plain water, sparkling water, black tea/coffee and infusions ~100% of volume; chia water counts the full liquid volume (plus the chia calories); milk ~87%; juice ~85%; soup ~80%; soda ~89%; alcoholic drinks 0. Solid food is 0.
- Verify: calories ≈ (protein×4) + (carbs×4) + (fat×9)`

          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this food image. Identify ALL distinct food items, estimate portions accurately, and calculate nutrition for each item.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "log_food_analysis",
            description: "Log analyzed food items with nutrition data from the image",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  description: "Array of distinct food items detected in the image",
                  items: {
                    type: "object",
                    properties: {
                      name: { 
                        type: "string", 
                        description: "Name of the food item with preparation method" 
                      },
                      portion: { 
                        type: "string", 
                        description: "Estimated portion size (e.g., '1 cup', '150g', '1 medium')" 
                      },
                      confidence: { 
                        type: "number", 
                        minimum: 0, 
                        maximum: 100,
                        description: "Confidence level in identification (0-100)"
                      },
                      calories: { type: "number", description: "Calories for this portion" },
                      protein: { type: "number", description: "Protein in grams" },
                      carbs: { type: "number", description: "Carbohydrates in grams" },
                      fat: { type: "number", description: "Fat in grams" },
                      fiber: { type: "number", description: "Fiber in grams" },
                      sugar: { type: "number", description: "Sugar in grams" },
                      sodium: { type: "number", description: "Sodium in mg" },
                      vitamin_a: { type: "number", description: "Vitamin A in mcg" },
                      vitamin_c: { type: "number", description: "Vitamin C in mg" },
                      calcium: { type: "number", description: "Calcium in mg" },
                      iron: { type: "number", description: "Iron in mg" }
                    },
                    required: ["name", "portion", "confidence", "calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium", "vitamin_a", "vitamin_c", "calcium", "iron"]
                  }
                },
                visual_description: { 
                  type: "string", 
                  description: "Brief description of what's visible in the image" 
                },
                portion_reasoning: { 
                  type: "string", 
                  description: "How portion sizes were estimated (plate size, utensils, etc.)" 
                }
              },
              required: ["items", "visual_description", "portion_reasoning"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "log_food_analysis" } }
      }),
    });

    const aiDurationMs = Date.now() - aiStartTime;
    console.log(`AI response received in ${aiDurationMs}ms`);

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
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'log_food_analysis') {
      throw new Error('Invalid AI response - no tool call found');
    }

    const analysisResult = JSON.parse(toolCall.function.arguments);
    const { items, visual_description, portion_reasoning } = analysisResult;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('No food items detected in image');
    }

    // Calculate totals from all items
    const totals = items.reduce((acc: any, item: any) => ({
      calories: acc.calories + (item.calories || 0),
      protein: acc.protein + (item.protein || 0),
      carbs: acc.carbs + (item.carbs || 0),
      fat: acc.fat + (item.fat || 0),
      fiber: acc.fiber + (item.fiber || 0),
      sugar: acc.sugar + (item.sugar || 0),
      sodium: acc.sodium + (item.sodium || 0),
      vitamin_a: acc.vitamin_a + (item.vitamin_a || 0),
      vitamin_c: acc.vitamin_c + (item.vitamin_c || 0),
      calcium: acc.calcium + (item.calcium || 0),
      iron: acc.iron + (item.iron || 0),
    }), {
      calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0,
      sodium: 0, vitamin_a: 0, vitamin_c: 0, calcium: 0, iron: 0
    });

    // Generate combined food name
    const foodName = items.length === 1 
      ? items[0].name 
      : items.slice(0, 3).map((i: any) => i.name).join(', ') + (items.length > 3 ? ` +${items.length - 3} more` : '');

    const totalProcessingMs = Date.now() - startTime;
    
    // Log metrics for monitoring
    console.log(JSON.stringify({
      event: 'food_analysis_complete',
      image_size_kb: imageSizeKB,
      ai_duration_ms: aiDurationMs,
      total_duration_ms: totalProcessingMs,
      items_detected: items.length,
      total_calories: totals.calories,
      model: 'google/gemini-3.1-pro-preview'
    }));

    return new Response(
      JSON.stringify({
        // Multi-item data
        items: items.map((item: any) => ({
          name: item.name,
          portion: item.portion,
          confidence: item.confidence,
          calories: Math.round(item.calories),
          protein: Math.round(item.protein * 10) / 10,
          carbs: Math.round(item.carbs * 10) / 10,
          fat: Math.round(item.fat * 10) / 10,
          fiber: Math.round(item.fiber * 10) / 10,
          sugar: Math.round(item.sugar * 10) / 10,
          sodium: Math.round(item.sodium),
          vitamin_a: Math.round(item.vitamin_a),
          vitamin_c: Math.round(item.vitamin_c),
          calcium: Math.round(item.calcium),
          iron: Math.round(item.iron * 10) / 10,
        })),
        // Aggregated totals for backward compatibility
        nutritionData: {
          food_name: foodName,
          calories: Math.round(totals.calories),
          protein: Math.round(totals.protein * 10) / 10,
          carbs: Math.round(totals.carbs * 10) / 10,
          fat: Math.round(totals.fat * 10) / 10,
          fiber: Math.round(totals.fiber * 10) / 10,
          sugar: Math.round(totals.sugar * 10) / 10,
          sodium: Math.round(totals.sodium),
          vitamin_a: Math.round(totals.vitamin_a),
          vitamin_c: Math.round(totals.vitamin_c),
          calcium: Math.round(totals.calcium),
          iron: Math.round(totals.iron * 10) / 10
        },
        analysis: {
          visual_analysis: visual_description,
          portion_estimation: portion_reasoning,
          nutritional_reasoning: `Detected ${items.length} item(s). Total: ${Math.round(totals.calories)} cal, ${Math.round(totals.protein)}g protein, ${Math.round(totals.carbs)}g carbs, ${Math.round(totals.fat)}g fat.`
        },
        meta: {
          items_count: items.length,
          processing_time_ms: totalProcessingMs
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
