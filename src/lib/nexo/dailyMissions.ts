import { buildRecoveryPlan } from "./planner";

export type DailyMission = {
  id: string;
  title: string;
  subject: string;
  type: "Aula" | "Exercício" | "Trabalho" | "Revisão";
  duration: number;
  priority: "urgente" | "alta" | "moderada";
  order: number;
};

type DisciplineWorkload = {
  code: string;
  name: string;
  pendingLessons: number;
  pendingExercises: number;
  pendingAssignments: number;
  daysUntilExam: number;
};

export function generateDailyMissions(
  workloads: DisciplineWorkload[],
  availableMinutes = 90,
): DailyMission[] {
  const ranked = workloads.map((workload) => {
    const plan = buildRecoveryPlan({ ...workload, availableMinutesPerDay: availableMinutes });
    return { workload, plan, pressure: (workload.pendingLessons + workload.pendingExercises + workload.pendingAssignments) / Math.max(1, workload.daysUntilExam) };
  }).sort((a, b) => b.pressure - a.pressure);

  const missions: DailyMission[] = [];
  let remaining = availableMinutes;
  let order = 1;

  for (const { workload, plan } of ranked) {
    if (remaining <= 0) break;
    if (workload.pendingLessons > 0 && remaining >= 35) {
      missions.push({ id: `${workload.code}-lesson`, title: "Concluir a próxima aula pendente", subject: workload.name, type: "Aula", duration: 35, priority: plan.priority, order: order++ });
      remaining -= 35;
    }
    if (workload.pendingExercises > 0 && remaining >= 20) {
      missions.push({ id: `${workload.code}-exercise`, title: "Resolver os próximos exercícios", subject: workload.name, type: "Exercício", duration: 20, priority: plan.priority, order: order++ });
      remaining -= 20;
    }
    if (workload.pendingAssignments > 0 && remaining >= 30) {
      missions.push({ id: `${workload.code}-assignment`, title: "Avançar no próximo trabalho", subject: workload.name, type: "Trabalho", duration: 30, priority: plan.priority, order: order++ });
      remaining -= 30;
    }
  }

  if (missions.length > 0 && remaining >= 15) {
    missions.push({ id: "global-review", title: "Registrar dúvidas e revisar pontos fracos", subject: "Plano geral", type: "Revisão", duration: 15, priority: "moderada", order: order++ });
  }

  return missions;
}
