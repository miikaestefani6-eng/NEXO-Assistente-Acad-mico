import { useMemo, useState } from "react";
import { generateAdaptivePlan, getCriticalDiscipline, replanAfterMissedDay } from "./lib/nexo/adaptivePlanner";
import { applyMissionCompletion, loadAcademicState, saveAcademicState } from "./lib/nexo/academicState";
import { acceptRecoveryPlan, loadPlannerState, registerMissedDay, type PlannerState } from "./lib/nexo/plannerState";

type AgendaItem = { id: string; time: string; subject: string; title: string; type: string; duration: number; status: "next" | "pending" | "done" };

function getWorkload() {
  return loadAcademicState().map(({ code, name, lessons, lessonsDone, exercises, exercisesDone, assignments, assignmentsDone, daysUntilExam }) => ({ code, name, pendingLessons: lessons - lessonsDone, pendingExercises: exercises - exercisesDone, pendingAssignments: assignments - assignmentsDone, daysUntilExam }));
}

function missionsToItems(missions: ReturnType<typeof generateAdaptivePlan>[number]["missions"]): AgendaItem[] {
  return missions.map((mission, index) => ({ id: mission.id, time: index === 0 ? "Agora" : `${19 + index}:00`, subject: mission.subject, title: mission.title, type: mission.type, duration: mission.duration, status: index === 0 ? "next" : "pending" }));
}

