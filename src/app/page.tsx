import { getDashboardData } from "./actions";
import DashboardClient from "@/components/DashboardClient";

export const revalidate = 0; // Disable caching so dashboard is always live

export default async function Home() {
  const todayDate = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD local format
  const data = await getDashboardData(todayDate);

  return (
    <DashboardClient 
      initialWeightLogs={data.weightLogs}
      initialExerciseLogs={data.exerciseLogs}
      initialStepsLogs={data.stepsLogs}
      initialDietLogs={data.dietLogs}
    />
  );
}
