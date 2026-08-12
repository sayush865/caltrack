// analyze-exercise — turns a free-text workout description ("30 min brisk walk,
// then 20 min upper body") into a structured exercise entry using MET-based
// reasoning. Mirrors analyze-food-text: JWT validated in code, Lovable AI Gateway.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized - missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized - invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const weightKg = Math.min(300, Math.max(30, Number(body?.weightKg) || 70));
    if (!description) throw new Error("Missing required field: description");
    if (description.length > 600) throw new Error("Description too long - maximum 600 characters");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content: `You are an exercise physiologist. Convert a described workout into one structured entry.

Rules:
- Body weight is ${weightKg} kg. Calories burned = MET × ${weightKg} × (minutes / 60).
- Pick a realistic MET for the activity and stated intensity (walking 3.0-4.3, brisk walk 4.5, jogging 7-9, running 10-12, cycling 6-10, swimming 6-10, strength training 3.5-6, yoga 2.5-4, HIIT 8-12, cricket/football 6-8).
- If the description covers multiple activities, merge them into one entry: sum the minutes, sum the calories, and name it descriptively.
- If minutes are not stated, infer a sensible duration from the description and say so in reasoning.
- exercise_type must be one of: cardio, strength, sports, flexibility, other.
- intensity must be one of: low, moderate, high.
- distance_km only when distance is stated or clearly implied; otherwise 0.

Return ONLY valid JSON:
{
  "exercise_name": "short descriptive name",
  "exercise_type": "cardio|strength|sports|flexibility|other",
  "duration_minutes": number,
  "calories_burned": number,
  "intensity": "low|moderate|high",
  "distance_km": number,
  "met_used": number,
  "reasoning": "one short sentence"
}`,
          },
          { role: "user", content: `Workout: "${description}"` },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`AI API error: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());

    const minutes = Math.max(1, Math.round(Number(parsed.duration_minutes) || 0));
    const calories = Math.max(0, Math.round(Number(parsed.calories_burned) || 0));
    const type = ["cardio", "strength", "sports", "flexibility", "other"].includes(parsed.exercise_type)
      ? parsed.exercise_type
      : "other";
    const intensity = ["low", "moderate", "high"].includes(parsed.intensity) ? parsed.intensity : "moderate";

    return new Response(
      JSON.stringify({
        exercise: {
          exercise_name: String(parsed.exercise_name ?? description).slice(0, 80),
          exercise_type: type,
          duration_minutes: minutes,
          calories_burned: calories,
          intensity,
          distance_km: Math.max(0, Number(parsed.distance_km) || 0),
        },
        analysis: {
          met_used: Number(parsed.met_used) || 0,
          reasoning: String(parsed.reasoning ?? ""),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in analyze-exercise function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