function Agenda() {
  const [items, setItems] = useState<AgendaItem[]>(() => missionsToItems(generateAdaptivePlan(getWorkload(), 90, 7)[0].missions));
  const [recoveryMode, setRecoveryMode] = useState(() => loadPlannerState().recoveryActive);
  const [recoveryMinutes, setRecoveryMinutes] = useState(() => loadPlannerState().missedMinutes);
  const [plannerState, setPlannerState] = useState<PlannerState>(() => loadPlannerState());
  const [showRecoveryNotice, setShowRecoveryNotice] = useState(() => {
    const state = loadPlannerState();
    return state.missedMinutes > 0 && !state.recoveryActive;
  });

  const workload = useMemo(() => getWorkload(), [items]);
  const critical = useMemo(() => getCriticalDiscipline(workload), [workload]);
  const plan = useMemo(() => recoveryMode ? replanAfterMissedDay(workload, recoveryMinutes, 90, 7) : generateAdaptivePlan(workload, 90, 7), [recoveryMode, recoveryMinutes, workload]);
  const weeklyPlan = plan;
  const completed = items.filter((item) => item.status === "done").length;
  const pendingMinutes = items.filter((item) => item.status !== "done").reduce((sum, item) => sum + item.duration, 0);

  function markDone(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (!item || item.status === "done") return;
    saveAcademicState(applyMissionCompletion(loadAcademicState(), id));
    setItems((current) => {
      const updated = current.map((entry) => entry.id === id ? { ...entry, status: "done" as const } : entry);
      const nextPending = updated.find((entry) => entry.status !== "done");
      return updated.map((entry) => ({ ...entry, status: entry.status === "done" ? "done" as const : entry.id === nextPending?.id ? "next" as const : "pending" as const }));
    });
  }

  function reportMissedDay() {
    if (pendingMinutes <= 0) return;
    const pendingIds = items.filter((item) => item.status !== "done").map((item) => item.id);
    const nextState = registerMissedDay({
      missionIds: pendingIds,
      missedMinutes: pendingMinutes,
      priorityCode: critical?.code ?? null,
      priorityReason: critical?.reason ?? null,
    });
    setPlannerState(nextState);
    setRecoveryMinutes(pendingMinutes);
    setShowRecoveryNotice(true);
    setRecoveryMode(false);
  }

  function startRecovery() {
    const state = loadPlannerState();
    const missed = Math.max(15, state.missedMinutes || pendingMinutes);
    const nextPlan = replanAfterMissedDay(getWorkload(), missed, 90, 7);
    const accepted = acceptRecoveryPlan({ ...state, missedMinutes: missed });
    setPlannerState(accepted);
    setRecoveryMinutes(missed);
    setRecoveryMode(true);
    setItems(missionsToItems(nextPlan[0].missions));
    setShowRecoveryNotice(false);
  }

  return <div className="app"><header className="topbar"><div className="brand-area"><span className="brand">NEXO</span><span className="brand-subtitle">Assistente Acadêmico</span></div><nav className="desktop-nav"><a href="/">Hoje</a><a className="active" href="/agenda">Agenda</a><a href="/disciplinas">Disciplinas</a><a href="/progresso">Progresso</a></nav><div className="student"><div className="avatar">E</div><div className="student-info"><strong>Estudante</strong><span>Meu semestre</span></div></div></header><main className="main-content"><section className="welcome"><div><p className="eyebrow">PLANEJAMENTO ACADÊMICO</p><h1>Sua semana,<br />organizada.</h1><p className="welcome-text">O NEXO não abandona uma pendência. Quando o ritmo muda, ele recalcula o caminho.</p></div></section><section className="agenda-container">{showRecoveryNotice && <div className="recovery-banner"><span>↻</span><div><strong>Tudo bem. O NEXO recalculou.</strong><p>Você deixou <b>{plannerState.missedMinutes} min</b> para trás. A prioridade agora é <b>{plannerState.priorityCode ?? "a disciplina mais crítica"}</b>{plannerState.priorityReason ? ` — ${plannerState.priorityReason}` : "."}</p></div><button onClick={startRecovery}>Aceitar novo plano <span>→</span></button><button className="recovery-dismiss" onClick={() => setShowRecoveryNotice(false)}>Agora não</button></div>}{recoveryMode && <div className="planner-banner"><span>⚡</span><div><strong>Plano recalculado pelo NEXO</strong><p>{recoveryMinutes} min de pendências considerados. A carga extra foi limitada para evitar sobrecarga.</p></div></div>}<div className="agenda-header"><div><p className="eyebrow">TERÇA-FEIRA · 1 DE SETEMBRO</p><h2>Plano de hoje</h2></div><div className="agenda-summary"><strong>{completed}</strong><span>de {items.length} concluídas</span></div></div>{critical && <div className="planner-banner"><span>🧠</span><div><strong>Prioridade definida pelo NEXO: {critical.discipline}</strong><p>{critical.reason} O NEXO colocou essa disciplina na frente para reduzir o risco de acúmulo.</p></div></div>}<div className="agenda-timeline">{items.map((item, index) => { const isDone = item.status === "done"; const isNext = item.status === "next"; return <div className={`agenda-item ${isDone ? "done" : ""} ${isNext ? "next" : ""}`} key={item.id}><div className="agenda-time">{item.time}</div><div className="timeline-line"><span className="timeline-dot">{isDone ? "✓" : ""}</span>{index < items.length - 1 && <span className="timeline-connector" />}</div><article className="agenda-card"><div className="agenda-card-top"><div><span className="task-type">{item.type}</span><h3>{item.title}</h3><p>{item.subject}</p></div><span className="agenda-duration">⏱ {item.duration} min</span></div><div className="agenda-card-footer">{isNext && <span className="next-badge">PRÓXIMO</span>}{isDone && <span className="done-badge">✓ CONCLUÍDO</span>}{!isDone && <button className="agenda-complete" onClick={() => markDone(item.id)}>Marcar como concluído <span>→</span></button>}</div></article></div>; })}</div>{pendingMinutes > 0 && !recoveryMode && <div className="missed-day-card"><div><span className="task-type">SE O DIA NÃO SAIU COMO PLANEJADO</span><h3>Não consegui cumprir hoje</h3><p>Sem culpa. O NEXO registra o que ficou para trás e monta um novo caminho para você continuar.</p></div><button onClick={reportMissedDay}>Recalcular meu plano <span>→</span></button></div>}<div className="section-title" style={{ marginTop: "56px" }}><div><p className="eyebrow">PRÓXIMOS 7 DIAS</p><h2>O caminho que o NEXO montou.</h2></div></div><div className="week-plan-grid">{weeklyPlan.slice(1).map((day) => <article className="week-day" key={day.date}><div><span className="task-type">{day.day}</span><strong>{day.date}</strong></div><b>{day.minutes} min</b><p>{day.missions.length ? `${day.missions.length} missão${day.missions.length > 1 ? "ões" : ""} planejada${day.missions.length > 1 ? "s" : ""}` : "Dia reservado para revisão"}</p>{day.missions.slice(0, 2).map((mission) => <span className="week-mission" key={mission.id}>{mission.subject} · {mission.type}</span>)}</article>)}</div></section></main><button className="assistant-button" onClick={() => alert("O Assistente de Estudos será conectado à IA.")}><span className="assistant-sparkle">✨</span><span>Preciso de ajuda</span></button></div>;
}
export default Agenda;
