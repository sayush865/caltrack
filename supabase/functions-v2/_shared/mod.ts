// supabase/functions-v2/_shared/mod.ts
// Shared edge-function toolkit for CalTrack v2 functions.
// Deno-deploy-ready; same URL-import style as the v1 functions.
//
// Provides:
//   - CORS headers + OPTIONS handling
//   - authenticated-user helper (requireUser)
//   - error envelope { error: { code, message } } that never leaks raw internals
//   - hand-rolled zod-like validation helpers (V.*, ValidationError) — no deps
//   - per-user rate limiter backed by the public.rate_limits table
//     (migrations-v2/0003_rate_limits.sql) with an atomic upsert RPC
//   - Lovable AI-gateway caller with a FORCED tool call + one repair-retry
//     when the tool arguments fail JSON parsing or semantic validation

import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

export type { SupabaseClient };

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

/** Returns a ready OPTIONS response, or null if this is not a preflight. */
export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

// ---------------------------------------------------------------------------
// Error envelope
// ---------------------------------------------------------------------------

export type ErrorCode =
  | "unauthorized"
  | "bad_request"
  | "rate_limited"
  | "payment_required"
  | "upstream_error"
  | "internal";

const GENERIC_MESSAGE = "Something went wrong on our side. Please try again.";

/**
 * An error whose `message` is SAFE to show to end users.
 * Anything that is not an HttpError (or a request-body ValidationError)
 * is logged server-side and collapsed to a generic message.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Convert any thrown value into the { error: { code, message } } envelope.
 * Raw error messages (env config, stack traces, upstream bodies) are logged
 * with console.error but NEVER returned to the client.
 */
export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) {
    return jsonResponse(
      { error: { code: err.code, message: err.message } },
      err.status,
    );
  }
  if (err instanceof ValidationError) {
    // Our own validator messages — authored by us, safe to surface.
    return jsonResponse(
      { error: { code: "bad_request", message: err.message } },
      400,
    );
  }
  console.error("Unhandled error:", err);
  return jsonResponse(
    { error: { code: "internal", message: GENERIC_MESSAGE } },
    500,
  );
}

// ---------------------------------------------------------------------------
// Supabase + auth
// ---------------------------------------------------------------------------

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured");
    throw new HttpError(500, "internal", GENERIC_MESSAGE);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface AuthedUser {
  id: string;
  email?: string;
}

/** Verifies the caller's JWT and returns the auth user, or throws 401. */
export async function requireUser(
  req: Request,
  supabase: SupabaseClient,
): Promise<AuthedUser> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HttpError(401, "unauthorized", "Missing authorization header.");
  }
  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw new HttpError(401, "unauthorized", "Invalid or expired session.");
  }
  return { id: data.user.id, email: data.user.email ?? undefined };
}

/** Parses the request body as a JSON object or throws a friendly 400. */
export async function readJsonBody(
  req: Request,
): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new Error("not an object");
    }
    return body as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "bad_request", "Request body must be a JSON object.");
  }
}

// ---------------------------------------------------------------------------
// Validation (hand-rolled, zod-like; no dependencies)
// ---------------------------------------------------------------------------

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export type Validator<T> = (input: unknown, path?: string) => T;

function at(path?: string): string {
  return path ? ` at "${path}"` : "";
}

