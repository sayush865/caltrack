// supabase/functions-v2/analyze-food-text/index.ts
// Text description → itemized nutrition analysis. FULL REBUILD.
//
// Changes vs v1:
//   - Returns the SAME items[] contract as analyze-food (v1 returned one
//     merged blob and used fragile "return ONLY JSON" + regex fence-stripping).
//   - Forced tool calling with one repair-retry (shared module).
//   - google/gemini-2.5-flash.
//   - Hinglish / Indian-food few-shots with realistic desi portions.
//   - Per-item is_water flag so the client can route plain water to water_logs.
//   - Per-user rate limit (15/min), shared error envelope.
//
// Request body: { description: string }   (SAME key as v1 — clients unchanged)
// Response:     { items[], nutritionData, analysis, meta } + optional
//               is_food/reason/clarifying_question; items[].confidence 0-100,
//               items[].is_water boolean.

import {
  callGatewayTool,
  enforceRateLimit,
  errorResponse,
  handleOptions,
  HttpError,
  jsonResponse,
  readJsonBody,
  reconcileCalories,
  requireUser,
  round1,
  serviceClient,
  V,
  ValidationError,
} from "../_shared/mod.ts";

const MODEL = "google/gemini-2.5-flash";

// ---------------------------------------------------------------------------
// Prompt (with Indian/Hinglish few-shots)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are CalTrack's meal-description analysis engine. Users type what they ate in casual English, Hindi, or Hinglish. Parse the description into SEPARATE food items with realistic portions and nutrition, then report via the log_food_analysis tool.

RULES:
1. ITEMIZE: every distinct food/drink is its own item. Combination phrases split ("rajma chawal" → rajma + steamed rice; "dal roti" → dal + roti; "tea and biscuits" → tea + biscuits).
2. PORTIONS GRAMS-FIRST: when the user gives a quantity ("2 roti", "half plate"), honor it. When they don't, use realistic single-serving defaults and estimate grams/ml FIRST, then derive nutrition. Put grams/ml in the portion string, e.g. "1 katori (160 g)".
3. INDIAN PRIORS: 1 katori ≈ 150 ml (~150–200 g dal/sabzi); home phulka/roti ≈ 40 g (~105 kcal); restaurant tandoori roti/naan ≈ 60–80 g; tadka adds 40–60 kcal ghee/oil per katori — assume a standard tadka on home dal/curries and STATE the assumption in the item name ("dal tadka (with ghee)"); 1 plate biryani (restaurant) ≈ 350–400 g; 1 glass ≈ 250 ml; 1 cup chai ≈ 150–200 ml with milk and sugar unless stated otherwise; idli ≈ 40 g each; dosa (plain) ≈ 100–120 g.
4. HIDDEN CALORIES: cooking oil/ghee, sugar in chai/lassi/soft drinks, butter on parathas, dressings. "Fried" means real oil absorption.
5. WATER DETECTION: if an item is PLAIN water (paani, "a glass of water"), set is_water=true with all nutrition 0. Flavored/sugary drinks are NOT water.
6. NOT FOOD: if the description contains no food or drink at all ("asdfgh", "how are you"), set is_food=false with a short friendly reason and items=[].
7. CONFIDENCE 0–100 per item: 85+ exact quantity given for a simple food ("2 boiled eggs"); 60–84 quantity given for a prepared dish; 35–59 unquantified or mixed dishes with hidden fats; <35 extremely vague ("some snacks").
8. ONE CLARIFYING QUESTION (optional): only when a single ambiguity swings total calories >25% (sweet vs salted lassi, fried vs roasted, veg vs chicken biryani, milk vs black coffee). ALWAYS give best estimates anyway — never block on the answer.
9. SELF-CHECK: for each item, calories ≈ 4×protein + 4×carbs + 9×fat within ±10%. Fix before responding.
10. MICROS: omit vitamin_a/vitamin_c/calcium/iron unless genuinely known. Never fabricate.

FEW-SHOT EXAMPLES (follow these exactly in spirit):

Input: "2 roti with dal and a glass of lassi"
→ items:
  { name: "Roti (whole wheat, home-made)", portion: "2 rotis (80 g)", confidence: 78, calories: 210, protein: 6, carbs: 36, fat: 5, fiber: 5, sugar: 1, sodium: 200, is_water: false }
  { name: "Dal tadka (with ghee)", portion: "1 katori (160 g)", confidence: 55, calories: 180, protein: 9, carbs: 20, fat: 7, fiber: 5, sugar: 2, sodium: 400, is_water: false }
  { name: "Sweet lassi", portion: "1 glass (250 ml)", confidence: 50, calories: 220, protein: 6, carbs: 35, fat: 6, fiber: 0, sugar: 32, sodium: 80, is_water: false }
