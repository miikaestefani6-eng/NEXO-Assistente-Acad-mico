export type PlannerInput = {
  pendingLessons: number;
  pendingExercises: number;
  pendingAssignments: number;
  daysUntilExam: number;
  availableMinutesPerDay: number;
};

export type PlannerOutput = {
  priority: "urgente" | "alta" | "moderada";
  daysToExam: number;
  recommendedMinutes: number;
  dailyLessons: number;
  dailyExercises: number;
  dailyAssignments: number;
  message: string;
};

export function buildRecoveryPlan(input: PlannerInput): PlannerOutput {
  const days = Math.max(1, input.daysUntilExam);
  const pending = input.pendingLessons + input.pendingExercises + input.pendingAssignments;
  const pressure = pending / days;
  const priority = pressure >= 2 || days <= 7 ? "urgente" : pressure >= 1 || days <= 14 ? "alta" : "moderada";

  const targetMinutes = Math.min(
    input.availableMinutesPerDay,
    priority === "urgente" ? 120 : priority === "alta" ? 90 : 60,
  );

  return {
    priority,
    daysToExam: days,
    recommendedMinutes: targetMinutes,
    dailyLessons: Math.max(0, Math.ceil(input.pendingLessons / days)),
    dailyExercises: Math.max(0, Math.ceil(input.pendingExercises / days)),
    dailyAssignments: Math.max(0, Math.ceil(input.pendingAssignments / days)),
    message:
      priority === "urgente"
        ? "A prova está próxima. O NEXO deve priorizar recuperação sem colocar todas as pendências no mesmo dia."
        : priority === "alta"
          ? "Há uma carga relevante. O NEXO distribui as pendências ao longo dos próximos dias."
          : "A situação está sob controle. O NEXO mantém avanço constante e reserva tempo para revisão.",
  };
}
