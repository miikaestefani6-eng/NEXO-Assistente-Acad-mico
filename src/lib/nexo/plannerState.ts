export type PlannerState = {
  missedMissionIds: string[];
  missedMinutes: number;
  missedDate: string | null;
  priorityCode: string | null;
  priorityReason: string | null;
  recoveryActive: boolean;
  recoveryAcceptedAt: string | null;
};

const STORAGE_KEY = "nexo-planner-state";

export const defaultPlannerState: PlannerState = {
  missedMissionIds: [],
  missedMinutes: 0,
  missedDate: null,
  priorityCode: null,
  priorityReason: null,
  recoveryActive: false,
  recoveryAcceptedAt: null,
};

export function loadPlannerState(): PlannerState {
  if (typeof window === "undefined") return defaultPlannerState;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultPlannerState;
    return { ...defaultPlannerState, ...JSON.parse(saved) };
  } catch {
    return defaultPlannerState;
  }
}

export function savePlannerState(state: PlannerState): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export function registerMissedDay(input: {
  missionIds: string[];
  missedMinutes: number;
  date?: string;
  priorityCode?: string | null;
  priorityReason?: string | null;
}): PlannerState {
  const next: PlannerState = {
    missedMissionIds: input.missionIds,
    missedMinutes: Math.max(0, input.missedMinutes),
    missedDate: input.date ?? new Date().toISOString(),
    priorityCode: input.priorityCode ?? null,
    priorityReason: input.priorityReason ?? null,
    recoveryActive: false,
    recoveryAcceptedAt: null,
  };
  savePlannerState(next);
  return next;
}

export function acceptRecoveryPlan(state: PlannerState): PlannerState {
  const next = { ...state, recoveryActive: true, recoveryAcceptedAt: new Date().toISOString() };
  savePlannerState(next);
  return next;
}

export function clearPlannerRecovery(): void {
  savePlannerState(defaultPlannerState);
}
