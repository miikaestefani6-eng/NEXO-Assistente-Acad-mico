export type PlannerInput = {
  pendingLessons: number;
  pendingExercises: number;
  pendingAssignments: number;
  daysUntilExam: number;
  deadlineKnown?: boolean;
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
  const deadlineKnown = input.deadlineKnown !== false;
  const pressure = deadlineKnown ? pending / days : pending * 0.08;
  const priority = deadlineKnown
    ? pressure >= 2 || days <= 7 ? "urgente" : pressure >= 1 || days <= 14 ? "alta" : "moderada"
    : pressure >= 2 ? "alta" : "moderada";

  const targetMinutes = Math.min(
    input.availableMinutesPerDay,
    priority === "urgente" ? 120 : priority === "alta" ? 90 : 60,
  );

  return {
    priority,
    daysToExam: deadlineKnown ? days : 0,
    recommendedMinutes: targetMinutes,
    dailyLessons: Math.max(0, Math.ceil(input.pendingLessons / (deadlineKnown ? days : 7))),
    dailyExercises: Math.max(0, Math.ceil(input.pendingExercises / (deadlineKnown ? days : 7))),
    dailyAssignments: Math.max(0, Math.ceil(input.pendingAssignments / (deadlineKnown ? days : 7))),
    message:
      !deadlineKnown
        ? "Ainda não há data informada. O NEXO distribui as pendências conhecidas sem inventar urgência."
        : priority === "urgente"
        ? "A prova está próxima. O NEXO deve priorizar recuperação sem colocar todas as pendências no mesmo dia."
        : priority === "alta"
          ? "Há uma carga relevante. O NEXO distribui as pendências ao longo dos próximos dias."
          : "A situação está sob controle. O NEXO mantém avanço constante e reserva tempo para revisão.",
  };
}
