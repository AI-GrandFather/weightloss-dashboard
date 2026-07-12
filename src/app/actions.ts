"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createSessionToken, isValidSession, SESSION_COOKIE, constantTimeEqual } from "@/lib/session";
import {
  foodCacheKey,
  optionalNumber,
  optionalText,
  requireDate,
  requireExerciseType,
  requireNumber,
  requireText,
} from "@/lib/validation";

async function assertAuthorized(): Promise<void> {
  const secret = process.env.SHARED_SECRET;
  if (!secret) throw new Error("Dashboard access is not configured.");
  const cookieStore = await cookies();
  if (!(await isValidSession(cookieStore.get(SESSION_COOKIE)?.value, secret))) {
    throw new Error("Your dashboard session has expired. Refresh and unlock it again.");
  }
}

// 1. Weight Log Actions
export async function addWeightLog(date: string, weight: number, note: string) {
  await assertAuthorized();
  const validDate = requireDate(date);
  const validWeight = requireNumber(weight, "Weight", 20, 500);
  const validNote = optionalText(note, "Note");
  
  await query(
    `INSERT INTO weight_logs (logged_date, weight_kg, note) 
     VALUES ($1, $2, $3) 
     ON CONFLICT (logged_date) 
     DO UPDATE SET weight_kg = EXCLUDED.weight_kg, note = EXCLUDED.note`,
    [validDate, validWeight, validNote]
  );
  revalidatePath("/");
}

export async function deleteWeightLog(id: string) {
  await assertAuthorized();
  requireText(id, "Log ID", 100);
  await query(`DELETE FROM weight_logs WHERE id = $1`, [id]);
  revalidatePath("/");
}

