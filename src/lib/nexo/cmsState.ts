export type CmsActivityType = "Aula da plataforma" | "Aula ao vivo" | "Exercício" | "Trabalho" | "Revisão";
export type CmsChecklistItem = { id: string; label: string; done: boolean };
export type CmsActivity = { id: string; title: string; disciplineCode: string; type: CmsActivityType; dueDate: string; minutes: number; done: boolean; checklist: CmsChecklistItem[] };
export type CmsEvent = { id: string; title: string; date: string; time: string; disciplineCode: string; kind: "Aula ao vivo" | "Prova" | "Entrega" | "Outro" };

export const ACTIVITY_KEY = "nexo-admin-activities";
export const EVENT_KEY = "nexo-admin-events";

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

export function loadCmsActivities(): CmsActivity[] {
  const raw = safeRead<Partial<CmsActivity>[]>(ACTIVITY_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    id: item.id || `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: String(item.title || "Atividade"),
    disciplineCode: String(item.disciplineCode || ""),
    type: ["Aula da plataforma", "Aula ao vivo", "Exercício", "Trabalho", "Revisão"].includes(item.type as string) ? item.type as CmsActivityType : "Aula da plataforma",
    dueDate: String(item.dueDate || ""),
    minutes: Math.max(5, Number(item.minutes) || 30),
    done: Boolean(item.done),
    checklist: Array.isArray(item.checklist) ? item.checklist.map((step, index) => ({ id: step.id || `step-${index}`, label: String(step.label || "Etapa"), done: Boolean(step.done) })) : [],
  }));
}

export function saveCmsActivities(activities: CmsActivity[]) { safeWrite(ACTIVITY_KEY, activities); }
export function loadCmsEvents(): CmsEvent[] { return safeRead<CmsEvent[]>(EVENT_KEY, []); }

export function toggleCmsActivityStep(activityId: string, stepId: string): CmsActivity[] {
  const activities = loadCmsActivities();
  const next = activities.map((activity) => {
    if (activity.id !== activityId) return activity;
    const checklist = activity.checklist.map((step) => step.id === stepId ? { ...step, done: !step.done } : step);
    return { ...activity, checklist, done: checklist.length > 0 && checklist.every((step) => step.done) };
  });
  saveCmsActivities(next);
  return next;
}

export function completeCmsActivity(activityId: string): CmsActivity[] {
  const activities = loadCmsActivities();
  const next = activities.map((activity) => activity.id === activityId ? { ...activity, done: true, checklist: activity.checklist.map((step) => ({ ...step, done: true })) } : activity);
  saveCmsActivities(next);
  return next;
}
