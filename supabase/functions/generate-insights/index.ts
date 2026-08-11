import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user data in parallel
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const [profileRes, goalsRes, logsRes, waterRes, weightRes, streakRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_goals').select('*').eq('user_id', user.id).single(),
      supabase.from('food_logs').select('*').eq('user_id', user.id).eq('status', 1).gte('logged_at', fourteenDaysAgo.toISOString()),
      supabase.from('water_logs').select('*').eq('user_id', user.id).gte('logged_at', fourteenDaysAgo.toISOString()),
      supabase.from('weight_logs').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(10),
      supabase.from('user_streaks').select('*').eq('user_id', user.id).single(),
    ]);

    const profile = profileRes.data;
    const goals = goalsRes.data;
    const foodLogs = logsRes.data || [];
    const waterLogs = waterRes.data || [];
    const weightLogs = weightRes.data || [];
    const streak = streakRes.data;

    // Calculate averages
    const dayTotals: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
    foodLogs.forEach((log: any) => {
      const day = new Date(log.logged_at).toISOString().split('T')[0];
      if (!dayTotals[day]) dayTotals[day] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      dayTotals[day].calories += Number(log.calories) || 0;
      dayTotals[day].protein += Number(log.protein) || 0;
      dayTotals[day].carbs += Number(log.carbs) || 0;
      dayTotals[day].fat += Number(log.fat) || 0;
    });

    const days = Object.values(dayTotals);
    const daysLogged = days.length;
    const avgCalories = daysLogged > 0 ? Math.round(days.reduce((s, d) => s + d.calories, 0) / daysLogged) : 0;
    const avgProtein = daysLogged > 0 ? Math.round(days.reduce((s, d) => s + d.protein, 0) / daysLogged) : 0;
    const avgCarbs = daysLogged > 0 ? Math.round(days.reduce((s, d) => s + d.carbs, 0) / daysLogged) : 0;

    // Water average
    const waterByDay: Record<string, number> = {};
    waterLogs.forEach((log: any) => {
      const day = new Date(log.logged_at).toISOString().split('T')[0];
      waterByDay[day] = (waterByDay[day] || 0) + (log.amount_ml || 0);
    });
    const waterDays = Object.values(waterByDay);
    const avgWater = waterDays.length > 0 ? Math.round(waterDays.reduce((s, v) => s + v, 0) / waterDays.length) : 0;

    // Weight change
    const latestWeight = weightLogs[0]?.weight;
    const oldestWeight = weightLogs[weightLogs.length - 1]?.weight;
    const weightChange = latestWeight && oldestWeight ? Number(latestWeight) - Number(oldestWeight) : null;

    // Build context for AI
    const currentHour = new Date().getHours();
    const timeOfDay = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const userContext = `
User Profile:
- Age: ${profile?.age || 'unknown'}, Gender: ${profile?.gender || 'unknown'}, Activity: ${profile?.activity_level || 'moderate'}
- Units: ${profile?.units_preference || 'imperial'}

Goals:
- Daily targets: ${goals?.daily_calories || 2000} cal, ${goals?.daily_protein || 150}g protein, ${goals?.daily_carbs || 250}g carbs, ${goals?.daily_fat || 65}g fat
- Goal type: ${goals?.goal_type || 'maintain'}
- Current weight: ${goals?.current_weight || 'unknown'}, Goal weight: ${goals?.goal_weight || 'unknown'}
- Daily water goal: ${goals?.daily_water || 2000}ml

Last 14 Days Analysis:
- Days logged: ${daysLogged}/14
- Avg daily calories: ${avgCalories} (${goals?.daily_calories ? Math.round((avgCalories / goals.daily_calories - 1) * 100) : 0}% vs target)
- Avg protein: ${avgProtein}g (${goals?.daily_protein ? Math.round((avgProtein / goals.daily_protein - 1) * 100) : 0}% vs target)
- Avg carbs: ${avgCarbs}g
- Avg water: ${avgWater}ml/day (goal: ${goals?.daily_water || 2000}ml)
- Weight change: ${weightChange !== null ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}kg` : 'no data'}

Streak:
- Current streak: ${streak?.current_streak || 0} days
- Longest streak: ${streak?.longest_streak || 0} days

Context:
- Time of day: ${timeOfDay}
- Day of week: ${dayOfWeek}
`;

    const systemPrompt = `You are CalTrack's AI nutrition coach. Generate 3-5 personalized, encouraging insights based on the user's actual data.

Rules:
1. Be specific - reference actual numbers from their data
2. Be actionable - give concrete next steps when suggesting improvements
3. Be encouraging - celebrate wins, however small
4. Be contextual - consider time of day and patterns
5. Vary your suggestions - mix celebration, tips, and motivation
6. Keep each insight under 100 characters

Output ONLY a JSON array with this structure (no markdown, no code blocks):
[
  {
    "category": "strength" | "improve" | "goal" | "quick_win" | "celebration",
    "emoji": "appropriate emoji",
    "message": "Your personalized insight here"
  }
]`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.6-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContext },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('AI gateway error');
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '[]';
    
    // Parse AI response
    let insights;
    try {
      // Clean the response - remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      insights = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      insights = [
        { category: 'goal', emoji: '👋', message: 'Keep tracking to unlock personalized insights!' }
      ];
    }

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-insights:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      insights: [{ category: 'goal', emoji: '💪', message: 'Keep up the great work with your nutrition journey!' }]
    }), {
      status: 200, // Return 200 with fallback insights
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
