import AccountMenu from "./AccountMenu";
import { useMemo, useRef, useState } from "react";
import { generateAdaptivePlan, getCriticalDiscipline, replanAfterMissedDay } from "./lib/nexo/adaptivePlanner";
import { applyMissionCompletion, loadAcademicState, saveAcademicState } from "./lib/nexo/academicState";
import { acceptRecoveryPlan, loadPlannerState, registerMissedDay, type PlannerState } from "./lib/nexo/plannerState";
import { completeCmsActivity, loadCmsActivities, loadCmsEvents } from "./lib/nexo/cmsState";
import { activeLearningGaps, dueLearningGaps, recordLearningGap, reinforceLearningGap } from "./lib/nexo/learningMemory";
import { registerStudyMaterial } from "./lib/nexo/studyMaterials";
import { uploadStudyMaterial } from "./lib/nexo/cloudState";
import { loadStudyProfile } from "./lib/nexo/studyProfile";

type AgendaItem = { id: string; cmsId?: string; gapId?: string; time: string; subject: string; title: string; type: string; duration: number; status: "next" | "pending" | "done"; source: "cms" | "event" | "plan" | "learning" };
type AssistantAction = "explain" | "summary" | "flashcards" | "mindmap" | "late" | "doubt";

function todayISO() { return new Date().toISOString().slice(0, 10); }
function todayLabel() { return new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"numeric",month:"long"}).format(new Date()).toUpperCase(); }
function getWorkload() { return loadAcademicState().map(({ code, name, lessons, lessonsDone, exercises, exercisesDone, assignments, assignmentsDone, daysUntilExam }) => ({ code, name, pendingLessons: lessons - lessonsDone, pendingExercises: exercises - exercisesDone, pendingAssignments: assignments - assignmentsDone, daysUntilExam })); }
function planItems(missions: ReturnType<typeof generateAdaptivePlan>[number]["missions"]): AgendaItem[] { return missions.map((mission, index) => ({ id: mission.id, time: index === 0 ? "Agora" : `${19 + index}:00`, subject: mission.subject, title: mission.title, type: mission.type, duration: mission.duration, status: index === 0 ? "next" : "pending", source: "plan" })); }

