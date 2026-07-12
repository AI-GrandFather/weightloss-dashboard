const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EXERCISE_TYPES = new Set(["walk", "run", "gym", "cycling", "other"]);

export function requireDate(value: string): string {
  if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error("Enter a valid date.");
  }
  return value;
}

export function requireText(value: string, field: string, maxLength = 200): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    throw new Error(`${field} must be between 1 and ${maxLength} characters.`);
  }
  return trimmed;
}

export function optionalText(value: string, field: string, maxLength = 500): string | null {
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new Error(`${field} must be ${maxLength} characters or fewer.`);
  return trimmed || null;
}

export function requireNumber(value: number, field: string, min: number, max: number): number {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${field} must be between ${min} and ${max}.`);
  }
  return value;
}

export function optionalNumber(value: number | null, field: string, min: number, max: number): number | null {
  return value === null ? null : requireNumber(value, field, min, max);
}

export function requireExerciseType(value: string): string {
  if (!EXERCISE_TYPES.has(value)) throw new Error("Select a valid exercise type.");
  return value;
}

export function foodCacheKey(foodName: string, quantity: string): string {
  return `${foodName.trim().toLowerCase()}::${(quantity.trim() || "1 serving").toLowerCase()}`;
}
