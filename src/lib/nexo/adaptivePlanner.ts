import { generateDailyMissions, type DailyMission } from "./dailyMissions";

export type AdaptiveDay = { day: string; date: string; missions: DailyMission[]; minutes: number; note: string };

type Workload = { code: string; name: string; pendingLessons: number; pendingExercises: number; pendingAssignments: number; daysUntilExam: number };

export function generateAdaptivePlan(workloads: Workload[], availableMinutes = 90, days = 7): AdaptiveDay[] {
  const remaining = workloads.map((item) => ({ ...item }));
  const plan: AdaptiveDay[] = [];
  for (let index = 0; index < days; index++) {
    const missions = generateDailyMissions(remaining, availableMinutes);
    const minutes = missions.reduce((sum, mission) => sum + mission.duration, 0);
    plan.push({ day: index === 0 ? "Hoje" : `Dia ${index + 1}`, date: index === 0 ? "1 SET" : `${index + 1} SET`, missions, minutes, note: index === 0 ? "Sequência prioritária de hoje." : missions.length ? "Carga redistribuída automaticamente." : "Janela protegida para revisão e recuperação." });
    for (const mission of missions) {
      const item = remaining.find((workload) => mission.id.startsWith(`${workload.code}-`));
      if (!item) continue;
      if (mission.type === "Aula") item.pendingLessons = Math.max(0, item.pendingLessons - 1);
      if (mission.type === "Exercício") item.pendingExercises = Math.max(0, item.pendingExercises - 1);
      if (mission.type === "Trabalho") item.pendingAssignments = Math.max(0, item.pendingAssignments - 1);
    }
    for (const item of remaining) item.daysUntilExam = Math.max(1, item.daysUntilExam - 1);
  }
  return plan;
}

export function replanAfterMissedDay(workloads: Workload[], missedMinutes: number, availableMinutes = 90, days = 7) {
  const extraMinutes = Math.min(45, Math.max(0, Math.round(missedMinutes / 2)));
  return generateAdaptivePlan(workloads, availableMinutes + extraMinutes, days);
}
