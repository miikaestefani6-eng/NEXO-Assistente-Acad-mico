import { saveAcademicState, type AcademicDiscipline } from "./academicState";
import { loadCmsEvents, saveCmsEvents, type CmsEvent } from "./cmsState";

export type IntakeSubject = { name: string; lessons?: number; exercises?: number; assignments?: number; examDate?: string; classDays?: string[] };
export type IntakeResult = { summary: string; subjects: IntakeSubject[]; events: Array<{ title: string; date: string; time?: string; kind: CmsEvent["kind"]; subject?: string }>; targetDate?: string; missing?: string[]; confidence?: "alta" | "media" | "baixa" };

function codeFor(name: string, index: number) {
  const base = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 16);
  return base || `ESTUDO-${index + 1}`;
}
function daysUntil(date?: string) {
  if (!date) return 30;
  const target = new Date(date + "T12:00:00");
  if (Number.isNaN(target.getTime())) return 30;
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / 86400000));
}
function examLabel(date?: string) {
  if (!date) return "A DEFINIR";
  const d = new Date(date + "T12:00:00");
  if (Number.isNaN(d.getTime())) return "A DEFINIR";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "").toUpperCase();
}

export function applyIntake(result: IntakeResult) {
  const disciplines: AcademicDiscipline[] = (result.subjects ?? []).map((subject, index) => ({
    code: codeFor(subject.name, index), name: subject.name,
    lessons: Math.max(0, Number(subject.lessons) || 0), lessonsDone: 0,
    exercises: Math.max(0, Number(subject.exercises) || 0), exercisesDone: 0,
    assignments: Math.max(0, Number(subject.assignments) || 0), assignmentsDone: 0,
    exam: examLabel(subject.examDate), daysUntilExam: daysUntil(subject.examDate), examDate: subject.examDate,
    scheduleKnown: [subject.lessons, subject.exercises, subject.assignments].some((value) => Number(value) > 0),
  }));
  if (disciplines.length) saveAcademicState(disciplines);
  const codeByName = new Map(disciplines.map((d) => [d.name.toLowerCase(), d.code]));
  const existing = loadCmsEvents();
  const generated: CmsEvent[] = (result.events ?? []).filter((e) => e.date).map((event, index) => ({
    id: `intake-${Date.now()}-${index}`, title: event.title || event.kind,
    date: event.date, time: event.time || "", kind: event.kind || "Outro",
    disciplineCode: event.subject ? (codeByName.get(event.subject.toLowerCase()) || "") : "",
  }));
  if (generated.length) saveCmsEvents([...existing, ...generated]);
}
