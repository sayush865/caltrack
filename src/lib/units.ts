// Weight/height unit conversion. ALL weights are STORED in kg everywhere
// (weight_logs.weight, user_goals.current_weight/goal_weight).
// Convert at the edge (display/input) only.

export type Units = "metric" | "imperial";

const LB_PER_KG = 2.2046226218;
const CM_PER_IN = 2.54;

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

export function cmToFtIn(cm: number): { ft: number; in: number } {
  const totalIn = cm / CM_PER_IN;
  let ft = Math.floor(totalIn / 12);
  let inches = Math.round(totalIn - ft * 12);
  if (inches === 12) {
    ft += 1;
    inches = 0;
  }
  return { ft, in: inches };
}

export function ftInToCm(ft: number, inches: number): number {
  return (ft * 12 + inches) * CM_PER_IN;
}

export function weightUnit(units: Units): "kg" | "lb" {
  return units === "imperial" ? "lb" : "kg";
}

/** Convert a stored-kg value into the display number for the user's units. */
export function displayWeight(kg: number, units: Units): number {
  const value = units === "imperial" ? kgToLb(kg) : kg;
  return Math.round(value * 10) / 10;
}

/** Convert a user-entered value (in their units) back to kg for storage. */
export function toKg(value: number, units: Units): number {
  return units === "imperial" ? lbToKg(value) : value;
}

/** "72.4 kg" | "159.6 lb" */
export function formatWeight(kg: number, units: Units, digits = 1): string {
  const value = units === "imperial" ? kgToLb(kg) : kg;
  return `${value.toFixed(digits)} ${weightUnit(units)}`;
}
