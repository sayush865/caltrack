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
        model: 'openai/gpt-5',
        stream: true, // Enable streaming
        messages: [
          {
            role: 'system',
            content: `You are an expert nutritionist and dietitian with advanced food recognition capabilities. Your task is to provide highly accurate nutritional analysis with detailed reasoning.

CRITICAL INSTRUCTIONS:
1. Analyze the food image step-by-step
2. Explain what you see in detail
3. Estimate portions and quantities precisely
4. Use your knowledge of standard serving sizes and nutritional databases
5. Provide accurate nutritional values with reasoning
6. Return ONLY valid JSON without any markdown formatting

Be precise, detailed, and thorough in your analysis.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this food image in detail and provide a comprehensive breakdown:

STEP 1 - VISUAL IDENTIFICATION:
Describe what you see in the image. What foods are present? What containers or serving vessels? Any garnishes or accompaniments?

STEP 2 - PORTION ESTIMATION:
Estimate the quantity and portion sizes. For example: "1 bowl approximately 300ml capacity", "2 pieces of bread approximately 60g each", "garnish approximately 20g". Be specific about your estimations.

STEP 3 - NUTRITIONAL ANALYSIS:
Based on the portions identified, calculate accurate nutritional values using standard nutritional databases (USDA, etc.). Explain your reasoning for the calorie count.

STEP 4 - FINAL CLASSIFICATION:
Determine the meal type based on the food composition.

Return your analysis in this exact JSON format:
{
  "visual_analysis": "detailed description of what you see",
  "portion_estimation": "detailed breakdown of estimated quantities with reasoning",
  "nutritional_reasoning": "explanation of how you calculated the nutritional values",
  "food_name": "specific food name(s)",
  "calories": number,
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "fiber": number (grams),
  "sugar": number (grams),
  "sodium": number (milligrams),
  "vitamin_a": number (mcg RAE),
  "vitamin_c": number (milligrams),
  "calcium": number (milligrams),
  "iron": number (milligrams),
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
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // When streaming is complete, save to database
              try {
                const cleanContent = fullContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const nutritionData = JSON.parse(cleanContent);
                
                // Upload image to storage
                const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
                const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
                const supabase = createClient(supabaseUrl, supabaseKey);

                const fileName = `${userId}/${Date.now()}.jpg`;
                const imageData = imageBase64.split(',')[1];
                const buffer = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));

                const { data: uploadData, error: uploadError } = await supabase.storage
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

            // Parse SSE chunks from OpenAI
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                if (data === '[DONE]') {
                  continue;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  
                  if (content) {
                    fullContent += content;
                    // Forward the streaming chunk to client
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: 'content',
                      content: content
                    })}\n\n`));
                  }
                } catch (e) {
                  console.error('Error parsing SSE chunk:', e);
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
