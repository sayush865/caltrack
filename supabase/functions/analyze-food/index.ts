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
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert nutritionist with precision measurement skills. Follow this multi-step analysis process:

STEP 1 - Visual Analysis:
- Identify all food items in the image
- Estimate portion sizes using reference objects (plates, utensils, hands, packaging)
- Note cooking methods and preparation styles
- Identify visible ingredients and garnishes

STEP 2 - Portion Approximation:
- Estimate volume/weight using standard serving sizes (cups, grams, ounces)
- Compare to common reference sizes (fist, palm, deck of cards)
- Account for density and composition of food
- Consider visible plate coverage and depth

STEP 3 - Initial Nutritional Calculation:
- Calculate macronutrients based on estimated portions
- Include all visible components (sauces, oils, toppings)
- Use USDA nutritional database standards
- Account for cooking methods (fried vs grilled affects fat content)

STEP 4 - Accuracy Re-evaluation:
- Cross-check if portion sizes align with typical servings
- Verify calorie calculations match macro distribution (4 cal/g protein, 4 cal/g carbs, 9 cal/g fat)
- Adjust estimates if proportions seem inconsistent
- Ensure micronutrient values are realistic for food type

STEP 5 - Final Output:
Return ONLY valid JSON (no markdown) with this exact structure:
{
  "visual_analysis": "detailed description of all food items, cooking methods, and visible ingredients",
  "portion_estimation": "specific weight/volume estimates with reasoning and reference comparisons",
  "nutritional_reasoning": "step-by-step calculation showing initial estimate, verification checks, and any adjustments made for accuracy",
  "food_name": "name",
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
}`
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
    
    console.log('AI response:', content);
    
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

    // Generate signed URL (1 hour expiration) instead of public URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('food-images')
      .createSignedUrl(fileName, 3600); // 1 hour expiration

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
      throw new Error('Failed to create signed URL');
    }

    const imageUrl = signedUrlData.signedUrl;
    console.log('Image uploaded with signed URL');

    // Insert food log
    const { data: logData, error: logError } = await supabase
      .from('food_logs')
      .insert({
        user_id: userId,
        image_url: imageUrl,
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
