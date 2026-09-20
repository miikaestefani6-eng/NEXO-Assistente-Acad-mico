import { syncLearningGap } from "./cloudState";
export type LearningGap = {
  id: string;
  discipline: string;
  topic: string;
  note: string;
  strength: number;
  occurrences: number;
  lastSeen: string;
  nextReview: string;
  resolved: boolean;
};

const KEY = "nexo-learning-gaps";

function load(): LearningGap[] {
  if (typeof window === "undefined") return [];
  try { const raw = window.localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function save(items: LearningGap[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(items));
}
export function loadLearningGaps() { return load(); }
export function activeLearningGaps(discipline?: string) {
  return load().filter((g) => !g.resolved && (!discipline || g.discipline.toLowerCase() === discipline.toLowerCase()));
}
export function recordLearningGap(input: { discipline?: string; topic?: string; note?: string; strength?: number }) {
  const discipline = (input.discipline || "Plano geral").trim();
  const topic = (input.topic || "Ponto que precisa de revisão").trim();
  const items = load();
  const index = items.findIndex((g) => !g.resolved && g.discipline.toLowerCase() === discipline.toLowerCase() && g.topic.toLowerCase() === topic.toLowerCase());
  const today = new Date();
  const strength = Math.max(1, Math.min(5, Number(input.strength) || 3));
  const review = new Date(today); review.setDate(today.getDate() + (strength <= 2 ? 1 : strength === 3 ? 2 : 4));
  if (index >= 0) {
    const current = items[index];
    items[index] = { ...current, note: input.note || current.note, strength: Math.min(current.strength, strength), occurrences: current.occurrences + 1, lastSeen: today.toISOString(), nextReview: review.toISOString() };
  } else {
    items.push({ id: `gap-${Date.now()}`, discipline, topic, note: input.note || "O estudante demonstrou dificuldade neste ponto.", strength, occurrences: 1, lastSeen: today.toISOString(), nextReview: review.toISOString(), resolved: false });
  }
  save(items); const changed = index >= 0 ? items[index] : items[items.length - 1]; if (changed) void syncLearningGap(changed); return items;
}
export function resolveLearningGap(id: string) {
  const next = load().map((g) => g.id === id ? { ...g, resolved: true } : g); save(next); const changed = next.find((g) => g.id === id); if (changed) void syncLearningGap(changed); return next;
}
export function reinforceLearningGap(id: string, strength: number) {
  const now = new Date();
  const normalized = Math.max(1, Math.min(5, strength));
  const next = load().map((g) => {
    if (g.id !== id) return g;
    if (normalized >= 4) return { ...g, strength: normalized, resolved: true, lastSeen: now.toISOString() };
    const review = new Date(now); review.setDate(now.getDate() + (normalized <= 2 ? 1 : 3));
    return { ...g, strength: normalized, occurrences: g.occurrences + 1, lastSeen: now.toISOString(), nextReview: review.toISOString(), resolved: false };
  });
  save(next); const changed = next.find((g) => g.id === id); if (changed) void syncLearningGap(changed); return next;
}
export function dueLearningGaps() {
  const now = Date.now();
  return load().filter((g) => !g.resolved && new Date(g.nextReview).getTime() <= now).sort((a,b) => a.strength - b.strength || b.occurrences - a.occurrences);
}
