// supabase/functions-v2/analyze-food/index.ts
// Photo → itemized nutrition analysis. v2 rebuild.
//
// Changes vs v1:
//   - google/gemini-2.5-flash (was 2.5-pro): ~3x faster, cheaper, sufficient
//     accuracy per research corpus once the prompt carries the scale priors.
//   - State-of-the-art vision prompt: scene check → itemize → scale anchors →
//     grams-first quantify with upward bias correction → confidence rubric →
//     ONE optional clarifying question → macro self-check.
//   - is_food:false friendly path (never an error/refusal).
//   - Indian-food awareness (katori/roti/dal priors, ghee/tadka assumptions
//     stated explicitly).
//   - Micros (vitamins/calcium/iron) are OPTIONAL — no forced hallucination.
//   - Per-user rate limit (10/min), shared error envelope, repair-retry.
//
// Response is BACKWARD-COMPATIBLE with v1:
//   { items[], nutritionData, analysis, meta } unchanged;
//   NEW optional fields: is_food, reason, clarifying_question;
//   items[].confidence stays 0-100.

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
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are CalTrack's food-photo analysis engine: a meticulous nutritionist who estimates what is actually on the plate, not an idealized serving. Work through these steps IN ORDER, then report via the log_food_analysis tool.

STEP 1 — SCENE CHECK. Is there edible food or drink in the image? If not (a pet, a selfie, a desk, a blurry nothing), set is_food=false with a short, friendly, non-judgmental reason (e.g. "That looks like a very good dog, but I can't find any food here."). Return items=[] and stop. If the image contains a NUTRITION LABEL or a menu, read it — printed data beats visual estimation; say so in portion_reasoning.

STEP 2 — ITEMIZE. List EVERY distinct food and drink: main dish, sides, breads, condiments, sauces, drinks, desserts. Combination names must be split into separate items ("rajma chawal" → rajma + steamed rice; "dal roti" → dal + roti). Include cooking method in the name ("paneer bhurji (cooked in oil)", not "paneer").

STEP 3 — FIND SCALE ANCHORS. Before estimating any amount, identify reference objects and state them in portion_reasoning: dinner plate ≈ 26 cm, side plate ≈ 18 cm, fork ≈ 19 cm, adult hand ≈ 18 cm, credit card ≈ 8.5 cm, standard glass ≈ 250 ml, mug ≈ 300 ml, katori (Indian bowl) ≈ 150–180 ml, standard steel thali ≈ 30 cm. If NO scale cue exists, say so and lower confidence.

STEP 4 — QUANTIFY GRAMS-FIRST. For each item estimate the weight in grams (or ml) FIRST, then derive calories and macros from that weight. Put the gram estimate in the portion string, e.g. "1 katori (160 g)", "1 cup cooked (180 g)". Record HOW you got it in portion_basis (anchor used, fraction of plate covered, label read).

STEP 5 — BIAS CORRECTION. Vision models systematically UNDERESTIMATE, and the error grows with portion size. If a serving is large, heaped, or a homogeneous mass (mound of rice, full bowl of dal or pasta, big smoothie), revise your gram estimate UPWARD by 15–25% before computing nutrition. Do not apply this to small or clearly measured portions.

STEP 6 — HIDDEN CALORIES. Account for cooking fat, sauces, dressings, sugar in drinks. INDIAN FOOD PRIORS: 1 katori ≈ 150 ml holds ~150–200 g of dal/sabzi; a home phulka/roti ≈ 40 g (~105 kcal) while a restaurant tandoori roti/naan ≈ 60–80 g; dal/sabzi tadka adds 40–60 kcal of ghee/oil per katori; assume a standard ghee/oil tadka for home-style dal and curries UNLESS the dish looks visibly dry — and STATE the assumption (e.g. name it "dal tadka (with ghee)" or note it in portion_basis). Restaurant food gets more oil than home food.

STEP 7 — CONFIDENCE (0–100 per item), use this rubric:
  85–100: packaged/labeled food, or a simple whole food with a clear scale anchor (an apple next to a hand).
  60–84: simple prepared dish, portion clearly visible with an anchor.
  35–59: mixed dish with hidden fats/oils (curries, biryani, casseroles, dressed salads).
  <35: no scale cues, heavily obscured, or unusual preparation.

