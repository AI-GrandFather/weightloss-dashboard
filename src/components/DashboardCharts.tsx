"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WeightLogRow, ExerciseLogRow, DailyStepsRow, DietLogRow } from "../app/actions";

interface DashboardChartsProps {
  weightLogs: WeightLogRow[];
  exerciseLogs: ExerciseLogRow[];
  stepsLogs: DailyStepsRow[];
  dietLogs: DietLogRow[];
  caloriesGoal: number;
  stepsGoal: number;
  theme: 'light' | 'dark';
}

export default function DashboardCharts({
  weightLogs,
  exerciseLogs,
  stepsLogs,
  dietLogs,
  caloriesGoal,
  stepsGoal,
  theme
}: DashboardChartsProps) {
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const axisColor = isDark ? '#64748b' : '#475569';
  const tooltipBg = isDark ? '#090d16' : '#ffffff';
  const tooltipBorder = isDark ? '#1e293b' : '#e2e8f0';
  const tooltipText = isDark ? '#f8fafc' : '#0f172a';
  const labelColor = isDark ? '#94a3b8' : '#475569';

  // 1. Process Weight Data (Last 15 weight logs, sorted oldest to newest)
  const weightChartData = [...weightLogs]
    .map(w => ({
      date: w.logged_date instanceof Date 
        ? w.logged_date.toISOString().split('T')[0] 
        : String(w.logged_date),
      weight: Number(w.weight_kg)
    }))
    .reverse()
    .slice(-15);

  // 2. Helper to get date list for the last 7 days (including today)
  const getLast7Days = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toLocaleDateString('sv-SE')); // YYYY-MM-DD local format
    }
    return dates;
  };

  const last7Days = getLast7Days();

  // 3. Process Calories & Steps & Exercise over last 7 days
  const dailyMetricsData = last7Days.map(dateStr => {
    const dateObj = new Date(dateStr);
    const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Diet Calories
    const dayDiet = dietLogs.filter(d => {
      const dDate = d.logged_date instanceof Date ? d.logged_date.toISOString().split('T')[0] : String(d.logged_date);
      return dDate === dateStr;
    });
    const caloriesIn = dayDiet.reduce((sum, d) => sum + (d.calories || 0), 0);

    // Exercise Calories & Minutes
    const dayExercise = exerciseLogs.filter(e => {
      const eDate = e.logged_date instanceof Date ? e.logged_date.toISOString().split('T')[0] : String(e.logged_date);
      return eDate === dateStr;
    });
    const caloriesOut = dayExercise.reduce((sum, e) => sum + (e.calories_burned || 0), 0);
    const exerciseMins = dayExercise.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

    // Steps
    const stepsRow = stepsLogs.find(s => {
      const sDate = s.logged_date instanceof Date ? s.logged_date.toISOString().split('T')[0] : String(s.logged_date);
      return sDate === dateStr;
    });
    const steps = stepsRow ? stepsRow.steps : 0;

    return {
      date: label,
      "Calories In": caloriesIn,
      "Calories Out": caloriesOut,
      "Steps": steps,
      "Exercise (mins)": exerciseMins
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Weight Chart */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-sm dark:shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-200">Weight Trend (Last 15 Logs)</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">Weight change history (kg)</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {weightChartData.length > 0 ? (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="date" stroke={axisColor} fontSize={11} />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke={axisColor} fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}
                    labelStyle={{ color: labelColor }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-xs text-slate-500 dark:text-slate-650 italic">
              Log weight on multiple days to view trend
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calories Balance */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-sm dark:shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-200">Calories (In vs Out)</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">Last 7 days diet intake vs. exercise burn</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyMetricsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" stroke={axisColor} fontSize={11} />
                <YAxis stroke={axisColor} fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}
                  labelStyle={{ color: labelColor }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={caloriesGoal} stroke="#10b981" strokeDasharray="3 3" label={{ value: `Goal: ${caloriesGoal}`, fill: '#10b981', fontSize: 10, position: 'top' }} />
                <Bar dataKey="Calories In" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="Calories Out" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Steps Trend */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-sm dark:shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-200">Steps Trend</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">Last 7 days daily step count</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyMetricsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" stroke={axisColor} fontSize={11} />
                <YAxis stroke={axisColor} fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}
                  labelStyle={{ color: labelColor }}
                />
                <ReferenceLine y={stepsGoal} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: `Goal: ${stepsGoal}`, fill: '#f59e0b', fontSize: 10, position: 'top' }} />
                <Bar dataKey="Steps" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Exercise Minutes */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-sm dark:shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-200">Exercise Duration</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">Last 7 days exercise minutes</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyMetricsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" stroke={axisColor} fontSize={11} />
                <YAxis stroke={axisColor} fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}
                  labelStyle={{ color: labelColor }}
                />
                <Bar dataKey="Exercise (mins)" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
