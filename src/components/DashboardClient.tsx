"use client";

import { useState, useEffect } from "react";
import { 
  addWeightLog, 
  addExerciseLog, 
  addDailySteps, 
  addDietLog,
  deleteWeightLog,
  deleteExerciseLog,
  deleteDailySteps,
  deleteDietLog,
  estimateFood,
  WeightLogRow,
  ExerciseLogRow,
  DailyStepsRow,
  DietLogRow
} from "../app/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Scale, 
  Flame, 
  Footprints, 
  Utensils, 
  Trash2, 
  Sparkles, 
  Brain, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Download,
  Settings,
  Activity,
  Award,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import DashboardCharts from "./DashboardCharts";

interface DashboardClientProps {
  initialWeightLogs: WeightLogRow[];
  initialExerciseLogs: ExerciseLogRow[];
  initialStepsLogs: DailyStepsRow[];
  initialDietLogs: DietLogRow[];
}

export default function DashboardClient({
  initialWeightLogs,
  initialExerciseLogs,
  initialStepsLogs,
  initialDietLogs
}: DashboardClientProps) {
  // Tabs: 'feed' | 'analytics'
  const [activeTab, setActiveTab] = useState<'feed' | 'analytics'>('feed');

  // State for date
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD local format
  });

  // State for logs
  const [weightLogs, setWeightLogs] = useState(initialWeightLogs);
  const [exerciseLogs, setExerciseLogs] = useState(initialExerciseLogs);
  const [stepsLogs, setStepsLogs] = useState(initialStepsLogs);
  const [dietLogs, setDietLogs] = useState(initialDietLogs);
  
  // Loading states
  const [loading, setLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<{ [key: string]: string }>({});

  // Goals Settings (default values)
  const [caloriesGoal, setCaloriesGoal] = useState(2000);
  const [stepsGoal, setStepsGoal] = useState(10000);
  const [weightGoal, setWeightGoal] = useState(70);
  const [goalsOpen, setGoalsOpen] = useState(false);

  // Load goals from local storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCals = localStorage.getItem("goals_calories");
      if (savedCals) setCaloriesGoal(Number(savedCals));
      const savedSteps = localStorage.getItem("goals_steps");
      if (savedSteps) setStepsGoal(Number(savedSteps));
      const savedWeight = localStorage.getItem("goals_weight");
      if (savedWeight) setWeightGoal(Number(savedWeight));
    }
  }, []);

  // Form States
  // Weight Log
  const [weightVal, setWeightVal] = useState("");
  const [weightNote, setWeightNote] = useState("");

  // Daily Steps
  const [stepsVal, setStepsVal] = useState("");

  // Exercise
  const [exType, setExType] = useState("walk");
  const [exDuration, setExDuration] = useState("");
  const [exDistance, setExDistance] = useState("");
  const [exCalories, setExCalories] = useState("");
  const [exNote, setExNote] = useState("");

  // Diet
  const [foodName, setFoodName] = useState("");
  const [foodQty, setFoodQty] = useState("");
  const [isManualDiet, setIsManualDiet] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimationSource, setEstimationSource] = useState<string | null>(null);
  const [dietMacros, setDietMacros] = useState<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);

  // Helper to re-fetch/re-calculate stats for the selectedDate
  const getSelectedDateStats = () => {
    // Weight (take the most recent weight logged up to the selectedDate)
    const sortedWeights = [...weightLogs].sort((a, b) => 
      new Date(b.logged_date).getTime() - new Date(a.logged_date).getTime()
    );
    const weightAtDate = sortedWeights.find(w => {
      const wDate = w.logged_date instanceof Date ? w.logged_date.toISOString().split('T')[0] : w.logged_date;
      return new Date(wDate).getTime() <= new Date(selectedDate).getTime();
    });

    // Steps
    const stepsRow = stepsLogs.find(s => {
      const sDate = s.logged_date instanceof Date ? s.logged_date.toISOString().split('T')[0] : s.logged_date;
      return sDate === selectedDate;
    });
    const steps = stepsRow ? stepsRow.steps : 0;

    // Exercise
    const dayExercises = exerciseLogs.filter(e => {
      const eDate = e.logged_date instanceof Date ? e.logged_date.toISOString().split('T')[0] : e.logged_date;
      return eDate === selectedDate;
    });
    const exerciseMinutes = dayExercises.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    const exerciseCalories = dayExercises.reduce((sum, e) => sum + (e.calories_burned || 0), 0);

    // Diet
    const dayDiet = dietLogs.filter(d => {
      const dDate = d.logged_date instanceof Date ? d.logged_date.toISOString().split('T')[0] : d.logged_date;
      return dDate === selectedDate;
    });
    const dietCalories = dayDiet.reduce((sum, d) => sum + (d.calories || 0), 0);
    const dietProtein = dayDiet.reduce((sum, d) => sum + Number(d.protein_g || 0), 0);
    const dietCarbs = dayDiet.reduce((sum, d) => sum + Number(d.carbs_g || 0), 0);
    const dietFat = dayDiet.reduce((sum, d) => sum + Number(d.fat_g || 0), 0);

    return {
      weight: weightAtDate ? Number(weightAtDate.weight_kg) : null,
      weightDate: weightAtDate ? (weightAtDate.logged_date instanceof Date ? weightAtDate.logged_date.toISOString().split('T')[0] : weightAtDate.logged_date) : null,
      steps,
      exerciseMinutes,
      exerciseCalories,
      dietCalories,
      dietProtein: Math.round(dietProtein * 10) / 10,
      dietCarbs: Math.round(dietCarbs * 10) / 10,
      dietFat: Math.round(dietFat * 10) / 10
    };
  };

  const stats = getSelectedDateStats();

  // Streak calculation (consecutive days with at least one log entry)
  const calculateStreak = () => {
    const dates = new Set<string>();
    
    weightLogs.forEach(w => {
      const d = w.logged_date instanceof Date ? w.logged_date.toISOString().split('T')[0] : String(w.logged_date);
      dates.add(d);
    });
    exerciseLogs.forEach(e => {
      const d = e.logged_date instanceof Date ? e.logged_date.toISOString().split('T')[0] : String(e.logged_date);
      dates.add(d);
    });
    stepsLogs.forEach(s => {
      const d = s.logged_date instanceof Date ? s.logged_date.toISOString().split('T')[0] : String(s.logged_date);
      dates.add(d);
    });
    dietLogs.forEach(di => {
      const d = di.logged_date instanceof Date ? di.logged_date.toISOString().split('T')[0] : String(di.logged_date);
      dates.add(d);
    });

    if (dates.size === 0) return 0;

    const todayStr = new Date().toLocaleDateString('sv-SE');
    const yesterdayStr = (() => {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return y.toLocaleDateString('sv-SE');
    })();

    // Streak starts either today or yesterday
    let currentCheckStr = "";
    if (dates.has(todayStr)) {
      currentCheckStr = todayStr;
    } else if (dates.has(yesterdayStr)) {
      currentCheckStr = yesterdayStr;
    } else {
      return 0;
    }

    let streak = 0;
    const checkDate = new Date(currentCheckStr);
    while (true) {
      const cStr = checkDate.toLocaleDateString('sv-SE');
      if (dates.has(cStr)) {
        streak++;
        // Go back 1 day
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  // Date Navigation
  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toLocaleDateString('sv-SE'));
  };



  // Submit Handlers
  const handleWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightVal || isNaN(Number(weightVal))) return;

    setLoading("weight");
    setErrorMsg(prev => ({ ...prev, weight: "" }));
    try {
      await addWeightLog(selectedDate, Number(weightVal), weightNote);
      // Local state update
      const newWeight: WeightLogRow = {
        id: Math.random().toString(),
        logged_date: selectedDate,
        weight_kg: Number(weightVal),
        note: weightNote || null,
        created_at: new Date()
      };
      setWeightLogs(prev => {
        const filtered = prev.filter(w => {
          const wDate = w.logged_date instanceof Date ? w.logged_date.toISOString().split('T')[0] : String(w.logged_date);
          return wDate !== selectedDate;
        });
        return [newWeight, ...filtered];
      });
      setWeightVal("");
      setWeightNote("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to log weight.";
      setErrorMsg(prev => ({ ...prev, weight: msg }));
    } finally {
      setLoading(null);
    }
  };

  const handleStepsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepsVal || isNaN(Number(stepsVal))) return;

    setLoading("steps");
    setErrorMsg(prev => ({ ...prev, steps: "" }));
    try {
      await addDailySteps(selectedDate, Number(stepsVal));
      const newSteps: DailyStepsRow = {
        logged_date: selectedDate,
        steps: Number(stepsVal),
        created_at: new Date()
      };
      setStepsLogs(prev => {
        const filtered = prev.filter(s => {
          const sDate = s.logged_date instanceof Date ? s.logged_date.toISOString().split('T')[0] : String(s.logged_date);
          return sDate !== selectedDate;
        });
        return [newSteps, ...filtered];
      });
      setStepsVal("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to log steps.";
      setErrorMsg(prev => ({ ...prev, steps: msg }));
    } finally {
      setLoading(null);
    }
  };

  const handleExerciseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exDuration || isNaN(Number(exDuration))) return;

    setLoading("exercise");
    setErrorMsg(prev => ({ ...prev, exercise: "" }));
    try {
      const dur = Number(exDuration);
      const dist = exDistance ? Number(exDistance) : null;
      const cals = exCalories ? Number(exCalories) : null;

      await addExerciseLog(selectedDate, exType, dur, dist, cals, exNote);
      
      const newEx: ExerciseLogRow = {
        id: Math.random().toString(),
        logged_date: selectedDate,
        exercise_type: exType,
        duration_minutes: dur,
        distance_km: dist,
        calories_burned: cals,
        note: exNote || null,
        created_at: new Date()
      };
      setExerciseLogs(prev => [newEx, ...prev]);
      setExDuration("");
      setExDistance("");
      setExCalories("");
      setExNote("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to log exercise.";
      setErrorMsg(prev => ({ ...prev, exercise: msg }));
    } finally {
      setLoading(null);
    }
  };

  const handleDietEstimate = async () => {
    if (!foodName) return;
    setEstimating(true);
    setEstimationSource(null);
    setErrorMsg(prev => ({ ...prev, diet: "" }));
    try {
      const res = await estimateFood(foodName, foodQty);
      setDietMacros({
        calories: res.calories,
        protein: res.protein,
        carbs: res.carbs,
        fat: res.fat
      });
      setEstimationSource(res.source === 'cache' ? "Cache hit" : "AI Estimated via Groq");
    } catch (err) {
      console.error(err);
      setErrorMsg(prev => ({ ...prev, diet: "AI estimation failed. Entering manual override mode." }));
      setIsManualDiet(true);
      setDietMacros({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    } finally {
      setEstimating(false);
    }
  };

  const handleDietSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName || !dietMacros) return;

    setLoading("diet");
    setErrorMsg(prev => ({ ...prev, diet: "" }));
    try {
      const sourceVal = isManualDiet ? 'manual_override' : 'llm';
      await addDietLog(
        selectedDate,
        foodName,
        foodQty,
        dietMacros.calories,
        dietMacros.protein,
        dietMacros.carbs,
        dietMacros.fat,
        sourceVal
      );

      const newDiet: DietLogRow = {
        id: Math.random().toString(),
        logged_date: selectedDate,
        food_name: foodName,
        quantity: foodQty || null,
        calories: dietMacros.calories,
        protein_g: dietMacros.protein,
        carbs_g: dietMacros.carbs,
        fat_g: dietMacros.fat,
        source: sourceVal,
        created_at: new Date()
      };
      setDietLogs(prev => [newDiet, ...prev]);

      // Reset
      setFoodName("");
      setFoodQty("");
      setDietMacros(null);
      setEstimationSource(null);
      setIsManualDiet(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to log food.";
      setErrorMsg(prev => ({ ...prev, diet: msg }));
    } finally {
      setLoading(null);
    }
  };

  // Delete Handlers
  const handleWeightDelete = async (id: string) => {
    try {
      await deleteWeightLog(id);
      setWeightLogs(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleStepsDelete = async (dateStr: string) => {
    try {
      await deleteDailySteps(dateStr);
      setStepsLogs(prev => {
        return prev.filter(s => {
          const sDate = s.logged_date instanceof Date ? s.logged_date.toISOString().split('T')[0] : String(s.logged_date);
          return sDate !== dateStr;
        });
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleExerciseDelete = async (id: string) => {
    try {
      await deleteExerciseLog(id);
      setExerciseLogs(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDietDelete = async (id: string) => {
    try {
      await deleteDietLog(id);
      setDietLogs(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Goals Form Save
  const handleGoalsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("goals_calories", String(caloriesGoal));
    localStorage.setItem("goals_steps", String(stepsGoal));
    localStorage.setItem("goals_weight", String(weightGoal));
    setGoalsOpen(false);
  };

  // Export to CSV
  const handleCSVExport = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Weight logs
    csvContent += "WEIGHT LOGS\nDate,Weight (kg),Note\n";
    weightLogs.forEach(w => {
      const wDate = w.logged_date instanceof Date ? w.logged_date.toISOString().split('T')[0] : String(w.logged_date);
      csvContent += `${wDate},${w.weight_kg},\"${w.note || ''}\"\n`;
    });
    
    // Steps logs
    csvContent += "\nDAILY STEPS LOGS\nDate,Steps\n";
    stepsLogs.forEach(s => {
      const sDate = s.logged_date instanceof Date ? s.logged_date.toISOString().split('T')[0] : String(s.logged_date);
      csvContent += `${sDate},${s.steps}\n`;
    });

    // Exercise logs
    csvContent += "\nEXERCISE LOGS\nDate,Type,Duration (mins),Distance (km),Calories Burned,Note\n";
    exerciseLogs.forEach(e => {
      const eDate = e.logged_date instanceof Date ? e.logged_date.toISOString().split('T')[0] : String(e.logged_date);
      csvContent += `${eDate},${e.exercise_type},${e.duration_minutes || ''},${e.distance_km || ''},${e.calories_burned || ''},\"${e.note || ''}\"\n`;
    });

    // Diet logs
    csvContent += "\nDIET LOGS\nDate,Food Name,Quantity,Calories (kcal),Protein (g),Carbs (g),Fat (g),Source\n";
    dietLogs.forEach(d => {
      const dDate = d.logged_date instanceof Date ? d.logged_date.toISOString().split('T')[0] : String(d.logged_date);
      csvContent += `${dDate},\"${d.food_name}\",\"${d.quantity || ''}\",${d.calories},${d.protein_g || 0},${d.carbs_g || 0},${d.fat_g || 0},${d.source}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `weightloss_export_${new Date().toLocaleDateString('sv-SE')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get active logs for the selectedDate
  const activeWeightLog = weightLogs.find(w => {
    const wDate = w.logged_date instanceof Date ? w.logged_date.toISOString().split('T')[0] : String(w.logged_date);
    return wDate === selectedDate;
  });

  const activeStepsLog = stepsLogs.find(s => {
    const sDate = s.logged_date instanceof Date ? s.logged_date.toISOString().split('T')[0] : String(s.logged_date);
    return sDate === selectedDate;
  });

  const activeExerciseLogs = exerciseLogs.filter(e => {
    const eDate = e.logged_date instanceof Date ? e.logged_date.toISOString().split('T')[0] : String(e.logged_date);
    return eDate === selectedDate;
  });

  const activeDietLogs = dietLogs.filter(d => {
    const dDate = d.logged_date instanceof Date ? d.logged_date.toISOString().split('T')[0] : String(d.logged_date);
    return dDate === selectedDate;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Scale className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              WeightLoss Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Export Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCSVExport}
              className="border-slate-800 hover:bg-slate-900 bg-slate-950 text-slate-300 flex items-center gap-2 h-9"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>

            {/* Goals Dialog */}
            <Dialog open={goalsOpen} onOpenChange={setGoalsOpen}>
              <DialogTrigger 
                render={
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="border-slate-800 hover:bg-slate-900 bg-slate-950 text-slate-300 h-9 w-9"
                  />
                }
              >
                <Settings className="h-4 w-4" />
              </DialogTrigger>
              <DialogContent className="bg-slate-950 border-slate-900 text-slate-100 max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Set Daily Goals</DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs">
                    Define targets to measure progress across your dashboard.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleGoalsSubmit} className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="gWeight">Target Weight (kg)</Label>
                    <Input 
                      id="gWeight"
                      type="number"
                      value={weightGoal}
                      onChange={(e) => setWeightGoal(Number(e.target.value))}
                      className="bg-slate-900 border-slate-800 text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gCals">Daily Calorie Target (kcal)</Label>
                    <Input 
                      id="gCals"
                      type="number"
                      value={caloriesGoal}
                      onChange={(e) => setCaloriesGoal(Number(e.target.value))}
                      className="bg-slate-900 border-slate-800 text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gSteps">Daily Steps Target</Label>
                    <Input 
                      id="gSteps"
                      type="number"
                      value={stepsGoal}
                      onChange={(e) => setStepsGoal(Number(e.target.value))}
                      className="bg-slate-900 border-slate-800 text-slate-100"
                    />
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
                      Save Changes
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 space-y-8">
        
        {/* Date Selector & Tab Switcher Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/40 border border-slate-900 p-4 rounded-2xl backdrop-blur-md">
          {/* Left: Date controls */}
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-400" />
            <span className="font-medium text-slate-300 text-sm hidden sm:inline">Target Date:</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center gap-1 ml-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => changeDate(-1)}
                className="border-slate-800 hover:bg-slate-950 bg-slate-900/60 h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedDate(new Date().toLocaleDateString('sv-SE'))}
                className="border-slate-800 hover:bg-slate-950 bg-slate-900/60 font-medium px-3 h-8 text-xs"
              >
                Today
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => changeDate(1)}
                className="border-slate-800 hover:bg-slate-950 bg-slate-900/60 h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right: Tab selectors */}
          <div className="flex bg-slate-950/60 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'feed' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              Dashboard Feed
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'analytics' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Analytics & Trends
            </button>
          </div>
        </div>

        {/* Tab 1: Dashboard Feed */}
        {activeTab === 'feed' && (
          <>
            {/* Today's Summary Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
              {/* Weight Card */}
              <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-slate-350">Current Weight</CardTitle>
                  <Scale className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight text-slate-50">
                    {stats.weight ? `${stats.weight} kg` : "—"}
                  </div>
                  {stats.weight && weightGoal && (
                    <div className="text-xs mt-2 font-medium">
                      {stats.weight > weightGoal ? (
                        <span className="text-amber-400">+{Math.round((stats.weight - weightGoal) * 10) / 10} kg above target</span>
                      ) : stats.weight < weightGoal ? (
                        <span className="text-emerald-400">-{Math.round((weightGoal - stats.weight) * 10) / 10} kg under target</span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">On target! 🎉</span>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    {stats.weightDate ? `Logged since ${stats.weightDate}` : "No logged weight"}
                  </p>
                </CardContent>
              </Card>

              {/* Diet Card */}
              <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-slate-350">Diet Calories</CardTitle>
                  <Utensils className="h-4 w-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight text-slate-50">
                    {stats.dietCalories} kcal
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-800">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-350"
                      style={{ width: `${Math.min(100, (stats.dietCalories / caloriesGoal) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs mt-2 flex justify-between items-center font-medium">
                    <span>
                      {caloriesGoal - stats.dietCalories >= 0 ? (
                        <span className="text-emerald-400">{caloriesGoal - stats.dietCalories} kcal left</span>
                      ) : (
                        <span className="text-rose-450">{Math.abs(caloriesGoal - stats.dietCalories)} kcal over</span>
                      )}
                    </span>
                    <span className="text-slate-500 text-[10px]">Goal: {caloriesGoal}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1.5 flex justify-between gap-1 border-t border-slate-900 pt-1.5">
                    <span>Protein: {stats.dietProtein}g</span>
                    <span>Carbs: {stats.dietCarbs}g</span>
                    <span>Fat: {stats.dietFat}g</span>
                  </div>
                </CardContent>
              </Card>

              {/* Steps Card */}
              <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-slate-355">Daily Steps</CardTitle>
                  <Footprints className="h-4 w-4 text-amber-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight text-slate-50">
                    {stats.steps.toLocaleString()}
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-800">
                    <div 
                      className="bg-amber-500 h-full transition-all duration-350"
                      style={{ width: `${Math.min(100, (stats.steps / stepsGoal) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs mt-2 flex justify-between font-medium">
                    {stepsGoal - stats.steps > 0 ? (
                      <span className="text-amber-400">{(stepsGoal - stats.steps).toLocaleString()} left</span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">Goal met! 🎉</span>
                    )}
                    <span className="text-slate-500 text-[10px]">Goal: {stepsGoal.toLocaleString()}</span>
                  </p>
                </CardContent>
              </Card>

              {/* Exercise Card */}
              <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-slate-350">Exercise Activity</CardTitle>
                  <Flame className="h-4 w-4 text-rose-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight text-slate-50">
                    {stats.exerciseCalories} kcal
                  </div>
                  <p className="text-xs text-slate-400 mt-2.5 flex justify-between items-center font-medium">
                    <span>{stats.exerciseMinutes} mins active</span>
                    <span className="text-[10px] bg-slate-950 border border-slate-800 text-indigo-400 px-2 py-0.5 rounded-full font-semibold">
                      Net: {stats.dietCalories - stats.exerciseCalories} kcal
                    </span>
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Forms and Logs splits */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
              
              {/* Left Column: Log Activity Forms (5 Columns) */}
              <section className="lg:col-span-5 space-y-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-l-2 border-indigo-500 pl-2">
                  Log Activity
                </h2>

                {/* Diet Form */}
                <Card className="border-slate-900 bg-slate-900/25">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-md font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-emerald-400" />
                        Food & Diet Log
                      </span>
                      <button 
                        type="button"
                        onClick={() => {
                          setIsManualDiet(!isManualDiet);
                          setDietMacros(prev => prev ? prev : { calories: 0, protein: 0, carbs: 0, fat: 0 });
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
                      >
                        {isManualDiet ? "Use AI estimation" : "Enter manually"}
                      </button>
                    </CardTitle>
                    <CardDescription>
                      {isManualDiet ? "Enter food and macros details manually" : "AI estimates calories and macros automatically"}
                    </CardDescription>
                  </CardHeader>
                  
                  <form onSubmit={handleDietSubmit}>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="foodName">Food item</Label>
                        <Input 
                          id="foodName"
                          placeholder="e.g. 2 fried eggs or 1 plate biryani"
                          value={foodName}
                          onChange={(e) => setFoodName(e.target.value)}
                          required
                          className="bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-indigo-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="foodQty">Quantity (optional)</Label>
                        <Input 
                          id="foodQty"
                          placeholder="e.g. 2 eggs or 150g"
                          value={foodQty}
                          onChange={(e) => setFoodQty(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-indigo-600"
                        />
                      </div>

                      {!isManualDiet && !dietMacros && (
                        <Button 
                          type="button" 
                          onClick={handleDietEstimate}
                          disabled={estimating || !foodName}
                          className="w-full bg-slate-900 hover:bg-slate-850 text-indigo-400 border border-indigo-500/20 flex items-center justify-center gap-2 font-medium"
                        >
                          {estimating ? (
                            <>
                              <Brain className="h-4 w-4 animate-bounce text-indigo-400" />
                              AI Estimating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 text-indigo-400" />
                              Estimate Macros (AI)
                            </>
                          )}
                        </Button>
                      )}

                      {dietMacros && (
                        <div className="border border-slate-800 bg-slate-950/40 p-4 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                              Review estimated macros
                            </span>
                            {estimationSource && (
                              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                <Sparkles className="h-3 w-3" />
                                {estimationSource}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor="cals" className="text-xs text-slate-400">Calories (kcal)</Label>
                              <Input 
                                id="cals" 
                                type="number"
                                value={dietMacros.calories}
                                onChange={(e) => setDietMacros(prev => prev ? { ...prev, calories: Number(e.target.value) } : null)}
                                className="bg-slate-950 border-slate-800 text-slate-100"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="protein" className="text-xs text-slate-400">Protein (g)</Label>
                              <Input 
                                id="protein" 
                                type="number"
                                step="0.1"
                                value={dietMacros.protein}
                                onChange={(e) => setDietMacros(prev => prev ? { ...prev, protein: Number(e.target.value) } : null)}
                                className="bg-slate-950 border-slate-800 text-slate-100"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="carbs" className="text-xs text-slate-400">Carbs (g)</Label>
                              <Input 
                                id="carbs" 
                                type="number"
                                step="0.1"
                                value={dietMacros.carbs}
                                onChange={(e) => setDietMacros(prev => prev ? { ...prev, carbs: Number(e.target.value) } : null)}
                                className="bg-slate-950 border-slate-800 text-slate-100"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="fat" className="text-xs text-slate-400">Fat (g)</Label>
                              <Input 
                                id="fat" 
                                type="number"
                                step="0.1"
                                value={dietMacros.fat}
                                onChange={(e) => setDietMacros(prev => prev ? { ...prev, fat: Number(e.target.value) } : null)}
                                className="bg-slate-950 border-slate-800 text-slate-100"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                    
                    {errorMsg.diet && (
                      <div className="px-6 pb-2 text-rose-500 text-xs flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {errorMsg.diet}
                      </div>
                    )}

                    <CardFooter className="pt-2">
                      <Button 
                        type="submit" 
                        disabled={loading === "diet" || !foodName || !dietMacros}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-600/10"
                      >
                        {loading === "diet" ? "Saving..." : "Save Diet Log"}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>

                {/* Weight Form */}
                <Card className="border-slate-900 bg-slate-900/25">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-md font-semibold flex items-center gap-2">
                      <Scale className="h-4 w-4 text-blue-400" />
                      Log Weight
                    </CardTitle>
                  </CardHeader>
                  <form onSubmit={handleWeightSubmit}>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="weight">Weight (kg)</Label>
                        <Input 
                          id="weight"
                          type="number"
                          step="0.01"
                          placeholder="e.g. 74.5"
                          value={weightVal}
                          onChange={(e) => setWeightVal(e.target.value)}
                          required
                          className="bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-indigo-600"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="weightNote">Note (optional)</Label>
                        <Input 
                          id="weightNote"
                          placeholder="Logged fasting in morning"
                          value={weightNote}
                          onChange={(e) => setWeightNote(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-indigo-600"
                        />
                      </div>
                    </CardContent>
                    
                    {errorMsg.weight && (
                      <div className="px-6 pb-2 text-rose-500 text-xs flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {errorMsg.weight}
                      </div>
                    )}

                    <CardFooter className="pt-2">
                      <Button 
                        type="submit"
                        disabled={loading === "weight" || !weightVal}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/10"
                      >
                        {loading === "weight" ? "Saving..." : "Log Weight"}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>

                {/* Steps Form */}
                <Card className="border-slate-900 bg-slate-900/25">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-md font-semibold flex items-center gap-2">
                      <Footprints className="h-4 w-4 text-amber-400" />
                      Log Steps
                    </CardTitle>
                  </CardHeader>
                  <form onSubmit={handleStepsSubmit}>
                    <CardContent>
                      <div className="space-y-1.5">
                        <Label htmlFor="steps">Step Count</Label>
                        <Input 
                          id="steps"
                          type="number"
                          placeholder="e.g. 8432"
                          value={stepsVal}
                          onChange={(e) => setStepsVal(e.target.value)}
                          required
                          className="bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-indigo-600"
                        />
                      </div>
                    </CardContent>

                    {errorMsg.steps && (
                      <div className="px-6 pb-2 text-rose-500 text-xs flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {errorMsg.steps}
                      </div>
                    )}

                    <CardFooter className="pt-4">
                      <Button 
                        type="submit"
                        disabled={loading === "steps" || !stepsVal}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-lg shadow-amber-600/10"
                      >
                        {loading === "steps" ? "Saving..." : "Log Steps"}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>

                {/* Exercise Form */}
                <Card className="border-slate-900 bg-slate-900/25">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-md font-semibold flex items-center gap-2">
                      <Flame className="h-4 w-4 text-rose-400" />
                      Log Exercise
                    </CardTitle>
                  </CardHeader>
                  <form onSubmit={handleExerciseSubmit}>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5 col-span-2">
                          <Label htmlFor="exType">Exercise Type</Label>
                          <Select value={exType} onValueChange={(val) => setExType(val || "walk")}>
                            <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                              <SelectItem value="walk">Walk</SelectItem>
                              <SelectItem value="run">Run</SelectItem>
                              <SelectItem value="gym">Gym</SelectItem>
                              <SelectItem value="cycling">Cycling</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="exDuration">Duration (mins)</Label>
                          <Input 
                            id="exDuration"
                            type="number"
                            placeholder="e.g. 45"
                            value={exDuration}
                            onChange={(e) => setExDuration(e.target.value)}
                            required
                            className="bg-slate-950 border-slate-800 text-slate-200"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="exDistance">Distance (km)</Label>
                          <Input 
                            id="exDistance"
                            type="number"
                            step="0.01"
                            placeholder="e.g. 3.2"
                            value={exDistance}
                            onChange={(e) => setExDistance(e.target.value)}
                            className="bg-slate-950 border-slate-800 text-slate-200"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="exCalories">Calories Burned (optional)</Label>
                        <Input 
                          id="exCalories"
                          type="number"
                          placeholder="e.g. 240"
                          value={exCalories}
                          onChange={(e) => setExCalories(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-slate-200"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="exNote">Note (optional)</Label>
                        <Textarea 
                          id="exNote"
                          placeholder="Treadmill incline walk"
                          value={exNote}
                          onChange={(e) => setExNote(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-indigo-600 min-h-[60px]"
                        />
                      </div>
                    </CardContent>

                    {errorMsg.exercise && (
                      <div className="px-6 pb-2 text-rose-500 text-xs flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {errorMsg.exercise}
                      </div>
                    )}

                    <CardFooter className="pt-2">
                      <Button 
                        type="submit"
                        disabled={loading === "exercise" || !exDuration}
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-lg shadow-rose-600/10"
                      >
                        {loading === "exercise" ? "Saving..." : "Log Exercise"}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </section>

              {/* Right Column: Logs list for selectedDate (7 Columns) */}
              <section className="lg:col-span-7 space-y-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-l-2 border-indigo-500 pl-2">
                  Logs for {selectedDate}
                </h2>

                <div className="space-y-4">
                  {/* Empty State */}
                  {!activeWeightLog && !activeStepsLog && activeExerciseLogs.length === 0 && activeDietLogs.length === 0 && (
                    <div className="border border-dashed border-slate-900 bg-slate-900/10 p-12 text-center rounded-2xl">
                      <Calendar className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">No activity logged for this date</p>
                      <p className="text-slate-600 text-xs mt-1">Use the forms on the left to start adding logs.</p>
                    </div>
                  )}

                  {/* Weight Log */}
                  {activeWeightLog && (
                    <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-blue-500/10 border border-blue-500/25 text-blue-400 rounded-lg flex items-center justify-center">
                          <Scale className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-200">Weight Logged</div>
                          <div className="text-xs text-slate-400 font-medium">
                            {activeWeightLog.weight_kg} kg {activeWeightLog.note && `• ${activeWeightLog.note}`}
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleWeightDelete(activeWeightLog.id)}
                        className="text-slate-500 hover:text-rose-500 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Steps Log */}
                  {activeStepsLog && (
                    <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-lg flex items-center justify-center">
                          <Footprints className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-200">Daily Steps Count</div>
                          <div className="text-xs text-slate-400 font-medium">
                            {activeStepsLog.steps.toLocaleString()} steps logged
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleStepsDelete(selectedDate)}
                        className="text-slate-500 hover:text-rose-500 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Exercise Logs */}
                  {activeExerciseLogs.map(e => (
                    <div key={e.id} className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-lg flex items-center justify-center">
                          <Flame className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-200 uppercase tracking-tight text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full inline-block mb-1">
                            {e.exercise_type}
                          </div>
                          <div className="text-sm font-semibold text-slate-200">
                            {e.duration_minutes} mins {e.distance_km && `• ${e.distance_km} km`}
                          </div>
                          <div className="text-xs text-slate-400 font-medium mt-0.5">
                            {e.calories_burned && `${e.calories_burned} kcal burned`} {e.note && `• ${e.note}`}
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleExerciseDelete(e.id)}
                        className="text-slate-500 hover:text-rose-500 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {/* Diet Logs */}
                  {activeDietLogs.map(d => (
                    <div key={d.id} className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-lg flex items-center justify-center">
                          <Utensils className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-200">
                            {d.food_name} {d.quantity && `(${d.quantity})`}
                          </div>
                          <div className="text-xs text-slate-400 font-medium mt-0.5 flex flex-wrap items-center gap-2">
                            <span className="text-slate-200 font-semibold">{d.calories} kcal</span>
                            <span>• P: {Number(d.protein_g || 0)}g</span>
                            <span>• C: {Number(d.carbs_g || 0)}g</span>
                            <span>• F: {Number(d.fat_g || 0)}g</span>
                            <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                              {d.source === 'llm' ? 'Estimated' : 'Manual'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDietDelete(d.id)}
                        className="text-slate-500 hover:text-rose-500 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* History Table */}
                <div className="pt-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Recent Weight History (Last 10 Logs)
                  </h3>
                  <div className="border border-slate-900 bg-slate-900/10 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900/50 border-b border-slate-900 text-slate-400 text-xs">
                          <th className="p-3 font-semibold">Date</th>
                          <th className="p-3 font-semibold">Weight</th>
                          <th className="p-3 font-semibold">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weightLogs.slice(0, 10).map(w => {
                          const wDate = w.logged_date instanceof Date ? w.logged_date.toISOString().split('T')[0] : String(w.logged_date);
                          return (
                            <tr key={w.id} className="border-b border-slate-900/50 text-slate-300 hover:bg-slate-900/25">
                              <td className="p-3 font-medium">{wDate}</td>
                              <td className="p-3 font-semibold text-blue-400">{w.weight_kg} kg</td>
                              <td className="p-3 text-slate-500 italic max-w-xs truncate">{w.note || "—"}</td>
                            </tr>
                          );
                        })}
                        {weightLogs.length === 0 && (
                          <tr>
                            <td colSpan={3} className="p-6 text-center text-slate-600 text-xs italic">
                              No weight logs recorded yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}

        {/* Tab 2: Analytics & Trends */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Analytics Header Metrics */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Streak Card */}
              <Card className="border-slate-900 bg-slate-900/20 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-slate-400">Current Logging Streak</CardTitle>
                  <Award className="h-5 w-5 text-violet-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                    {streak} <span className="text-lg text-slate-400 font-medium">days</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {streak > 0 ? "Keep logging daily to hold your streak!" : "Log weight, steps, exercise or food to start a streak!"}
                  </p>
                </CardContent>
              </Card>

              {/* Steps Progress Card */}
              <Card className="border-slate-900 bg-slate-900/20 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-slate-400">Target Steps Goal</CardTitle>
                  <Footprints className="h-5 w-5 text-amber-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-slate-100">
                    {stepsGoal.toLocaleString()} <span className="text-xs text-slate-400 font-normal">steps/day</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Configure this in goals settings
                  </p>
                </CardContent>
              </Card>

              {/* Calorie Limit Card */}
              <Card className="border-slate-900 bg-slate-900/20 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-slate-400">Calorie Target</CardTitle>
                  <Utensils className="h-5 w-5 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-slate-100">
                    {caloriesGoal} <span className="text-xs text-slate-400 font-normal">kcal/day</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Used to track calorie deficit
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Recharts Graphs */}
            <DashboardCharts 
              weightLogs={weightLogs}
              exerciseLogs={exerciseLogs}
              stepsLogs={stepsLogs}
              dietLogs={dietLogs}
              caloriesGoal={caloriesGoal}
              stepsGoal={stepsGoal}
            />
          </div>
        )}

      </main>
    </div>
  );
}
