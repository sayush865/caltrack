// AI edge-function client layer. Maps deployed responses to DraftItem[].
// Deployed functions are FROZEN for v1: analyze-food (items[]), analyze-food-text (single blob),
// generate-insights ({insights: [{category, emoji, message}]}).

import { supabase } from "@/integrations/supabase/client";
import { dayKey } from "./dates";
import type {
  AnalyzeFoodResponse,
  AnalyzeTextResponse,
  DraftItem,
  Insight,
  InsightPayload,
  InsightSnapshot,
  MacroSet,
} from "./types";

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toMacroSet(blob: Record<string, unknown>): MacroSet {
  return {
    calories: num(blob.calories),
    protein: num(blob.protein),
    carbs: num(blob.carbs),
    fat: num(blob.fat),
    fiber: num(blob.fiber),
    sugar: num(blob.sugar),
    sodium: num(blob.sodium),
  };
}

function makeDraftItem(
  name: string,
  base: MacroSet,
  portion: string,
  confidence?: number,
  waterMl?: number,
): DraftItem {
  return {
    id: crypto.randomUUID(),
    name,
    portion,
    quantity: 1,
    confidence,
    base,
    ...base, // display macros at quantity 1 = base
    waterMl: waterMl && waterMl > 0 ? Math.round(waterMl) : undefined,
  };
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Analysis aborted", "AbortError");
}

/** Calls analyze-food; maps items[] -> DraftItem[] (base = per-1x macros as returned). */
export async function analyzePhoto(imageBase64: string, signal?: AbortSignal): Promise<DraftItem[]> {
  throwIfAborted(signal);
  const { data, error } = await supabase.functions.invoke("analyze-food", {
    body: { imageBase64 },
  });
  throwIfAborted(signal);
  if (error) throw error;

  const response = data as AnalyzeFoodResponse | null;
  const items = response?.items;
  if (Array.isArray(items) && items.length > 0) {
    return items.map((item) =>
      makeDraftItem(
        String(item.name ?? "Food item"),
        toMacroSet(item as Record<string, unknown>),
        String(item.portion ?? "1 serving"),
        item.confidence !== undefined ? num(item.confidence) : undefined,
        num((item as Record<string, unknown>).water_ml),
      ),
    );
  }

  // Defensive fallback: older responses may only carry the aggregate blob.
  if (response?.nutritionData) {
    const blob = response.nutritionData as Record<string, unknown>;
    return [makeDraftItem(String(blob.food_name ?? "Food item"), toMacroSet(blob), "1 serving", undefined, num(blob.water_ml))];
  }

  throw new Error("Invalid response from analysis");
}

/** Calls analyze-food-text; maps the single nutrition blob -> [one DraftItem]. */
export async function analyzeText(text: string, signal?: AbortSignal): Promise<DraftItem[]> {
  throwIfAborted(signal);
  const { data, error } = await supabase.functions.invoke("analyze-food-text", {
    // Deployed function expects { description } (see legacy TextFood.tsx).
    body: { description: text.trim() },
  });
  throwIfAborted(signal);
  if (error) throw error;

  const response = data as AnalyzeTextResponse | null;
  if (!response?.nutritionData) throw new Error("Invalid response from analysis");

  const blob = response.nutritionData as Record<string, unknown>;
  return [
    makeDraftItem(
      String(blob.food_name ?? "Food item"),
      toMacroSet(blob),
      "1 serving",
      undefined,
      num(blob.water_ml),
    ),
  ];
}

/** generate-insights: returns the insight list plus the deterministic day snapshot. */
export async function fetchDailyInsights(): Promise<InsightPayload> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("generate-insights", {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: { dayKey: dayKey(new Date()), tzOffsetMinutes: new Date().getTimezoneOffset() },
  });
  if (error) throw error;

  const payload = data as { insights?: Insight[]; snapshot?: InsightSnapshot; state?: string } | null;
  const insights = payload?.insights;
  if (!Array.isArray(insights)) throw new Error("Invalid insights response");
  return {
    insights: insights.filter((i) => i && typeof i.message === "string"),
    snapshot: payload?.snapshot ?? null,
    state: payload?.state ?? null,
  };
}

/** Canvas resize to <=maxDim, WebP dataURL (quality 0.85) with JPEG fallback. */
export function compressImage(file: Blob, maxDim = 768): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const webp = canvas.toDataURL("image/webp", 0.85);
        if (webp.startsWith("data:image/webp")) {
          resolve(webp);
        } else {
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        }
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Failed to compress image"));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    img.src = objectUrl;
  });
}
