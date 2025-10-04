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
            content: `You are an expert nutritionist. Analyze food images and return ONLY valid JSON (no markdown).

Return this exact structure:
{
  "visual_analysis": "description of food",
  "portion_estimation": "portion sizes",
  "nutritional_reasoning": "calculation explanation",
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
                text: 'Analyze this food and return nutrition data in JSON format.'
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
    
    // Check if this food already exists in food_database for consistency
    const { data: existingFood } = await supabase
      .from('food_database')
      .select('*')
      .ilike('name', nutritionData.food_name)
      .single();

    // Use existing food data if found (for consistency), otherwise use AI analysis
    const finalNutritionData = existingFood ? {
      food_name: existingFood.name,
      calories: existingFood.calories,
      protein: existingFood.protein,
      carbs: existingFood.carbs,
      fat: existingFood.fat,
      fiber: existingFood.fiber,
      sugar: existingFood.sugar,
      sodium: existingFood.sodium,
      vitamin_a: existingFood.vitamin_a,
      vitamin_c: existingFood.vitamin_c,
      calcium: existingFood.calcium,
      iron: existingFood.iron,
      visual_analysis: nutritionData.visual_analysis,
      portion_estimation: nutritionData.portion_estimation,
      nutritional_reasoning: `Using saved data for consistency. Original: ${nutritionData.nutritional_reasoning}`
    } : nutritionData;

    console.log(existingFood ? 'Using existing food data for consistency' : 'Using new AI analysis');
    
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

    // If this is a new food (not in database), add it to food_database for future consistency
    if (!existingFood) {
      const { error: dbInsertError } = await supabase
        .from('food_database')
        .insert({
          name: finalNutritionData.food_name,
          category: 'user-analyzed',
          serving_size: '1 serving',
          calories: finalNutritionData.calories,
          protein: finalNutritionData.protein,
          carbs: finalNutritionData.carbs,
          fat: finalNutritionData.fat,
          fiber: finalNutritionData.fiber,
          sugar: finalNutritionData.sugar,
          sodium: finalNutritionData.sodium,
          vitamin_a: finalNutritionData.vitamin_a,
          vitamin_c: finalNutritionData.vitamin_c,
          calcium: finalNutritionData.calcium,
          iron: finalNutritionData.iron,
          image_url: imageUrl
        });

      if (!dbInsertError) {
        console.log('Added new food to database for future consistency');
      }
    }

    // Insert food log
    const { data: logData, error: logError } = await supabase
      .from('food_logs')
      .insert({
        user_id: userId,
        image_url: imageUrl,
        food_name: finalNutritionData.food_name,
        calories: finalNutritionData.calories,
        protein: finalNutritionData.protein,
        carbs: finalNutritionData.carbs,
        fat: finalNutritionData.fat,
        fiber: finalNutritionData.fiber,
        sugar: finalNutritionData.sugar,
        sodium: finalNutritionData.sodium,
        vitamin_a: finalNutritionData.vitamin_a,
        vitamin_c: finalNutritionData.vitamin_c,
        calcium: finalNutritionData.calcium,
        iron: finalNutritionData.iron,
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
          visual_analysis: finalNutritionData.visual_analysis,
          portion_estimation: finalNutritionData.portion_estimation,
          nutritional_reasoning: finalNutritionData.nutritional_reasoning
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
