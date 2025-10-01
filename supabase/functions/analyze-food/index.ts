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
    const { imageBase64, userId } = await req.json();
    
    if (!imageBase64 || !userId) {
      throw new Error('Missing required fields');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Analyzing food image with AI...');

    // Call Lovable AI with vision capabilities using GPT-5 with streaming
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        stream: true, // Enable streaming
        messages: [
          {
            role: 'system',
            content: `You are an expert nutritionist with access to USDA FoodData Central and standard nutritional databases. Your task is to provide CONSISTENT and ACCURATE nutritional analysis.

CRITICAL CONSISTENCY RULES:
1. ALWAYS use USDA Standard Reference values as your baseline
2. Round portions to standard serving sizes (e.g., 100g, 1 cup, 1 piece)
3. For common foods, use the most typical preparation method
4. Cross-reference multiple database entries and use the median value
5. Be deterministic - the same food should yield the same nutritional values
6. For mixed dishes, break down each component and sum the values
7. Return ONLY valid JSON without any markdown formatting

ANALYSIS PROCESS:
1. Identify the specific food items and their preparation method
2. Estimate portion size using visual cues (plate size, utensils, etc.)
3. Look up standard nutritional values from USDA database
4. Calculate totals based on estimated portions
5. Double-check your math and ensure values are realistic

Be precise, consistent, and reference-based in your analysis.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this food image using USDA FoodData Central standard values:

STEP 1 - IDENTIFY FOOD & PREPARATION:
List each food item and its preparation method (e.g., "grilled chicken breast", "steamed white rice").

STEP 2 - ESTIMATE PORTIONS (Round to standard sizes):
Use visual references to estimate portions in standard units:
- Compare to typical plate size (usually 10 inches)
- Use utensils for scale reference
- Round to: 100g, 1 cup (240ml), 1 oz (28g), 1 piece, etc.

STEP 3 - LOOK UP USDA VALUES:
For each food component, reference USDA SR Legacy values:
- Search for exact food match in USDA database
- Use "raw" or "cooked" values matching the preparation
- For mixed dishes, break into components

STEP 4 - CALCULATE & VERIFY:
Sum all nutritional values and verify they're realistic:
- Calories should match macro totals (4 cal/g protein+carbs, 9 cal/g fat)
- Check values against similar foods for consistency

Return ONLY this JSON (no markdown):
{
  "visual_analysis": "specific foods and preparation methods identified",
  "portion_estimation": "portions in standard units with visual reference reasoning",
  "nutritional_reasoning": "USDA database references and calculation steps",
  "food_name": "specific food name(s)",
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
  "iron": number,
  "meal_type": "breakfast/lunch/dinner/snack"
}`
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
        max_completion_tokens: 16000
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

    // Create a streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    let fullContent = '';
    let buffer = '';
    
    const stream = new ReadableStream({
      async start(controller) {
        console.log('Starting stream...');
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('Stream complete, full content length:', fullContent.length);
              
              // When streaming is complete, save to database
              try {
                const cleanContent = fullContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                console.log('Parsing nutrition data...');
                const nutritionData = JSON.parse(cleanContent);
                
                // Upload image to storage
                const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
                const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
                const supabase = createClient(supabaseUrl, supabaseKey);

                const fileName = `${userId}/${Date.now()}.jpg`;
                const imageData = imageBase64.split(',')[1];
                const buffer = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));

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

                console.log('Image uploaded:', publicUrl);

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
                    meal_type: nutritionData.meal_type,
                    logged_at: new Date().toISOString()
                  })
                  .select()
                  .single();

                if (!logError && logData) {
                  console.log('Food log saved successfully');
                  // Send final complete event
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'complete',
                    data: logData,
                    analysis: {
                      visual_analysis: nutritionData.visual_analysis,
                      portion_estimation: nutritionData.portion_estimation,
                      nutritional_reasoning: nutritionData.nutritional_reasoning
                    }
                  })}\n\n`));
                } else {
                  console.error('Database insert error:', logError);
                }
              } catch (error) {
                console.error('Error saving data:', error);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'error',
                  error: error instanceof Error ? error.message : 'Failed to save data'
                })}\n\n`));
              }
              
              controller.close();
              break;
            }

            // Decode and buffer the chunk
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines from buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            for (const line of lines) {
              if (line.trim() === '' || line.startsWith(':')) {
                continue;
              }
              
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                if (data === '[DONE]') {
                  console.log('Received [DONE] signal');
                  continue;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  
                  if (content) {
                    fullContent += content;
                    console.log('Streaming chunk, content length:', content.length);
                    
                    // Forward the streaming chunk to client immediately
                    const message = `data: ${JSON.stringify({
                      type: 'content',
                      content: content
                    })}\n\n`;
                    controller.enqueue(encoder.encode(message));
                  }
                } catch (e) {
                  console.error('Error parsing SSE chunk:', e, 'Data:', data);
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Stream error'
          })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

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