→ clarifying_question: "Was the lassi sweet or salted? Salted is about 150 kcal less."

Input: "half plate biryani"
→ items:
  { name: "Chicken biryani (restaurant style)", portion: "half plate (200 g)", confidence: 45, calories: 290, protein: 12, carbs: 35, fat: 11, fiber: 2, sugar: 2, sodium: 520, is_water: false }
→ clarifying_question: "Was it chicken, mutton, or veg biryani?"

Input: "2 idli with sambar and chutney, ek glass paani"
→ items:
  { name: "Idli (steamed)", portion: "2 idlis (80 g)", confidence: 80, calories: 150, protein: 4, carbs: 30, fat: 1, fiber: 2, sugar: 0, sodium: 300, is_water: false }
  { name: "Sambar", portion: "1 katori (150 g)", confidence: 60, calories: 90, protein: 4, carbs: 12, fat: 3, fiber: 3, sugar: 3, sodium: 450, is_water: false }
  { name: "Coconut chutney", portion: "2 tbsp (30 g)", confidence: 55, calories: 90, protein: 1, carbs: 3, fat: 8, fiber: 1, sugar: 1, sodium: 150, is_water: false }
  { name: "Water", portion: "1 glass (250 ml)", confidence: 95, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, is_water: true }
→ no clarifying_question needed.`;

// ---------------------------------------------------------------------------
// Tool schema + validation
// ---------------------------------------------------------------------------

const TOOL = {
  name: "log_food_analysis",
  description:
    "Report the parsed meal: itemized foods/drinks with realistic portions, nutrition, confidence, water flags, and at most one clarifying question.",
  parameters: {
    type: "object",
    properties: {
      is_food: {
        type: "boolean",
        description: "false only if the text describes no food or drink at all",
      },
      not_food_reason: {
        type: "string",
        description: "Friendly one-sentence reason when is_food is false",
      },
      items: {
        type: "array",
        description: "Every distinct food/drink item. Empty when is_food is false.",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                "Food name with preparation and stated assumptions, e.g. 'dal tadka (with ghee)'",
            },
            portion: {
              type: "string",
              description: "Human portion WITH grams/ml, e.g. '2 rotis (80 g)'",
            },
            confidence: { type: "number", minimum: 0, maximum: 100 },
            calories: { type: "number", description: "kcal for this portion" },
            protein: { type: "number", description: "grams" },
            carbs: { type: "number", description: "grams" },
            fat: { type: "number", description: "grams" },
            fiber: { type: "number", description: "grams" },
            sugar: { type: "number", description: "grams" },
            sodium: { type: "number", description: "milligrams" },
            is_water: {
              type: "boolean",
              description: "true ONLY for plain water (paani); all nutrition must be 0",
            },
          },
          required: [
            "name",
            "portion",
            "confidence",
            "calories",
            "protein",
            "carbs",
            "fat",
            "fiber",
            "sugar",
            "sodium",
            "is_water",
          ],
        },
      },
      clarifying_question: {
        type: "string",
        description:
          "AT MOST ONE short question, only when an ambiguity swings calories >25%. Omit otherwise.",
      },
      items_reasoning: {
        type: "string",
        description: "Brief note on how items and portions were interpreted",
      },
    },
    required: ["is_food", "items"],
  },
};

const grams = V.number({ min: 0, max: 2000, clamp: true });

const itemValidator = V.object({
  name: V.string({ min: 1, max: 120 }),
  portion: V.string({ min: 1, max: 80 }),
  confidence: V.number({ min: 0, max: 100, clamp: true }),
  calories: V.number({ min: 0, max: 6000, clamp: true }),
  protein: grams,
  carbs: grams,
  fat: grams,
  fiber: grams,
  sugar: grams,
  sodium: V.number({ min: 0, max: 20000, clamp: true }),
  is_water: V.boolean(),
});

type TextItem = ReturnType<typeof itemValidator>;

interface TextResult {
  is_food: boolean;
  not_food_reason?: string;
  items: TextItem[];
  clarifying_question?: string;
  items_reasoning?: string;
}

const shapeValidator = V.object<TextResult & Record<string, unknown>>({
  is_food: V.boolean(),
  not_food_reason: V.optional(V.string({ max: 300 })),
  items: V.array(itemValidator, { max: 15 }),
  clarifying_question: V.optional(V.string({ max: 200 })),
  items_reasoning: V.optional(V.string({ max: 800 })),
});

function validateResult(input: unknown, path?: string): TextResult {
  const parsed = shapeValidator(input, path);
  if (parsed.is_food && parsed.items.length === 0) {
    throw new ValidationError(
      "is_food is true but items is empty — itemize every food mentioned",
    );
  }
  if (!parsed.is_food && !parsed.not_food_reason) {
    throw new ValidationError(
      "is_food is false but not_food_reason is missing — give a short friendly reason",
    );
  }
  for (const item of parsed.items) {
    if (item.is_water && item.calories > 0) {
      throw new ValidationError(
        `"${item.name}" has is_water=true but non-zero calories — plain water must be all zeros; drinks with calories are not water`,
      );
    }
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const startTime = Date.now();

  try {
    const supabase = serviceClient();
    const user = await requireUser(req, supabase);
    await enforceRateLimit(supabase, user.id, "analyze-food-text", 15, 60);

    const body = await readJsonBody(req);
    const description = body.description;
    if (typeof description !== "string" || description.trim().length === 0) {
      throw new HttpError(400, "bad_request", "Missing required field: description.");
    }
    if (description.length > 1000) {
      throw new HttpError(
        400,
        "bad_request",
        "Description too long — maximum 1000 characters.",
      );
    }

    console.log(
      `analyze-food-text: user=${user.id} len=${description.length}`,
    );

    const aiStart = Date.now();
    const result = await callGatewayTool<TextResult>({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content:
            `Parse this meal description into items and report via log_food_analysis: "${description.trim()}"`,
        },
      ],
      tool: TOOL,
      validate: validateResult,
    });
    const aiDurationMs = Date.now() - aiStart;

    // ---- Non-food path ----
    if (!result.is_food) {
      const reason = result.not_food_reason ??
        "I couldn't find any food in that description. Try something like '2 roti with dal'.";
      return jsonResponse({
        is_food: false,
        reason,
        items: [],
        nutritionData: {
          food_name: "",
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0,
        },
        analysis: {
          visual_analysis: reason,
          portion_estimation: "",
          nutritional_reasoning: reason,
        },
        meta: { items_count: 0, processing_time_ms: Date.now() - startTime },
      });
    }

    // ---- Post-process: macro floor + rounding ----
    const items = result.items.map((item) => {
      const { calories, corrected } = item.is_water
        ? { calories: 0, corrected: false }
        : reconcileCalories(item);
      if (corrected) {
        console.warn(
          `Macro-consistency correction applied to "${item.name}": ${item.calories} -> ${calories} kcal`,
        );
      }
      return {
        name: item.name,
        portion: item.portion,
        confidence: Math.round(item.confidence),
        calories,
        protein: round1(item.protein),
        carbs: round1(item.carbs),
        fat: round1(item.fat),
        fiber: round1(item.fiber),
        sugar: round1(item.sugar),
        sodium: Math.round(item.sodium),
        is_water: item.is_water,
      };
    });

    const totals = items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
        fiber: acc.fiber + item.fiber,
        sugar: acc.sugar + item.sugar,
        sodium: acc.sodium + item.sodium,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
    );

    const foodName = items.length === 1
      ? items[0].name
      : items.slice(0, 3).map((i) => i.name).join(", ") +
        (items.length > 3 ? ` +${items.length - 3} more` : "");

    const totalMs = Date.now() - startTime;
    console.log(JSON.stringify({
      event: "food_text_analysis_complete",
      model: MODEL,
      ai_duration_ms: aiDurationMs,
      total_duration_ms: totalMs,
      items_detected: items.length,
      total_calories: Math.round(totals.calories),
      has_water: items.some((i) => i.is_water),
    }));

    return jsonResponse({
      is_food: true,
      items,
      nutritionData: {
        food_name: foodName,
        calories: Math.round(totals.calories),
        protein: round1(totals.protein),
        carbs: round1(totals.carbs),
        fat: round1(totals.fat),
        fiber: round1(totals.fiber),
        sugar: round1(totals.sugar),
        sodium: Math.round(totals.sodium),
      },
      analysis: {
        visual_analysis: result.items_reasoning ??
          `Parsed ${items.length} item(s) from the description.`,
        portion_estimation: result.items_reasoning ?? "",
        nutritional_reasoning:
          `Detected ${items.length} item(s). Total: ${Math.round(totals.calories)} cal, ` +
          `${Math.round(totals.protein)}g protein, ${Math.round(totals.carbs)}g carbs, ${Math.round(totals.fat)}g fat.`,
      },
      ...(result.clarifying_question
        ? { clarifying_question: result.clarifying_question }
        : {}),
      meta: { items_count: items.length, processing_time_ms: totalMs },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
