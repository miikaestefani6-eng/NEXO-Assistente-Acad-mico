import { useMemo, useState } from "react";
import { generateDailyMissions } from "./lib/nexo/dailyMissions";

type AgendaItem = { id: string; day: string; date: string; time: string; subject: string; title: string; type: string; duration: string; status: "next" | "pending" | "done" };

const workload = [
  { code: "EST-PROB", name: "Estatística e Probabilidade", pendingLessons: 13, pendingExercises: 14, pendingAssignments: 4, daysUntilExam: 14 },
  { code: "CALC-II", name: "Cálculo II", pendingLessons: 9, pendingExercises: 13, pendingAssignments: 2, daysUntilExam: 21 },
  { code: "ADM-FUND", name: "Fundamentos da Administração", pendingLessons: 4, pendingExercises: 6, pendingAssignments: 1, daysUntilExam: 28 },
];

const generated = generateDailyMissions(workload, 90);
const initialAgenda: AgendaItem[] = [
  ...generated.map((mission, index) => ({ id: mission.id, day: "Hoje", date: "1 SET", time: index === 0 ? "Agora" : `${19 + index}:00`, subject: mission.subject, title: mission.title, type: mission.type, duration: `${mission.duration} min`, status: index === 0 ? "next" as const : "pending" as const })),
  { id: "live-stat", day: "Hoje", date: "1 SET", time: "19:00", subject: "Estatística e Probabilidade", title: "Aula ao vivo", type: "Aula ao vivo", duration: "1h30", status: "pending" },
];

function Agenda() {
  const [items, setItems] = useState(initialAgenda);
  const completed = useMemo(() => items.filter((item) => item.status === "done").length, [items]);
  function markDone(id: string) { setItems((current) => { const updated = current.map((item) => item.id === id ? { ...item, status: "done" as const } : item); const nextPending = updated.find((item) => item.status !== "done"); return updated.map((item) => ({ ...item, status: item.status === "done" ? "done" as const : item.id === nextPending?.id ? "next" as const : "pending" as const })); }); }

  return <div className="app">
    <header className="topbar"><div className="brand-area"><span className="brand">NEXO</span><span className="brand-subtitle">Assistente Acadêmico</span></div><nav className="desktop-nav"><a href="/">Hoje</a><a className="active" href="/agenda">Agenda</a><a href="/disciplinas">Disciplinas</a><a href="#">Progresso</a></nav><div className="student"><div className="avatar">E</div><div className="student-info"><strong>Estudante</strong><span>Meu semestre</span></div></div></header>
    <main className="main-content">
      <section className="welcome"><div><p className="eyebrow">PLANEJAMENTO ACADÊMICO</p><h1>Sua semana,<br />organizada.</h1><p className="welcome-text">Você não precisa descobrir quando fazer cada coisa.<br />O NEXO distribui o trabalho para você chegar às provas preparado.</p></div></section>
      <section className="agenda-container"><div className="agenda-header"><div><p className="eyebrow">TERÇA-FEIRA · 1 DE SETEMBRO</p><h2>Plano de hoje</h2></div><div className="agenda-summary"><strong>{completed}</strong><span>de {items.length} concluídas</span></div></div>
        <div className="planner-banner"><span>🧠</span><div><strong>Agenda calculada pelo NEXO</strong><p>As tarefas abaixo foram ordenadas pela combinação de urgência, pendências e proximidade das provas.</p></div></div>
        <div className="agenda-timeline">{items.map((item, index) => { const isDone = item.status === "done"; const isNext = item.status === "next"; return <div className={`agenda-item ${isDone ? "done" : ""} ${isNext ? "next" : ""}`} key={item.id}><div className="agenda-time">{item.time}</div><div className="timeline-line"><span className="timeline-dot">{isDone ? "✓" : ""}</span>{index < items.length - 1 && <span className="timeline-connector" />}</div><article className="agenda-card"><div className="agenda-card-top"><div><span className="task-type">{item.type}</span><h3>{item.title}</h3><p>{item.subject}</p></div><span className="agenda-duration">⏱ {item.duration}</span></div><div className="agenda-card-footer">{isNext && <span className="next-badge">PRÓXIMO</span>}{isDone && <span className="done-badge">✓ CONCLUÍDO</span>}{!isDone && <button className="agenda-complete" onClick={() => markDone(item.id)}>Marcar como concluído <span>→</span></button>}</div></article></div>; })}</div>
      </section>
    </main><button className="assistant-button" onClick={() => alert("O Assistente de Estudos será conectado à IA.")}><span className="assistant-sparkle">✨</span><span>Preciso de ajuda</span></button>
  </div>;
}
export default Agenda;
