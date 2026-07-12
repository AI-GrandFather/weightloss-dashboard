"use client";

import { useEffect, useState } from "react";
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
}

export default function DashboardCharts({
  weightLogs,
  exerciseLogs,
  stepsLogs,
  dietLogs,
  caloriesGoal,
  stepsGoal
}: DashboardChartsProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[400px] items-center justify-center text-slate-500 text-sm italic">
        Loading charts...
      </div>
    );
  }

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
    // Format date label (e.g. "Jul 12")
    const dateObj = new Date(dateStr);
    const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Diet Calories
    const dayDiet = dietLogs.filter(d => {
      const dDate = d.logged_date instanceof Date ? d.logged_date.toISOString().split('T')[0] : d.logged_date;
      return dDate === dateStr;
    });
    const caloriesIn = dayDiet.reduce((sum, d) => sum + (d.calories || 0), 0);

    // Exercise Calories & Minutes
    const dayExercise = exerciseLogs.filter(e => {
      const eDate = e.logged_date instanceof Date ? e.logged_date.toISOString().split('T')[0] : e.logged_date;
      return eDate === dateStr;
    });
    const caloriesOut = dayExercise.reduce((sum, e) => sum + (e.calories_burned || 0), 0);
    const exerciseMins = dayExercise.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

    // Steps
    const stepsRow = stepsLogs.find(s => {
      const sDate = s.logged_date instanceof Date ? s.logged_date.toISOString().split('T')[0] : s.logged_date;
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
      <Card className="border-slate-900 bg-slate-900/25">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-200">Weight Trend (Last 15 Logs)</CardTitle>
          <CardDescription>Weight change history (kg)</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {weightChartData.length > 0 ? (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#64748b" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', color: '#f8fafc' }}
                    labelStyle={{ color: '#94a3b8' }}
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
            <div className="h-[250px] flex items-center justify-center text-xs text-slate-600 italic">
              Log weight on multiple days to view trend
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calories Balance */}
      <Card className="border-slate-900 bg-slate-900/25">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-200">Calories (In vs Out)</CardTitle>
          <CardDescription>Last 7 days diet intake vs. exercise burn</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyMetricsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', color: '#f8fafc' }}
                  labelStyle={{ color: '#94a3b8' }}
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
      <Card className="border-slate-900 bg-slate-900/25">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-200">Steps Trend</CardTitle>
          <CardDescription>Last 7 days daily step count</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyMetricsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', color: '#f8fafc' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <ReferenceLine y={stepsGoal} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: `Goal: ${stepsGoal}`, fill: '#f59e0b', fontSize: 10, position: 'top' }} />
                <Bar dataKey="Steps" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Exercise Minutes */}
      <Card className="border-slate-900 bg-slate-900/25">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-200">Exercise Duration</CardTitle>
          <CardDescription>Last 7 days exercise minutes</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyMetricsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', color: '#f8fafc' }}
                  labelStyle={{ color: '#94a3b8' }}
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