export const V = {
  string(opts: { min?: number; max?: number } = {}): Validator<string> {
    return (input, path) => {
      if (typeof input !== "string") {
        throw new ValidationError(`expected a string${at(path)}`);
      }
      const s = input.trim();
      if (opts.min !== undefined && s.length < opts.min) {
        throw new ValidationError(
          `expected at least ${opts.min} characters${at(path)}`,
        );
      }
      if (opts.max !== undefined && s.length > opts.max) {
        throw new ValidationError(
          `expected at most ${opts.max} characters${at(path)}`,
        );
      }
      return s;
    };
  },

  /**
   * Number validator. With `clamp: true`, out-of-range values are clamped
   * into [min, max] instead of throwing (use for model outputs where a
   * retry over a small overshoot is wasteful). Non-numeric always throws.
   */
  number(
    opts: { min?: number; max?: number; clamp?: boolean } = {},
  ): Validator<number> {
    return (input, path) => {
      const n = typeof input === "string" && input.trim() !== ""
        ? Number(input)
        : input;
      if (typeof n !== "number" || !Number.isFinite(n)) {
        throw new ValidationError(`expected a number${at(path)}`);
      }
      let v = n;
      if (opts.min !== undefined && v < opts.min) {
        if (opts.clamp) v = opts.min;
        else throw new ValidationError(`expected >= ${opts.min}${at(path)}`);
      }
      if (opts.max !== undefined && v > opts.max) {
        if (opts.clamp) v = opts.max;
        else throw new ValidationError(`expected <= ${opts.max}${at(path)}`);
      }
      return v;
    };
  },

  boolean(): Validator<boolean> {
    return (input, path) => {
      if (typeof input !== "boolean") {
        throw new ValidationError(`expected a boolean${at(path)}`);
      }
      return input;
    };
  },

  oneOf<T extends string>(values: readonly T[]): Validator<T> {
    return (input, path) => {
      if (typeof input !== "string" || !values.includes(input as T)) {
        throw new ValidationError(
          `expected one of [${values.join(", ")}]${at(path)}`,
        );
      }
      return input as T;
    };
  },

  optional<T>(inner: Validator<T>): Validator<T | undefined> {
    return (input, path) => {
      if (input === undefined || input === null) return undefined;
      return inner(input, path);
    };
  },

  array<T>(
    inner: Validator<T>,
    opts: { min?: number; max?: number } = {},
  ): Validator<T[]> {
    return (input, path) => {
      if (!Array.isArray(input)) {
        throw new ValidationError(`expected an array${at(path)}`);
      }
      if (opts.min !== undefined && input.length < opts.min) {
        throw new ValidationError(
          `expected at least ${opts.min} item(s)${at(path)}`,
        );
      }
      if (opts.max !== undefined && input.length > opts.max) {
        throw new ValidationError(
          `expected at most ${opts.max} item(s)${at(path)}`,
        );
      }
      return input.map((el, i) => inner(el, `${path ?? ""}[${i}]`));
    };
  },

  object<T extends Record<string, unknown>>(
    shape: { [K in keyof T]: Validator<T[K]> },
  ): Validator<T> {
    return (input, path) => {
      if (typeof input !== "object" || input === null || Array.isArray(input)) {
        throw new ValidationError(`expected an object${at(path)}`);
      }
      const record = input as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(shape)) {
        const childPath = path ? `${path}.${key}` : key;
        out[key] = shape[key as keyof T](record[key], childPath);
      }
      return out as T;
    };
  },
} as const;

// ---------------------------------------------------------------------------
// Per-user rate limiting (Postgres-backed, atomic upsert)
// ---------------------------------------------------------------------------

/**
 * Enforces `limit` calls per `windowSeconds` per user per endpoint via the
 * rate_limit_hit() SECURITY DEFINER function (migrations-v2/0003).
 * The upsert is a single atomic statement — no read-modify-write race.
 *
 * FAILS OPEN (with a loud log) if the RPC does not exist yet, so v2 functions
 * can be deployed before the migration lands without breaking logging.
 */
export async function enforceRateLimit(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
  limit = 10,
  windowSeconds = 60,
): Promise<void> {
  const { data, error } = await supabase.rpc("rate_limit_hit", {
    p_user_id: userId,
    p_endpoint: endpoint,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });
  if (error) {
    console.error(
      `rate_limit_hit RPC failed (FAILING OPEN — apply 0003_rate_limits.sql): ${error.message}`,
    );
    return;
  }
  if (data === false) {
    throw new HttpError(
      429,
      "rate_limited",
      "Too many requests. Please wait a minute and try again.",
    );
  }
}

