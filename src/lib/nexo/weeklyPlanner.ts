import { generateDailyMissions, type DailyMission } from "./dailyMissions";

export type WeeklyDay = {
  day: string;
  date: string;
  missions: DailyMission[];
  minutes: number;
};

type Workload = { code: string; name: string; pendingLessons: number; pendingExercises: number; pendingAssignments: number; daysUntilExam: number };

export function generateWeeklyPlan(workloads: Workload[], availableMinutes = 90, days = 7): WeeklyDay[] {
  const remaining = workloads.map((item) => ({ ...item }));
  const result: WeeklyDay[] = [];
  for (let dayIndex = 0; dayIndex < days; dayIndex++) {
    const missions = generateDailyMissions(remaining, availableMinutes);
    result.push({ day: dayIndex === 0 ? "Hoje" : `Dia ${dayIndex + 1}`, date: dayIndex === 0 ? "1 SET" : `${dayIndex + 1} SET`, missions, minutes: missions.reduce((sum, mission) => sum + mission.duration, 0) });
    for (const mission of missions) {
      const workload = remaining.find((item) => mission.id.startsWith(item.code));
      if (!workload) continue;
      if (mission.type === "Aula") workload.pendingLessons = Math.max(0, workload.pendingLessons - 1);
      if (mission.type === "Exercício") workload.pendingExercises = Math.max(0, workload.pendingExercises - 1);
      if (mission.type === "Trabalho") workload.pendingAssignments = Math.max(0, workload.pendingAssignments - 1);
    }
    for (const workload of remaining) workload.daysUntilExam = Math.max(1, workload.daysUntilExam - 1);
  }
  return result;
}
