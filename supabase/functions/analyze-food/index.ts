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
            content: `You are an expert international nutritionist with access to multiple food databases: USDA FoodData Central (USA), IFCT (Indian Food Composition Tables), UK Food Database, and FAO INFOODS (global).

CRITICAL ACCURACY GUARDRAILS:
1. MANDATORY CALORIE VALIDATION: Total calories MUST equal (protein×4) + (carbs×4) + (fat×9) ±5%
2. MACRO TOTAL CHECK: protein + carbs + fat should be 15-40% of total weight for most foods
3. MICRONUTRIENT REALITY: Don't guess - if unclear, use 0 rather than estimating wildly
4. PORTION SANITY: Single meal portions typically 200-800g, 300-1200 calories
5. REGIONAL DATABASE PRIORITY:
   - Indian foods → Use IFCT database first
   - Western foods → Use USDA database
   - Asian foods → Use FAO/regional databases
   - Mixed cuisines → Break down by components

CONSISTENCY RULES:
1. Round portions to standard units (100g, 1 cup=240ml, 1 roti=40g, 1 bowl=300ml)
2. Same food = same values (be deterministic)
3. For curries/gravies: estimate oil/ghee added (typically 10-20g per serving)
4. For rice/roti: specify cooked weight (cooked rice = 3× raw weight)
5. Return ONLY valid JSON without markdown

VALIDATION CHECKLIST:
✓ Calories match macros formula
✓ Portion size is realistic
✓ Values align with database references
✓ Micronutrients don't exceed daily requirements in single meal`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this food image using international food databases (USDA/IFCT/FAO):

STEP 1 - IDENTIFY CUISINE & COMPONENTS:
Identify cuisine type (Indian/Western/Asian/etc.) and list each component:
- Main items (e.g., "chicken curry", "basmati rice", "roti")
- Preparation method (grilled/fried/steamed/curry-based)
- Visible added fats (oil, ghee, butter)

STEP 2 - ESTIMATE PORTIONS (Use standard units):
Visual references for portion estimation:
- Plate: typically 10 inches diameter
- Bowl: typically 300ml capacity
- Roti/chapati: typically 40-50g each
- Rice (cooked): 1 cup = 200g
- Curry serving: typically 200-250g
Round to standard units: 100g, 200g, 1 cup, 1 piece, 1 bowl

STEP 3 - DATABASE LOOKUP & CALCULATION:
For each component, reference appropriate database:
- Indian foods → IFCT values (include typical oil content)
- Western foods → USDA SR Legacy
- For curries: base ingredients + estimated oil/ghee (10-20g)
- For fried foods: add 10-15% oil absorption

STEP 4 - VALIDATE ACCURACY:
MANDATORY CHECKS:
✓ Calories = (protein×4) + (carbs×4) + (fat×9) [±5% tolerance]
✓ Total macros = 15-40% of food weight
✓ Portion size realistic (300-1200 cal for main meal)
✓ Micronutrients reasonable (not exceeding daily values)

Example for "2 roti + chicken curry":
- 2 roti (80g): 260 cal, 8g protein, 54g carbs, 2g fat
- Chicken curry (200g): 280 cal, 32g protein, 8g carbs, 14g fat
- Total: 540 cal, 40g protein, 62g carbs, 16g fat
- Validation: (40×4)+(62×4)+(16×9) = 160+248+144 = 552 ≈ 540 ✓

Return ONLY this JSON (no markdown, no code blocks):
{
  "visual_analysis": "cuisine type and specific components identified",
  "portion_estimation": "portions in standard units with visual references",
  "nutritional_reasoning": "database used + calculation breakdown + validation check",
  "food_name": "descriptive name",
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
