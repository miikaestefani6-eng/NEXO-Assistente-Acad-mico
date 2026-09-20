export type StudyMaterial = {
  id: string;
  name: string;
  mimeType: string;
  discipline: string;
  addedAt: string;
  source: "assistant" | "onboarding";
};

const KEY = "nexo-study-materials";
function load(): StudyMaterial[] {
  if (typeof window === "undefined") return [];
  try { const raw = window.localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function save(items: StudyMaterial[]) { if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(items)); }
export function loadStudyMaterials(discipline?: string) {
  return load().filter((m) => !discipline || m.discipline.toLowerCase() === discipline.toLowerCase());
}
export function registerStudyMaterial(input: { name: string; mimeType: string; discipline?: string; source?: StudyMaterial["source"] }) {
  const items = load();
  const discipline = input.discipline?.trim() || "Não classificado";
  const existing = items.find((m) => m.name === input.name && m.discipline.toLowerCase() === discipline.toLowerCase());
  if (existing) return items;
  const next = [...items, { id: `material-${Date.now()}`, name: input.name, mimeType: input.mimeType, discipline, addedAt: new Date().toISOString(), source: input.source || "assistant" }];
  save(next); return next;
}
export function moveStudyMaterial(id: string, discipline: string) {
  const next = load().map((m) => m.id === id ? { ...m, discipline } : m); save(next); return next;
}
