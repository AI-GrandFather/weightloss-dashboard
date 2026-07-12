"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

// 1. Weight Log Actions
export async function addWeightLog(date: string, weight: number, note: string) {
  if (!date || isNaN(weight)) {
    throw new Error("Invalid input data.");
  }
  
  await query(
    `INSERT INTO weight_logs (logged_date, weight_kg, note) 
     VALUES ($1, $2, $3) 
     ON CONFLICT (logged_date) 
     DO UPDATE SET weight_kg = EXCLUDED.weight_kg, note = EXCLUDED.note`,
    [date, weight, note || null]
  );
  revalidatePath("/");
}

export async function deleteWeightLog(id: string) {
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
  if (!date || !type) {
    throw new Error("Invalid input data.");
  }
  
  await query(
    `INSERT INTO exercise_logs (logged_date, exercise_type, duration_minutes, distance_km, calories_burned, note) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [date, type, duration, distance, caloriesBurned, note || null]
  );
  revalidatePath("/");
}

export async function deleteExerciseLog(id: string) {
  await query(`DELETE FROM exercise_logs WHERE id = $1`, [id]);
  revalidatePath("/");
}

// 3. Daily Steps Actions
export async function addDailySteps(date: string, steps: number) {
  if (!date || isNaN(steps)) {
    throw new Error("Invalid input data.");
  }
  
  await query(
    `INSERT INTO daily_steps (logged_date, steps) 
     VALUES ($1, $2) 
     ON CONFLICT (logged_date) 
     DO UPDATE SET steps = EXCLUDED.steps`,
    [date, steps]
  );
  revalidatePath("/");
}

export async function deleteDailySteps(date: string) {
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
  if (!foodName) {
    throw new Error("Food name is required.");
  }

  const normalized = foodName.toLowerCase().trim();

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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const modelUsed = "llama-3.3-70b-specdec";
  
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
            content: `Food: ${foodName}, Quantity: ${quantity || "1 serving"}`
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

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from estimation model.");
    }

    const parsed = JSON.parse(content);
    return {
      calories: Math.round(parsed.calories || 0),
      protein: Number(parsed.protein || 0),
      carbs: Number(parsed.carbs || 0),
      fat: Number(parsed.fat || 0),
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
  if (!date || !foodName || isNaN(calories)) {
    throw new Error("Invalid input data.");
  }

  // 1. Insert into diet_logs
  await query(
    `INSERT INTO diet_logs (logged_date, food_name, quantity, calories, protein_g, carbs_g, fat_g, source) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [date, foodName, quantity || null, calories, protein, carbs, fat, source]
  );

  // 2. Cache the normalized name with these final values (upsert)
  const normalized = foodName.toLowerCase().trim();
  const modelUsed = source === 'llm' ? 'groq/llama-3.3-70b' : 'manual_override';
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
    [normalized, calories, protein, carbs, fat, modelUsed]
  );

  revalidatePath("/");
}

export async function deleteDietLog(id: string) {
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
  const { cookies } = await import("next/headers");
  const sharedSecret = process.env.SHARED_SECRET;
  if (!sharedSecret) {
    return true;
  }

  if (passcode === sharedSecret) {
    cookies().set("shared_secret_session", sharedSecret, {
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
