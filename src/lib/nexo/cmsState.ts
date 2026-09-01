import { loadAcademicState, saveAcademicState } from "./academicState";

export type CmsActivityType = "Aula da plataforma" | "Aula ao vivo" | "Exercício" | "Trabalho" | "Revisão";
export type CmsChecklistItem = { id: string; label: string; done: boolean };
export type CmsActivity = { id: string; title: string; disciplineCode: string; type: CmsActivityType; dueDate: string; minutes: number; done: boolean; checklist: CmsChecklistItem[] };
export type CmsEvent = { id: string; title: string; date: string; time: string; disciplineCode: string; kind: "Aula ao vivo" | "Prova" | "Entrega" | "Outro" };

export const ACTIVITY_KEY = "nexo-admin-activities";
export const EVENT_KEY = "nexo-admin-events";

const ACTIVITY_TYPES: CmsActivityType[] = ["Aula da plataforma", "Aula ao vivo", "Exercício", "Trabalho", "Revisão"];

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* mantém o fluxo utilizável */ }
}

function normalizeChecklist(item: Partial<CmsChecklistItem>, index: number): CmsChecklistItem {
  return { id: item.id || `step-${index}`, label: String(item.label || "Etapa"), done: Boolean(item.done) };
}

export function loadCmsActivities(): CmsActivity[] {
  const raw = safeRead<Partial<CmsActivity>[]>(ACTIVITY_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const legacyType = item.type === ("Aula" as CmsActivityType) ? "Aula da plataforma" : item.type;
    return {
      id: item.id || `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: String(item.title || "Atividade"),
      disciplineCode: String(item.disciplineCode || ""),
      type: ACTIVITY_TYPES.includes(legacyType as CmsActivityType) ? legacyType as CmsActivityType : "Aula da plataforma",
      dueDate: String(item.dueDate || ""),
      minutes: Math.max(5, Number(item.minutes) || 30),
      done: Boolean(item.done),
      checklist: Array.isArray(item.checklist) ? item.checklist.map(normalizeChecklist) : [],
    };
  });
}

export function saveCmsActivities(activities: CmsActivity[]) { safeWrite(ACTIVITY_KEY, activities); }
export function loadCmsEvents(): CmsEvent[] { return safeRead<CmsEvent[]>(EVENT_KEY, []); }

function registerAcademicCompletion(activity: CmsActivity) {
  if (activity.type === "Aula ao vivo" || activity.type === "Revisão") return;
  const state = loadAcademicState();
  const next = state.map((discipline) => {
    if (discipline.code !== activity.disciplineCode) return discipline;
    if (activity.type === "Aula da plataforma") {
      return { ...discipline, lessonsDone: Math.min(discipline.lessons, discipline.lessonsDone + 1) };
    }
    if (activity.type === "Exercício") {
      return { ...discipline, exercisesDone: Math.min(discipline.exercises, discipline.exercisesDone + 1) };
    }
    return { ...discipline, assignmentsDone: Math.min(discipline.assignments, discipline.assignmentsDone + 1) };
  });
  saveAcademicState(next);
}

export function toggleCmsActivityStep(activityId: string, stepId: string): CmsActivity[] {
  const activities = loadCmsActivities();
  let completedNow: CmsActivity | null = null;
  const next = activities.map((activity) => {
    if (activity.id !== activityId) return activity;
    const checklist = activity.checklist.map((step) => step.id === stepId ? { ...step, done: !step.done } : step);
    const done = checklist.length > 0 && checklist.every((step) => step.done);
    if (!activity.done && done) completedNow = { ...activity, checklist, done };
    return { ...activity, checklist, done };
  });
  saveCmsActivities(next);
  if (completedNow) registerAcademicCompletion(completedNow);
  return next;
}

export function completeCmsActivity(activityId: string): CmsActivity[] {
  const activities = loadCmsActivities();
  let completedNow: CmsActivity | null = null;
  const next = activities.map((activity) => {
    if (activity.id !== activityId) return activity;
    if (!activity.done) completedNow = { ...activity, done: true, checklist: activity.checklist.map((step) => ({ ...step, done: true })) };
    return activity.done ? activity : { ...activity, done: true, checklist: activity.checklist.map((step) => ({ ...step, done: true })) };
  });
  saveCmsActivities(next);
  if (completedNow) registerAcademicCompletion(completedNow);
  return next;
}
