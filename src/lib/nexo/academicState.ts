export type AcademicDiscipline = { code: string; name: string; lessons: number; lessonsDone: number; exercises: number; exercisesDone: number; assignments: number; assignmentsDone: number; exam: string; daysUntilExam: number };

const STORAGE_KEY = "nexo-academic-state";

export const defaultAcademicState: AcademicDiscipline[] = [
  { code: "EST-PROB", name: "Estatística e Probabilidade", lessons: 14, lessonsDone: 1, exercises: 14, exercisesDone: 0, assignments: 4, assignmentsDone: 0, exam: "15 SET", daysUntilExam: 14 },
  { code: "CALC-II", name: "Cálculo II", lessons: 12, lessonsDone: 3, exercises: 17, exercisesDone: 4, assignments: 3, assignmentsDone: 1, exam: "22 SET", daysUntilExam: 21 },
  { code: "ADM-FUND", name: "Fundamentos da Administração", lessons: 10, lessonsDone: 6, exercises: 17, exercisesDone: 11, assignments: 2, assignmentsDone: 1, exam: "29 SET", daysUntilExam: 28 },
];

export function loadAcademicState(): AcademicDiscipline[] {
  if (typeof window === "undefined") return defaultAcademicState;
  try { const saved = window.localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) : defaultAcademicState; } catch { return defaultAcademicState; }
}

export function saveAcademicState(state: AcademicDiscipline[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function applyMissionCompletion(state: AcademicDiscipline[], missionId: string) {
  const code = missionId.split("-")[0] === "EST" ? "EST-PROB" : missionId.split("-")[0] === "CALC" ? "CALC-II" : missionId.split("-")[0] === "ADM" ? "ADM-FUND" : null;
  if (!code) return state;
  return state.map((d) => {
    if (d.code !== code) return d;
    if (missionId.endsWith("-lesson")) return { ...d, lessonsDone: Math.min(d.lessons, d.lessonsDone + 1) };
    if (missionId.endsWith("-exercise")) return { ...d, exercisesDone: Math.min(d.exercises, d.exercisesDone + 1) };
    if (missionId.endsWith("-assignment")) return { ...d, assignmentsDone: Math.min(d.assignments, d.assignmentsDone + 1) };
    return d;
  });
}
