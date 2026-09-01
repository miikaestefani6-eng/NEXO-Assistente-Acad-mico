import { useMemo, useState } from "react";
import { generateWeeklyPlan } from "./lib/nexo/weeklyPlanner";
import { replanAfterMissedDay } from "./lib/nexo/adaptivePlanner";
import { applyMissionCompletion, loadAcademicState, saveAcademicState } from "./lib/nexo/academicState";

type AgendaItem = { id: string; time: string; subject: string; title: string; type: string; duration: string; status: "next" | "pending" | "done" };

function getWorkload() {
  return loadAcademicState().map(({ code, name, lessons, lessonsDone, exercises, exercisesDone, assignments, assignmentsDone, daysUntilExam }) => ({ code, name, pendingLessons: lessons - lessonsDone, pendingExercises: exercises - exercisesDone, pendingAssignments: assignments - assignmentsDone, daysUntilExam }));
}

function Agenda() {
  const [items, setItems] = useState<AgendaItem[]>(() => {
    const today = generateWeeklyPlan(getWorkload(), 90, 7)[0];
    return today.missions.map((mission, index) => ({ id: mission.id, time: index === 0 ? "Agora" : `${19 + index}:00`, subject: mission.subject, title: mission.title, type: mission.type, duration: `${mission.duration} min`, status: index === 0 ? "next" : "pending" }));
  });
  const [showRecovery, setShowRecovery] = useState(true);
  const weeklyPlan = useMemo(() => generateWeeklyPlan(getWorkload(), 90, 7), [items]);
  const completed = useMemo(() => items.filter((item) => item.status === "done").length, [items]);

  function acceptRecovery() {
    const recovery = replanAfterMissedDay(getWorkload(), 60, 90, 7);
    const tomorrow = recovery[0]?.missions ?? [];
    setItems((current) => current.filter((item) => item.status === "done").map((item) => item).concat(tomorrow.map((mission, index) => ({ id: `${mission.id}-recovery`, time: `${18 + index}:00`, subject: mission.subject, title: mission.title, type: mission.type, duration: `${mission.duration} min`, status: "pending" as const }))));
    setShowRecovery(false);
  }

  function markDone(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (!item || id.endsWith("-recovery")) return;
    saveAcademicState(applyMissionCompletion(loadAcademicState(), id));
    setItems((current) => {
      const updated = current.map((entry) => entry.id === id ? { ...entry, status: "done" as const } : entry);
      const nextPending = updated.find((entry) => entry.status !== "done");
      return updated.map((entry) => ({ ...entry, status: entry.status === "done" ? "done" as const : entry.id === nextPending?.id ? "next" as const : "pending" as const }));
    });
  }

  return <div className="app"><header className="topbar"><div className="brand-area"><span className="brand">NEXO</span><span className="brand-subtitle">Assistente Acadêmico</span></div><nav className="desktop-nav"><a href="/">Hoje</a><a className="active" href="/agenda">Agenda</a><a href="/disciplinas">Disciplinas</a><a href="/progresso">Progresso</a></nav><div className="student"><div className="avatar">E</div><div className="student-info"><strong>Estudante</strong><span>Meu semestre</span></div></div></header><main className="main-content"><section className="welcome"><div><p className="eyebrow">PLANEJAMENTO ACADÊMICO</p><h1>Sua semana,<br />organizada.</h1><p className="welcome-text">O NEXO distribui suas pendências e reorganiza o caminho quando algo fica para trás.</p></div></section><section className="agenda-container">{showRecovery && <div className="recovery-banner"><span>↻</span><div><strong>O NEXO encontrou espaço para recuperação.</strong><p>Se uma sessão de estudo ficou para trás, seu plano pode ser recalculado sem concentrar tudo em um único dia.</p></div><button onClick={acceptRecovery}>Aceitar novo plano <span>→</span></button></div>}<div className="agenda-header"><div><p className="eyebrow">TERÇA-FEIRA · 1 DE SETEMBRO</p><h2>Plano de hoje</h2></div><div className="agenda-summary"><strong>{completed}</strong><span>de {items.length} concluídas</span></div></div><div className="planner-banner"><span>🧠</span><div><strong>Agenda calculada pelo NEXO</strong><p>O planejamento considera pendências, urgência e distância até cada prova.</p></div></div><div className="agenda-timeline">{items.map((item, index) => { const isDone = item.status === "done"; const isNext = item.status === "next"; return <div className={`agenda-item ${isDone ? "done" : ""} ${isNext ? "next" : ""}`} key={`${item.id}-${index}`}><div className="agenda-time">{item.time}</div><div className="timeline-line"><span className="timeline-dot">{isDone ? "✓" : ""}</span>{index < items.length - 1 && <span className="timeline-connector" />}</div><article className="agenda-card"><div className="agenda-card-top"><div><span className="task-type">{item.type}</span><h3>{item.title}</h3><p>{item.subject}</p></div><span className="agenda-duration">⏱ {item.duration}</span></div><div className="agenda-card-footer">{isNext && <span className="next-badge">PRÓXIMO</span>}{isDone && <span className="done-badge">✓ CONCLUÍDO</span>}{!isDone && !item.id.endsWith("-recovery") && <button className="agenda-complete" onClick={() => markDone(item.id)}>Marcar como concluído <span>→</span></button>}{item.id.endsWith("-recovery") && <span className="next-badge">RECUPERAÇÃO</span>}</div></article></div>; })}</div><div className="section-title" style={{ marginTop: "56px" }}><div><p className="eyebrow">PRÓXIMOS 7 DIAS</p><h2>O caminho que o NEXO montou.</h2></div></div><div className="week-plan-grid">{weeklyPlan.slice(1).map((day) => <article className="week-day" key={day.date}><div><span className="task-type">{day.day}</span><strong>{day.date}</strong></div><b>{day.minutes} min</b><p>{day.missions.length ? `${day.missions.length} missão${day.missions.length > 1 ? "ões" : ""} planejada${day.missions.length > 1 ? "s" : ""}` : "Dia reservado para revisão"}</p>{day.missions.slice(0, 2).map((mission) => <span className="week-mission" key={mission.id}>{mission.subject} · {mission.type}</span>)}</article>)}</div></section></main><button className="assistant-button" onClick={() => alert("O Assistente de Estudos será conectado à IA.")}><span className="assistant-sparkle">✨</span><span>Preciso de ajuda</span></button></div>;
}
export default Agenda;