// ---------------------------------------------------------------------------
// AI gateway caller: forced tool call + one repair-retry
// ---------------------------------------------------------------------------

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface GatewayToolOpts<T> {
  model: string;
  messages: Array<Record<string, unknown>>;
  tool: ToolSpec;
  /** Semantic validation of the tool arguments. Throw ValidationError to trigger the repair retry. */
  validate: Validator<T>;
}

/**
 * Calls the Lovable AI gateway with tool_choice FORCED to `tool`.
 * If the model's tool arguments fail to parse or fail `validate`, the
 * validator error is fed back and the model gets exactly ONE repair attempt.
 * Upstream errors are logged in full and surfaced only as safe envelopes.
 */
export async function callGatewayTool<T>(opts: GatewayToolOpts<T>): Promise<T> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("LOVABLE_API_KEY not configured");
    throw new HttpError(500, "internal", GENERIC_MESSAGE);
  }

  let messages = [...opts.messages];
  let lastError = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        messages,
        tools: [{ type: "function", function: opts.tool }],
        tool_choice: { type: "function", function: { name: opts.tool.name } },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("AI gateway error:", res.status, errorText);
      if (res.status === 429) {
        throw new HttpError(
          429,
          "rate_limited",
          "The AI service is busy right now. Please try again in a moment.",
        );
      }
      if (res.status === 402) {
        throw new HttpError(
          402,
          "payment_required",
          "AI analysis is temporarily unavailable. Please try again later.",
        );
      }
      throw new HttpError(
        502,
        "upstream_error",
        "The AI service returned an error. Please try again.",
      );
    }

    const data = await res.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const rawArgs: unknown = call?.function?.arguments;

    try {
      if (
        !call ||
        call.function?.name !== opts.tool.name ||
        typeof rawArgs !== "string"
      ) {
        throw new ValidationError(
          `the model did not call the required tool "${opts.tool.name}"`,
        );
      }
      const parsed = JSON.parse(rawArgs);
      return opts.validate(parsed);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(
        `Tool output invalid (attempt ${attempt}/2): ${lastError}`,
      );
      if (attempt === 2) break;
      // Repair retry: show the model what it produced and why it was rejected.
      messages = [
        ...messages,
        {
          role: "assistant",
          content: typeof rawArgs === "string"
            ? `My previous ${opts.tool.name} arguments were:\n${rawArgs.slice(0, 6000)}`
            : "(I failed to produce a tool call.)",
        },
        {
          role: "user",
          content:
            `Your previous ${opts.tool.name} call was INVALID: ${lastError}. ` +
            `Call ${opts.tool.name} again with corrected arguments that strictly satisfy the schema. ` +
            `Fix only what is wrong; keep everything that was already valid.`,
        },
      ];
    }
  }

  console.error("Tool output failed validation after repair retry:", lastError);
  throw new HttpError(
    502,
    "upstream_error",
    "The AI response could not be validated. Please try again.",
  );
}

// ---------------------------------------------------------------------------
// Nutrition helpers
// ---------------------------------------------------------------------------

export const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * Code-level macro-consistency floor (prompt asks the model to self-check
 * kcal ≈ 4P + 4C + 9F ± 10%; this enforces the physically-impossible case).
 * Calories can legitimately EXCEED 4P+4C+9F (alcohol, organic acids), but
 * can never be meaningfully below it — so we only raise, never lower.
 */
export function reconcileCalories(item: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}): { calories: number; corrected: boolean } {
  const derived = item.protein * 4 + item.carbs * 4 + item.fat * 9;
  if (derived >= 20 && item.calories < derived * 0.9) {
    return { calories: Math.round(derived), corrected: true };
  }
  return { calories: Math.round(item.calories), corrected: false };
}