// 2. Exercise Log Actions
export async function addExerciseLog(
  date: string, 
  type: string, 
  duration: number | null, 
  distance: number | null, 
  caloriesBurned: number | null, 
  note: string
) {
  await assertAuthorized();
  const validDate = requireDate(date);
  const validType = requireExerciseType(type);
  const validDuration = optionalNumber(duration, "Duration", 0, 1440);
  const validDistance = optionalNumber(distance, "Distance", 0, 1000);
  const validCalories = optionalNumber(caloriesBurned, "Calories burned", 0, 10000);
  const validNote = optionalText(note, "Note");
  
  await query(
    `INSERT INTO exercise_logs (logged_date, exercise_type, duration_minutes, distance_km, calories_burned, note) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [validDate, validType, validDuration, validDistance, validCalories, validNote]
  );
  revalidatePath("/");
}

export async function deleteExerciseLog(id: string) {
  await assertAuthorized();
  requireText(id, "Log ID", 100);
  await query(`DELETE FROM exercise_logs WHERE id = $1`, [id]);
  revalidatePath("/");
}

// 3. Daily Steps Actions
export async function addDailySteps(date: string, steps: number) {
  await assertAuthorized();
  const validDate = requireDate(date);
  const validSteps = requireNumber(steps, "Steps", 0, 200000);
  
  await query(
    `INSERT INTO daily_steps (logged_date, steps) 
     VALUES ($1, $2) 
     ON CONFLICT (logged_date) 
     DO UPDATE SET steps = EXCLUDED.steps`,
    [validDate, validSteps]
  );
  revalidatePath("/");
}

export async function deleteDailySteps(date: string) {
  await assertAuthorized();
  requireDate(date);
  await query(`DELETE FROM daily_steps WHERE logged_date = $1`, [date]);
  revalidatePath("/");
}

// 4. Diet Log & Estimation Actions
export interface EstimatedMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: 'cache' | 'llm';
  modelUsed?: string;
}

export interface FoodCacheRow {
  calories: number;
  protein_g: string | number | null;
  carbs_g: string | number | null;
  fat_g: string | number | null;
  model_used: string;
}

export async function estimateFood(foodName: string, quantity: string): Promise<EstimatedMacros> {
  await assertAuthorized();
  const validFoodName = requireText(foodName, "Food name");
  const validQuantity = optionalText(quantity, "Quantity", 100) ?? "";
  const normalized = foodCacheKey(validFoodName, validQuantity);

  // Check Cache first (D003)
  const cachedRows = await query<FoodCacheRow>(
    `SELECT calories, protein_g, carbs_g, fat_g, model_used 
     FROM food_cache 
     WHERE normalized_name = $1`,
    [normalized]
  );

  if (cachedRows.length > 0) {
    const cached = cachedRows[0];
    return {
      calories: cached.calories,
      protein: Number(cached.protein_g || 0),
      carbs: Number(cached.carbs_g || 0),
      fat: Number(cached.fat_g || 0),
      source: 'cache',
      modelUsed: cached.model_used
    };
  }

  // Cache Miss -> Call Groq API via standard HTTP fetch (D004)
  const liteLlmBaseUrl = process.env.LITELLM_BASE_URL?.replace(/\/$/, "");
  const apiKey = liteLlmBaseUrl ? process.env.LITELLM_API_KEY : process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(`${liteLlmBaseUrl ? "LITELLM_API_KEY" : "GROQ_API_KEY"} is not configured.`);
  }

  const modelUsed = liteLlmBaseUrl
    ? (process.env.LITELLM_MODEL || "groq/llama-3.3-70b-versatile")
    : "llama-3.3-70b-versatile";
  
  try {
    const response = await fetch(`${liteLlmBaseUrl || "https://api.groq.com/openai/v1"}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelUsed,
        messages: [
          {
            role: "system",
            content: `You are a nutrition expert. Estimate the calories, protein (in grams), carbs (in grams), and fat (in grams) for the given food item and quantity.
Respond ONLY with a JSON object in this exact format:
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number
}`
          },
          {
            role: "user",
            content: `Food: ${validFoodName}, Quantity: ${validQuantity || "1 serving"}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API responded with status ${response.status}: ${errorText}`);
    }

    const data: unknown = await response.json();
    const content = getCompletionContent(data);
    if (!content) {
      throw new Error("Empty response from estimation model.");
    }

    const parsed: unknown = JSON.parse(content);
    if (!isMacroResponse(parsed)) throw new Error("Estimation model returned invalid nutrition data.");
    return {
      calories: Math.round(requireNumber(parsed.calories, "Calories", 0, 10000)),
      protein: requireNumber(parsed.protein, "Protein", 0, 1000),
      carbs: requireNumber(parsed.carbs, "Carbs", 0, 2000),
      fat: requireNumber(parsed.fat, "Fat", 0, 1000),
      source: 'llm',
      modelUsed
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Estimation failed:", err);
    throw new Error(`Failed to estimate calories: ${errorMsg}`);
  }
}

export async function addDietLog(
  date: string,
  foodName: string,
  quantity: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  source: 'llm' | 'manual_override'
) {
  await assertAuthorized();
  const validDate = requireDate(date);
  const validFoodName = requireText(foodName, "Food name");
  const validQuantity = optionalText(quantity, "Quantity", 100);
  const validCalories = requireNumber(calories, "Calories", 0, 10000);
  const validProtein = requireNumber(protein, "Protein", 0, 1000);
  const validCarbs = requireNumber(carbs, "Carbs", 0, 2000);
  const validFat = requireNumber(fat, "Fat", 0, 1000);

  // 1. Insert into diet_logs
  await query(
    `INSERT INTO diet_logs (logged_date, food_name, quantity, calories, protein_g, carbs_g, fat_g, source) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [validDate, validFoodName, validQuantity, validCalories, validProtein, validCarbs, validFat, source]
  );

  // 2. Cache the normalized name with these final values (upsert)
  const normalized = foodCacheKey(validFoodName, validQuantity ?? "");
  const modelUsed = source === 'llm'
    ? (process.env.LITELLM_MODEL || 'groq/llama-3.3-70b-versatile')
    : 'manual_override';
  await query(
    `INSERT INTO food_cache (normalized_name, calories, protein_g, carbs_g, fat_g, model_used) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     ON CONFLICT (normalized_name) 
     DO UPDATE SET 
       calories = EXCLUDED.calories, 
       protein_g = EXCLUDED.protein_g, 
       carbs_g = EXCLUDED.carbs_g, 
       fat_g = EXCLUDED.fat_g, 
       model_used = EXCLUDED.model_used`,
    [normalized, validCalories, validProtein, validCarbs, validFat, modelUsed]
  );

  revalidatePath("/");
}

export async function deleteDietLog(id: string) {
  await assertAuthorized();
  requireText(id, "Log ID", 100);
  await query(`DELETE FROM diet_logs WHERE id = $1`, [id]);
  revalidatePath("/");
}

export interface WeightLogRow {
  id: string;
  logged_date: string | Date;
  weight_kg: string | number;
  note: string | null;
  created_at: string | Date;
}

export interface ExerciseLogRow {
  id: string;
  logged_date: string | Date;
  exercise_type: string;
  duration_minutes: number | null;
  distance_km: string | number | null;
  calories_burned: number | null;
  note: string | null;
  created_at: string | Date;
}

export interface DailyStepsRow {
  logged_date: string | Date;
  steps: number;
  created_at: string | Date;
}

export interface DietLogRow {
  id: string;
  logged_date: string | Date;
  food_name: string;
  quantity: string | null;
  calories: number;
  protein_g: string | number | null;
  carbs_g: string | number | null;
  fat_g: string | number | null;
  source: string;
  created_at: string | Date;
}

// 5. Fetch Actions for Dashboard v0
export async function getDashboardData(dateStr: string) {
  await assertAuthorized();
  requireDate(dateStr);
  const [weightLogs, exerciseLogs, stepsLogs, dietLogs] = await Promise.all([
    query<WeightLogRow>(`SELECT * FROM weight_logs ORDER BY logged_date DESC LIMIT 30`),
    query<ExerciseLogRow>(`SELECT * FROM exercise_logs ORDER BY logged_date DESC, created_at DESC LIMIT 30`),
    query<DailyStepsRow>(`SELECT * FROM daily_steps ORDER BY logged_date DESC LIMIT 30`),
    query<DietLogRow>(`SELECT * FROM diet_logs ORDER BY logged_date DESC, created_at DESC LIMIT 30`)
  ]);

  // Calculate today's aggregates
  const todayWeight = weightLogs.length > 0 ? weightLogs[0] : null;
  
  const todayStepsRow = stepsLogs.find((s: DailyStepsRow) => {
    // format date as YYYY-MM-DD
    const sDate = s.logged_date instanceof Date ? s.logged_date.toISOString().split('T')[0] : s.logged_date;
    return sDate === dateStr;
  });
  const todaySteps = todayStepsRow ? todayStepsRow.steps : 0;

  const todayExercises = exerciseLogs.filter((e: ExerciseLogRow) => {
    const eDate = e.logged_date instanceof Date ? e.logged_date.toISOString().split('T')[0] : e.logged_date;
    return eDate === dateStr;
  });
  const todayExerciseMinutes = todayExercises.reduce((sum: number, e: ExerciseLogRow) => sum + (e.duration_minutes || 0), 0);
  const todayExerciseCalories = todayExercises.reduce((sum: number, e: ExerciseLogRow) => sum + (e.calories_burned || 0), 0);

  const todayDiet = dietLogs.filter((d: DietLogRow) => {
    const dDate = d.logged_date instanceof Date ? d.logged_date.toISOString().split('T')[0] : d.logged_date;
    return dDate === dateStr;
  });
  const todayDietCalories = todayDiet.reduce((sum: number, d: DietLogRow) => sum + (d.calories || 0), 0);
  const todayDietProtein = todayDiet.reduce((sum: number, d: DietLogRow) => sum + Number(d.protein_g || 0), 0);
  const todayDietCarbs = todayDiet.reduce((sum: number, d: DietLogRow) => sum + Number(d.carbs_g || 0), 0);
  const todayDietFat = todayDiet.reduce((sum: number, d: DietLogRow) => sum + Number(d.fat_g || 0), 0);

  return {
    weightLogs,
    exerciseLogs,
    stepsLogs,
    dietLogs,
    today: {
      weight: todayWeight ? Number(todayWeight.weight_kg) : null,
      weightDate: todayWeight ? (todayWeight.logged_date instanceof Date ? todayWeight.logged_date.toISOString().split('T')[0] : todayWeight.logged_date) : null,
      steps: todaySteps,
      exerciseMinutes: todayExerciseMinutes,
      exerciseCalories: todayExerciseCalories,
      dietCalories: todayDietCalories,
      dietProtein: Math.round(todayDietProtein * 10) / 10,
      dietCarbs: Math.round(todayDietCarbs * 10) / 10,
      dietFat: Math.round(todayDietFat * 10) / 10
    }
  };
}

export async function verifyPasscode(passcode: string): Promise<boolean> {
  const sharedSecret = process.env.SHARED_SECRET;
  if (!sharedSecret || !passcode) return false;

  if (constantTimeEqual(passcode, sharedSecret)) {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, await createSessionToken(sharedSecret), {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax"
    });
    return true;
  }

  return false;
}

interface MacroResponse {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

function isMacroResponse(value: unknown): value is MacroResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return ["calories", "protein", "carbs", "fat"].every((key) => typeof candidate[key] === "number");
}

function getCompletionContent(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const choices = (value as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== "object") return null;
  const message = (choices[0] as Record<string, unknown>).message;
  if (!message || typeof message !== "object") return null;
  const content = (message as Record<string, unknown>).content;
  return typeof content === "string" ? content : null;
}