STEP 8 — ONE CLARIFYING QUESTION (optional). If a single ambiguity could swing total calories by MORE than 25% (ghee tadka vs plain? sweet or salted lassi? fried or baked? restaurant or homemade? diet or regular soda?), ask exactly ONE short question in clarifying_question. ALWAYS still provide your best estimate for every item — never block on the answer. If nothing swings >25%, omit the question.

STEP 9 — SELF-CHECK. For every item verify calories ≈ 4×protein + 4×carbs + 9×fat within ±10% (drinks with alcohol may run higher). Fix any item that fails BEFORE calling the tool.

MICRONUTRIENTS: only include vitamin_a / vitamin_c / calcium / iron when you genuinely know them (e.g. from a label). NEVER fabricate micros; omitting them is correct.`;

// ---------------------------------------------------------------------------
// Tool schema + output validation
// ---------------------------------------------------------------------------

const TOOL = {
  name: "log_food_analysis",
  description:
    "Report the food analysis: scene check result, itemized foods with grams-first portions, nutrition, confidence, and at most one clarifying question.",
  parameters: {
    type: "object",
    properties: {
      is_food: {
        type: "boolean",
        description: "false if the image contains no edible food or drink",
      },
      not_food_reason: {
        type: "string",
        description:
          "Friendly one-sentence reason when is_food is false (never scolding)",
      },
      items: {
        type: "array",
        description:
          "Every distinct food/drink item. Empty when is_food is false.",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                "Food name including preparation and stated fat assumptions, e.g. 'dal tadka (with ghee)'",
            },
            portion: {
              type: "string",
              description:
                "Human portion WITH grams/ml, e.g. '1 katori (160 g)', '2 rotis (80 g)'",
            },
            portion_basis: {
              type: "string",
              description:
                "How the amount was derived: scale anchor used, plate fraction, label read, or assumption stated",
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Per the rubric: 85+ labeled/simple, 35-59 mixed dishes, <35 no scale cues",
            },
            calories: { type: "number", description: "kcal for this portion" },
            protein: { type: "number", description: "grams" },
            carbs: { type: "number", description: "grams" },
            fat: { type: "number", description: "grams" },
            fiber: { type: "number", description: "grams" },
            sugar: { type: "number", description: "grams" },
            sodium: { type: "number", description: "milligrams" },
            vitamin_a: { type: "number", description: "mcg — ONLY if known from a label; otherwise omit" },
            vitamin_c: { type: "number", description: "mg — ONLY if known; otherwise omit" },
            calcium: { type: "number", description: "mg — ONLY if known; otherwise omit" },
            iron: { type: "number", description: "mg — ONLY if known; otherwise omit" },
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
          ],
        },
      },
      clarifying_question: {
        type: "string",
        description:
          "AT MOST ONE short question, only when an ambiguity swings calories >25%. Omit otherwise.",
      },
      visual_description: {
        type: "string",
        description: "Brief description of what is visible in the image",
      },
      portion_reasoning: {
        type: "string",
        description:
          "Scale anchors found and how portions were derived, including any bias correction applied",
      },
    },
    required: ["is_food", "items", "visual_description", "portion_reasoning"],
  },
};

const grams = V.number({ min: 0, max: 2000, clamp: true });
const optionalMicro = V.optional(V.number({ min: 0, max: 100000, clamp: true }));

const itemValidator = V.object({
  name: V.string({ min: 1, max: 120 }),
  portion: V.string({ min: 1, max: 80 }),
  portion_basis: V.optional(V.string({ max: 240 })),
  confidence: V.number({ min: 0, max: 100, clamp: true }),
  calories: V.number({ min: 0, max: 6000, clamp: true }),
  protein: grams,
  carbs: grams,
  fat: grams,
  fiber: grams,
  sugar: grams,
  sodium: V.number({ min: 0, max: 20000, clamp: true }),
  vitamin_a: optionalMicro,
  vitamin_c: optionalMicro,
  calcium: optionalMicro,
  iron: optionalMicro,
});

type AnalysisItem = ReturnType<typeof itemValidator>;

interface AnalysisResult {
  is_food: boolean;
  not_food_reason?: string;
  items: AnalysisItem[];
  clarifying_question?: string;
  visual_description?: string;
  portion_reasoning?: string;
}

const shapeValidator = V.object<AnalysisResult & Record<string, unknown>>({
  is_food: V.boolean(),
  not_food_reason: V.optional(V.string({ max: 300 })),
  items: V.array(itemValidator, { max: 15 }),
  clarifying_question: V.optional(V.string({ max: 200 })),
  visual_description: V.optional(V.string({ max: 800 })),
  portion_reasoning: V.optional(V.string({ max: 800 })),
});

function validateAnalysis(input: unknown, path?: string): AnalysisResult {
  const parsed = shapeValidator(input, path);
  if (parsed.is_food && parsed.items.length === 0) {
    throw new ValidationError(
      "is_food is true but items is empty — itemize every food visible in the image",
    );
  }
  if (!parsed.is_food && !parsed.not_food_reason) {
    throw new ValidationError(
      "is_food is false but not_food_reason is missing — give a short friendly reason",
    );
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
    await enforceRateLimit(supabase, user.id, "analyze-food", 10, 60);

    const body = await readJsonBody(req);
    const imageBase64 = body.imageBase64;
    if (typeof imageBase64 !== "string" || !imageBase64.startsWith("data:image/")) {
      throw new HttpError(
        400,
        "bad_request",
        "imageBase64 must be a data:image/* URL.",
      );
    }
    const base64Data = imageBase64.split(",")[1];
    if (!base64Data) {
      throw new HttpError(400, "bad_request", "Invalid image data format.");
    }
    const estimatedBytes = (base64Data.length * 3) / 4;
    if (estimatedBytes > MAX_IMAGE_BYTES) {
      throw new HttpError(400, "bad_request", "Image exceeds the 10MB limit.");
    }
    console.log(
      `analyze-food: user=${user.id} image=${Math.round(estimatedBytes / 1024)}KB`,
    );

    const aiStart = Date.now();
    const result = await callGatewayTool<AnalysisResult>({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Analyze this food image. Scene-check first, then itemize ALL foods, anchor the scale, quantify grams-first with bias correction, and report via log_food_analysis.",
            },
            { type: "image_url", image_url: { url: imageBase64 } },
          ],
        },
      ],
      tool: TOOL,
      validate: validateAnalysis,
    });
    const aiDurationMs = Date.now() - aiStart;

    // ---- Non-food path: friendly, structured, still HTTP 200 ----
    if (!result.is_food) {
      const reason = result.not_food_reason ??
        "I couldn't find any food in this photo. Try a clearer shot of your meal.";
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
          visual_analysis: result.visual_description ?? reason,
          portion_estimation: "",
          nutritional_reasoning: reason,
        },
        meta: { items_count: 0, processing_time_ms: Date.now() - startTime },
      });
    }

    // ---- Post-process: macro-consistency floor + rounding ----
    const items = result.items.map((item) => {
      const { calories, corrected } = reconcileCalories(item);
      if (corrected) {
        console.warn(
          `Macro-consistency correction applied to "${item.name}": ${item.calories} -> ${calories} kcal`,
        );
      }
      const out: Record<string, number | string> = {
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
      };
      if (item.portion_basis) out.portion_basis = item.portion_basis;
      if (item.vitamin_a !== undefined) out.vitamin_a = Math.round(item.vitamin_a);
      if (item.vitamin_c !== undefined) out.vitamin_c = round1(item.vitamin_c);
      if (item.calcium !== undefined) out.calcium = Math.round(item.calcium);
      if (item.iron !== undefined) out.iron = round1(item.iron);
      return out;
    });

    const totals = items.reduce(
      (acc, item) => ({
        calories: acc.calories + (item.calories as number),
        protein: acc.protein + (item.protein as number),
        carbs: acc.carbs + (item.carbs as number),
        fat: acc.fat + (item.fat as number),
        fiber: acc.fiber + (item.fiber as number),
        sugar: acc.sugar + (item.sugar as number),
        sodium: acc.sodium + (item.sodium as number),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
    );

    const foodName = items.length === 1
      ? (items[0].name as string)
      : items.slice(0, 3).map((i) => i.name).join(", ") +
        (items.length > 3 ? ` +${items.length - 3} more` : "");

    const totalMs = Date.now() - startTime;
    console.log(JSON.stringify({
      event: "food_analysis_complete",
      model: MODEL,
      ai_duration_ms: aiDurationMs,
      total_duration_ms: totalMs,
      items_detected: items.length,
      total_calories: Math.round(totals.calories),
      has_clarifying_question: Boolean(result.clarifying_question),
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
        visual_analysis: result.visual_description ?? "",
        portion_estimation: result.portion_reasoning ?? "",
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
