import { generateDailyMissions, type DailyMission } from "./dailyMissions";

export type AdaptiveDay = { day: string; date: string; missions: DailyMission[]; minutes: number; note: string };

type Workload = { code: string; name: string; pendingLessons: number; pendingExercises: number; pendingAssignments: number; daysUntilExam: number };

export type PriorityDecision = {
  code: string;
  discipline: string;
  score: number;
  reason: string;
  pending: number;
  daysUntilExam: number;
};

function scoreWorkload(item: Workload): number {
  const pending = item.pendingLessons + item.pendingExercises + item.pendingAssignments;
  const pressure = pending / Math.max(1, item.daysUntilExam);
  const examUrgency = Math.max(0, 30 - item.daysUntilExam) / 30;
  const assignmentWeight = item.pendingAssignments * 1.5;
  return pressure * 10 + examUrgency * 12 + assignmentWeight;
}

export function getPriorityDecisions(workloads: Workload[]): PriorityDecision[] {
  return workloads
    .map((item) => {
      const pending = item.pendingLessons + item.pendingExercises + item.pendingAssignments;
      const score = Math.round(scoreWorkload(item) * 10) / 10;
      const pressure = pending / Math.max(1, item.daysUntilExam);
      const reason = item.daysUntilExam <= 7
        ? `A prova está a ${item.daysUntilExam} dias e há ${pending} pendências.`
        : pressure >= 1
          ? `Há ${pending} pendências para ${item.daysUntilExam} dias, criando pressão de recuperação.`
          : `A prova está a ${item.daysUntilExam} dias; o NEXO mantém avanço preventivo.`;
      return { code: item.code, discipline: item.name, score, reason, pending, daysUntilExam: item.daysUntilExam };
    })
    .sort((a, b) => b.score - a.score);
}

export function getCriticalDiscipline(workloads: Workload[]): PriorityDecision | null {
  return getPriorityDecisions(workloads)[0] ?? null;
}

export function generateAdaptivePlan(workloads: Workload[], availableMinutes = 90, days = 7): AdaptiveDay[] {
  const remaining = workloads.map((item) => ({ ...item }));
  const plan: AdaptiveDay[] = [];
  for (let index = 0; index < days; index++) {
    const missions = generateDailyMissions(remaining, availableMinutes);
    const minutes = missions.reduce((sum, mission) => sum + mission.duration, 0);
    const critical = getCriticalDiscipline(remaining);
    plan.push({ day: index === 0 ? "Hoje" : `Dia ${index + 1}`, date: index === 0 ? "1 SET" : `${index + 1} SET`, missions, minutes, note: critical ? `Prioridade: ${critical.discipline}. ${critical.reason}` : "Janela protegida para revisão e recuperação." });
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
