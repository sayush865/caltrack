// All "day" logic is USER-LOCAL. Never UTC-bucket a local Date.
// See docs/CONTRACTS.md — hard rule 10.

import type { MealType } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local midnight for the given date (defaults to now). */
export function localDayStart(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Local end-of-day (23:59:59.999) for the given date (defaults to now). */
export function localDayEnd(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** "2026-07-20" in LOCAL time. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local midnight of a day key. */
export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** ISO range covering the local day — use with .gte('logged_at', fromISO).lt('logged_at', toISO). */
export function dayRangeISO(key: string): { fromISO: string; toISO: string } {
  const start = parseDayKey(key);
  const next = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  return { fromISO: start.toISOString(), toISO: next.toISOString() };
}

export function isToday(key: string): boolean {
  return key === dayKey(new Date());
}

export function isFuture(key: string): boolean {
  return parseDayKey(key).getTime() > localDayStart().getTime();
}

/**
 * Meal type from the clock, tuned to Indian eating hours:
 * 04:00–11:00 breakfast · 11:00–15:30 lunch · 15:30–19:00 snack (chai/evening)
 * 19:00–23:30 dinner · 23:30–04:00 snack (late night).
 */
export function suggestedMealType(d: Date = new Date()): MealType {
  const mins = d.getHours() * 60 + d.getMinutes();
  if (mins < 4 * 60) return "snack";
  if (mins < 11 * 60) return "breakfast";
  if (mins < 15 * 60 + 30) return "lunch";
  if (mins < 19 * 60) return "snack";
  if (mins < 23 * 60 + 30) return "dinner";
  return "snack";
}


/** "1:45 PM" */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "Today" | "Yesterday" | "Tue, Jul 15" */
export function friendlyDay(key: string): string {
  const today = localDayStart();
  const target = parseDayKey(key);
  const diffDays = Math.round((today.getTime() - target.getTime()) / DAY_MS);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return target.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
