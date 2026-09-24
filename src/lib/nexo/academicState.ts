import { syncSubjects } from "./cloudState";
import { clearSyncPending, markSyncPending } from "./syncStatus";
export type AcademicDiscipline = { code: string; name: string; lessons: number; lessonsDone: number; exercises: number; exercisesDone: number; assignments: number; assignmentsDone: number; exam: string; daysUntilExam: number; examDate?: string; scheduleKnown?: boolean };

const STORAGE_KEY = "nexo-academic-state";

export const defaultAcademicState: AcademicDiscipline[] = [
  { code: "EST-PROB", name: "Estatística e Probabilidade", lessons: 14, lessonsDone: 1, exercises: 14, exercisesDone: 0, assignments: 4, assignmentsDone: 0, exam: "15 SET", daysUntilExam: 14, scheduleKnown: true },
  { code: "CALC-II", name: "Cálculo II", lessons: 12, lessonsDone: 3, exercises: 17, exercisesDone: 4, assignments: 3, assignmentsDone: 1, exam: "22 SET", daysUntilExam: 21, scheduleKnown: true },
  { code: "ADM-FUND", name: "Fundamentos da Administração", lessons: 10, lessonsDone: 6, exercises: 17, exercisesDone: 11, assignments: 2, assignmentsDone: 1, exam: "29 SET", daysUntilExam: 28, scheduleKnown: true },
];

export function loadAcademicState(): AcademicDiscipline[] {
  if (typeof window === "undefined") return [];
  try { const saved = window.localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) : []; } catch { return []; }
}

export function saveAcademicState(state: AcademicDiscipline[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  markSyncPending("subjects"); void syncSubjects(state).then(ok=>{if(ok)clearSyncPending("subjects");});
}

export function applyMissionCompletion(state: AcademicDiscipline[], missionId: string) {
  let code: string | null = null;
  let kind: "lesson" | "exercise" | "assignment" | null = null;
  if (missionId.endsWith("-lesson")) { code = missionId.slice(0, -"-lesson".length); kind = "lesson"; }
  else if (missionId.endsWith("-exercise")) { code = missionId.slice(0, -"-exercise".length); kind = "exercise"; }
  else if (missionId.endsWith("-assignment")) { code = missionId.slice(0, -"-assignment".length); kind = "assignment"; }
  if (!code || !kind) return state;
  return state.map((d) => {
    if (d.code !== code) return d;
    if (kind === "lesson") return { ...d, lessonsDone: Math.min(d.lessons, d.lessonsDone + 1) };
    if (kind === "exercise") return { ...d, exercisesDone: Math.min(d.exercises, d.exercisesDone + 1) };
    return { ...d, assignmentsDone: Math.min(d.assignments, d.assignmentsDone + 1) };
  });
}