function cmsItems(): AgendaItem[] {
  const disciplines = new Map(loadAcademicState().map((d) => [d.code, d.name]));
  const today = todayISO();
  const activities = loadCmsActivities().filter((activity) => !activity.done && (!activity.dueDate || activity.dueDate === today));
  const events = loadCmsEvents().filter((event) => event.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const activityItems: AgendaItem[] = activities.map((activity, index) => ({ id: `cms-${activity.id}`, cmsId: activity.id, time: index === 0 ? "Agora" : "A seguir", subject: disciplines.get(activity.disciplineCode) ?? (activity.disciplineCode || "Atividade acadêmica"), title: activity.title, type: activity.type, duration: activity.minutes, status: "pending", source: "cms" }));
  const eventItems: AgendaItem[] = events.map((event) => ({ id: `event-${event.id}`, time: event.time, subject: disciplines.get(event.disciplineCode) ?? (event.disciplineCode || "Compromisso acadêmico"), title: event.title, type: event.kind, duration: 60, status: "pending", source: "event" }));
  const all = [...activityItems, ...eventItems].sort((a, b) => a.time.localeCompare(b.time));
  return all.map((item, index) => ({ ...item, status: index === 0 ? "next" : item.status }));
}

function Agenda() {
  const initialPlannerState = loadPlannerState();
  const availableMinutes = loadStudyProfile().availableMinutesPerDay;
  const initialItems = (() => { const content = cmsItems(); const base = content.length ? content : planItems(generateAdaptivePlan(getWorkload(), availableMinutes, 7)[0].missions); const reviews: AgendaItem[] = dueLearningGaps().slice(0, 2).map((gap, index) => ({ id: `learning-${gap.id}`, gapId: gap.id, time: index === 0 ? "Revisão" : "Depois", subject: gap.discipline, title: `Revisar: ${gap.topic}`, type: "Revisão adaptativa", duration: 15, status: "pending", source: "learning" })); return reviews.length ? [...reviews, ...base].map((item, index) => ({ ...item, status: index === 0 ? "next" as const : item.status === "next" ? "pending" as const : item.status })) : base; })();
  const [items, setItems] = useState<AgendaItem[]>(initialItems);
  const [recoveryMode, setRecoveryMode] = useState(initialPlannerState.recoveryActive);
  const [recoveryMinutes, setRecoveryMinutes] = useState(initialPlannerState.missedMinutes);
  const [plannerState, setPlannerState] = useState<PlannerState>(initialPlannerState);
  const [showRecoveryNotice, setShowRecoveryNotice] = useState(initialPlannerState.missedMinutes > 0 && !initialPlannerState.recoveryActive);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantAction, setAssistantAction] = useState<AssistantAction | null>(null);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantResponse, setAssistantResponse] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState("");
  const [assistantFile, setAssistantFile] = useState<File | null>(null);
  const [reviewCheck, setReviewCheck] = useState<AgendaItem | null>(null);
  const assistantFileRef = useRef<HTMLInputElement>(null);

  const workload = useMemo(() => getWorkload(), [items]);
  const critical = useMemo(() => getCriticalDiscipline(workload), [workload]);
  const plan = useMemo(() => recoveryMode ? replanAfterMissedDay(workload, recoveryMinutes, availableMinutes, 7) : generateAdaptivePlan(workload, availableMinutes, 7), [recoveryMode, recoveryMinutes, workload]);
  const completed = items.filter((item) => item.status === "done").length;
  const pendingItems = items.filter((item) => item.status !== "done" && item.source !== "event");
  const pendingMinutes = pendingItems.reduce((sum, item) => sum + item.duration, 0);
  const dueGaps = dueLearningGaps();

  function markDone(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (!item || item.status === "done" || item.source === "event") return;
    if (item.gapId) { setReviewCheck(item); return; } else if (item.cmsId) completeCmsActivity(item.cmsId); else saveAcademicState(applyMissionCompletion(loadAcademicState(), id));
    setItems((current) => { const updated = current.map((entry) => entry.id === id ? { ...entry, status: "done" as const } : entry); const nextPending = updated.find((entry) => entry.status !== "done" && entry.source !== "event"); return updated.map((entry) => ({ ...entry, status: entry.status === "done" ? "done" as const : entry.id === nextPending?.id ? "next" as const : entry.status })); });
  }

  function finishReview(strength: number) {
    if (!reviewCheck?.gapId) return;
    reinforceLearningGap(reviewCheck.gapId, strength);
    setItems((current) => { const updated = current.map((entry) => entry.id === reviewCheck.id ? { ...entry, status: "done" as const } : entry); const nextPending = updated.find((entry) => entry.status !== "done" && entry.source !== "event"); return updated.map((entry) => ({ ...entry, status: entry.status === "done" ? "done" as const : entry.id === nextPending?.id ? "next" as const : entry.status })); });
    setReviewCheck(null);
  }

  function reportMissedDay() {
    if (pendingMinutes <= 0) return;
    const pendingIds = pendingItems.map((item) => item.id);
    const nextState = registerMissedDay({ missionIds: pendingIds, missedMinutes: pendingMinutes, priorityCode: critical?.code ?? null, priorityReason: critical?.reason ?? null });
    setPlannerState(nextState); setRecoveryMinutes(pendingMinutes); setRecoveryMode(false); setShowRecoveryNotice(true);
  }
  function startRecovery() {
    const state = loadPlannerState(); const missed = Math.max(15, state.missedMinutes || pendingMinutes); const nextPlan = replanAfterMissedDay(getWorkload(), missed, availableMinutes, 7); const accepted = acceptRecoveryPlan({ ...state, missedMinutes: missed });
    setPlannerState(accepted); setRecoveryMinutes(missed); setRecoveryMode(true); setItems(planItems(nextPlan[0].missions)); setShowRecoveryNotice(false);
  }
  function openAssistant(action?: AssistantAction) {
    setAssistantAction(action ?? null); setAssistantOpen(true); setAssistantError("");
    if (!assistantResponse && action) setAssistantInput(action === "late" ? "Fiquei atrasado. O que devo fazer agora?" : action === "doubt" ? "Não entendi a matéria e preciso destravar." : action === "explain" ? "Explique o conteúdo que devo estudar agora." : action === "summary" ? "Faça um resumo do conteúdo que devo estudar agora." : action === "flashcards" ? "Crie flashcards para eu revisar agora." : "Monte um mapa mental do conteúdo que devo estudar agora.");
  }
  function fileToBase64(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("Não consegui ler esse material.")); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.readAsDataURL(file); }); }
  async function askAssistant() {
    const message = assistantInput.trim(); if ((!message && !assistantFile) || assistantLoading) return;
    setAssistantLoading(true); setAssistantError("");
    try { const filePayload = assistantFile ? { name: assistantFile.name, mimeType: assistantFile.type || "application/pdf", data: await fileToBase64(assistantFile) } : null; const response = await fetch("/api/nexo-assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, action: assistantAction, file: filePayload, context: { priority: critical?.discipline ?? null, priorityReason: critical?.reason ?? null, pendingMinutes, learningGaps: activeLearningGaps().map((gap) => ({ discipline: gap.discipline, topic: gap.topic, note: gap.note, occurrences: gap.occurrences })), workload: workload.map((item) => ({ discipline: item.name, pendingLessons: item.pendingLessons, pendingExercises: item.pendingExercises, pendingAssignments: item.pendingAssignments, daysUntilExam: item.daysUntilExam })) } }) }); const data = await response.json(); if (!response.ok) throw new Error(data?.error || "Não foi possível responder agora."); const rawAnswer = String(data.answer || ""); const gapMatch = rawAnswer.match(/\[\[NEXO_GAP:(\{.*?\})\]\]/s); if (gapMatch) { try { recordLearningGap(JSON.parse(gapMatch[1])); } catch { /* resposta continua utilizável */ } } setAssistantResponse(rawAnswer.replace(/\n?\[\[NEXO_GAP:.*?\]\]/s, "").trim()); if (assistantFile) { registerStudyMaterial({ name: assistantFile.name, mimeType: assistantFile.type || "application/pdf", discipline: critical?.discipline || "Não classificado", source: "assistant" }); void uploadStudyMaterial(assistantFile, critical?.discipline || "Não classificado"); } setAssistantFile(null); }
    catch (error) { setAssistantError(error instanceof Error ? error.message : "Não foi possível responder agora."); } finally { setAssistantLoading(false); }
  }
  const assistantSubject = critical?.discipline ?? "seu plano acadêmico";

  return <div className="app"><header className="topbar"><div className="brand-area"><span className="brand">NEXO</span><span className="brand-subtitle">Assistente Estudantil</span></div><nav className="desktop-nav"><a href="/">Hoje</a><a className="active" href="/agenda">Agenda</a><a href="/disciplinas">Disciplinas</a><a href="/progresso">Progresso</a></nav><AccountMenu /></header><main className="main-content"><section className="welcome"><div><p className="eyebrow">SEU CAMINHO DE ESTUDOS</p><h1>Sua semana,<br />organizada.</h1><p className="welcome-text">O NEXO não abandona uma pendência. Quando o ritmo muda, ele recalcula o caminho.</p></div></section><section className="agenda-container">{showRecoveryNotice && <div className="recovery-banner"><span>↻</span><div><strong>Tudo bem. O NEXO recalculou.</strong><p>Você deixou <b>{plannerState.missedMinutes} min</b> para trás. A prioridade agora é <b>{plannerState.priorityCode ?? "a disciplina mais crítica"}</b>{plannerState.priorityReason ? ` — ${plannerState.priorityReason}` : "."}</p></div><button onClick={startRecovery}>Aceitar novo plano <span>→</span></button><button className="recovery-dismiss" onClick={() => setShowRecoveryNotice(false)}>Agora não</button></div>}{recoveryMode && <div className="planner-banner"><span>⚡</span><div><strong>Plano recalculado pelo NEXO</strong><p>{recoveryMinutes} min de pendências considerados. A carga extra foi limitada para evitar sobrecarga.</p></div></div>}<div className="agenda-header"><div><p className="eyebrow">{todayLabel()}</p><h2>Plano de hoje</h2></div><div className="agenda-summary"><strong>{completed}</strong><span>de {items.length} concluídas</span></div></div>{cmsItems().length > 0 && <div className="planner-banner"><span>✓</span><div><strong>Seus compromissos entraram no plano</strong><p>Atividades e aulas informadas aparecem aqui automaticamente.</p></div></div>}{dueGaps.length > 0 && <div className="planner-banner"><span>↻</span><div><strong>O NEXO trouxe uma revisão para o seu plano</strong><p>{dueGaps[0].topic} em {dueGaps[0].discipline} ainda precisa de reforço. A revisão já entrou como missão de 15 minutos.</p></div></div>}{critical && <div className="planner-banner"><span>🧠</span><div><strong>Prioridade definida pelo NEXO: {critical.discipline}</strong><p>{critical.reason} O NEXO colocou essa disciplina na frente para reduzir o risco de acúmulo.</p></div></div>}<div className="agenda-timeline">{items.map((item, index) => { const isDone = item.status === "done"; const isNext = item.status === "next"; return <div className={`agenda-item ${isDone ? "done" : ""} ${isNext ? "next" : ""}`} key={item.id}><div className="agenda-time">{item.time}</div><div className="timeline-line"><span className="timeline-dot">{isDone ? "✓" : ""}</span>{index < items.length - 1 && <span className="timeline-connector" />}</div><article className="agenda-card"><div className="agenda-card-top"><div><span className="task-type">{item.type}</span><h3>{item.title}</h3><p>{item.subject}</p></div><span className="agenda-duration">⏱ {item.duration} min</span></div><div className="agenda-card-footer">{isNext && <span className="next-badge">PRÓXIMO</span>}{isDone && <span className="done-badge">✓ CONCLUÍDO</span>}{!isDone && item.source !== "event" && <button className="agenda-complete" onClick={() => markDone(item.id)}>Marcar como concluído <span>→</span></button>}{!isDone && item.source === "event" && <span className="next-badge">COMPROMISSO</span>}</div></article></div>; })}</div>{pendingMinutes > 0 && !recoveryMode && <div className="missed-day-card"><div><span className="task-type">SE O DIA NÃO SAIU COMO PLANEJADO</span><h3>Não consegui cumprir hoje</h3><p>Sem culpa. O NEXO registra o que ficou para trás e monta um novo caminho para você continuar.</p></div><button onClick={reportMissedDay}>Recalcular meu plano <span>→</span></button></div>}<div className="section-title" style={{ marginTop: "56px" }}><div><p className="eyebrow">PRÓXIMOS 7 DIAS</p><h2>O caminho que o NEXO montou.</h2></div></div><div className="week-plan-grid">{plan.slice(1).map((day) => <article className="week-day" key={day.date}><div><span className="task-type">{day.day}</span><strong>{day.date}</strong></div><b>{day.minutes} min</b><p>{day.missions.length ? `${day.missions.length} missão${day.missions.length > 1 ? "ões" : ""} planejada${day.missions.length > 1 ? "s" : ""}` : "Dia reservado para revisão"}</p>{day.missions.slice(0, 2).map((mission) => <span className="week-mission" key={mission.id}>{mission.subject} · {mission.type}</span>)}</article>)}</div></section></main>{reviewCheck && <div className="mastery-overlay"><div className="mastery-card"><span className="assistant-kicker">🧠 CHECKPOINT DE APRENDIZAGEM</span><h2>Como ficou esse ponto agora?</h2><p>Não é uma nota. Isso só ajuda o NEXO a decidir se você precisa rever esse assunto ou se já pode seguir.</p><strong>{reviewCheck.title}</strong><div className="mastery-actions"><button onClick={() => finishReview(1)}>Ainda não entendi</button><button onClick={() => finishReview(3)}>Entendi melhor</button><button onClick={() => finishReview(5)}>Já consigo seguir</button></div><button className="mastery-later" onClick={() => setReviewCheck(null)}>Responder depois</button></div></div>}<button className="assistant-button" onClick={() => openAssistant()}><span className="assistant-sparkle">✨</span><span>Preciso de ajuda</span></button>{assistantOpen && <div className="assistant-overlay" onClick={() => setAssistantOpen(false)}><aside className="assistant-panel" onClick={(event) => event.stopPropagation()}><div className="assistant-panel-header"><div><span className="assistant-kicker">✨ ASSISTENTE NEXO</span><h2>Vamos destravar isso.</h2><p>Agora você pode conversar de verdade com o NEXO sobre seu estudo.</p></div><button className="assistant-close" onClick={() => setAssistantOpen(false)}>×</button></div><div className="assistant-context"><span>PRIORIDADE ATUAL</span><strong>{assistantSubject}</strong><small>{critical?.reason ?? "Avance pelo próximo passo definido no seu plano."}</small></div>{assistantResponse && <div className="assistant-response"><span>✨ NEXO</span><p>{assistantResponse}</p></div>}{assistantLoading && <div className="assistant-response"><span>✨ NEXO</span><p>Estou pensando no melhor próximo passo para você…</p></div>}{assistantError && <div className="assistant-response"><span>⚠️ NEXO</span><p>{assistantError}</p></div>}<div className="assistant-actions"><button onClick={() => openAssistant("explain")}>📖 Explicar conteúdo</button><button onClick={() => openAssistant("summary")}>📝 Resumir aula</button><button onClick={() => openAssistant("flashcards")}>🧠 Criar flashcards</button><button onClick={() => openAssistant("mindmap")}>🗺️ Mapa mental</button><button onClick={() => openAssistant("late")}>⏳ Estou atrasado</button><button onClick={() => openAssistant("doubt")}>❓ Não entendi a matéria</button></div><input ref={assistantFileRef} type="file" accept=".pdf,image/png,image/jpeg" hidden onChange={(event) => setAssistantFile(event.target.files?.[0] ?? null)} />{assistantFile && <div className="assistant-file"><span>📎</span><div><strong>{assistantFile.name}</strong><small>O NEXO vai usar este material para responder.</small></div><button onClick={() => setAssistantFile(null)}>×</button></div>}<div className="assistant-input"><button className="assistant-attach" title="Anexar material" onClick={() => assistantFileRef.current?.click()}>📎</button><input value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void askAssistant(); }} placeholder="O que você precisa destravar?" /><button disabled={assistantLoading || (!assistantInput.trim() && !assistantFile)} onClick={() => void askAssistant()}>Enviar</button></div></aside></div>}</div>;
}
export default Agenda;
