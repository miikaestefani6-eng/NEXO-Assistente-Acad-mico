import { useState } from "react";
import { buildRecoveryPlan } from "./lib/nexo/planner";

type Discipline = {
  name: string; code: string; lessons: number; lessonsDone: number; exercises: number; exercisesDone: number;
  assignments: number; assignmentsDone: number; exam: string; daysUntilExam: number; urgency: "Alta" | "Média" | "Baixa"; accent: string;
};

const disciplines: Discipline[] = [
  { name: "Estatística e Probabilidade", code: "EST-PROB", lessons: 14, lessonsDone: 1, exercises: 14, exercisesDone: 0, assignments: 4, assignmentsDone: 0, exam: "15 SET", daysUntilExam: 14, urgency: "Alta", accent: "lagoon" },
  { name: "Cálculo II", code: "CALC-II", lessons: 12, lessonsDone: 3, exercises: 17, exercisesDone: 4, assignments: 3, assignmentsDone: 1, exam: "22 SET", daysUntilExam: 21, urgency: "Alta", accent: "coral" },
  { name: "Fundamentos da Administração", code: "ADM-FUND", lessons: 10, lessonsDone: 6, exercises: 17, exercisesDone: 11, assignments: 2, assignmentsDone: 1, exam: "29 SET", daysUntilExam: 28, urgency: "Média", accent: "sand" },
];

function percent(done: number, total: number) { return total === 0 ? 0 : Math.round((done / total) * 100); }

function Disciplinas() {
  const [selected, setSelected] = useState<Discipline | null>(null);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-area"><span className="brand">NEXO</span><span className="brand-subtitle">Assistente Acadêmico</span></div>
        <nav className="desktop-nav"><a href="/">Hoje</a><a href="/agenda">Agenda</a><a className="active" href="/disciplinas">Disciplinas</a><a href="#">Progresso</a></nav>
        <div className="student"><div className="avatar">E</div><div className="student-info"><strong>Estudante</strong><span>Meu semestre</span></div></div>
      </header>

      <main className="main-content">
        <section className="page-hero"><div><p className="eyebrow">VISÃO ACADÊMICA</p><h1>Suas disciplinas.</h1><p className="welcome-text">Cada matéria tem um caminho. O NEXO organiza o que precisa ser feito e aponta onde sua atenção é mais necessária.</p></div><div className="hero-stat"><strong>3</strong><span>disciplinas ativas</span></div></section>

        <section className="discipline-grid">
          {disciplines.map((discipline) => {
            const totalItems = discipline.lessons + discipline.exercises + discipline.assignments;
            const doneItems = discipline.lessonsDone + discipline.exercisesDone + discipline.assignmentsDone;
            const progress = percent(doneItems, totalItems); const pending = totalItems - doneItems;
            return <article className={`discipline-card ${discipline.accent}`} key={discipline.code}>
              <div className="discipline-card-top"><span className={`urgency ${discipline.urgency.toLowerCase()}`}>{discipline.urgency}</span><span className="discipline-code">{discipline.code}</span></div>
              <h2>{discipline.name}</h2>
              <div className="discipline-progress-row"><div className="progress-track"><div style={{ width: `${progress}%` }} /></div><strong>{progress}%</strong></div>
              <div className="discipline-stats"><div><strong>{discipline.lessonsDone}/{discipline.lessons}</strong><span>Aulas</span></div><div><strong>{discipline.exercisesDone}/{discipline.exercises}</strong><span>Exercícios</span></div><div><strong>{discipline.assignmentsDone}/{discipline.assignments}</strong><span>Trabalhos</span></div></div>
              <div className="discipline-footer"><div><span>Próxima prova</span><strong>{discipline.exam}</strong></div><div><span>Pendências</span><strong>{pending}</strong></div></div>
              <button className="discipline-button" onClick={() => setSelected(discipline)}>Ver plano <span>→</span></button>
            </article>;
          })}
        </section>

        {selected && (() => {
          const plan = buildRecoveryPlan({
            pendingLessons: selected.lessons - selected.lessonsDone,
            pendingExercises: selected.exercises - selected.exercisesDone,
            pendingAssignments: selected.assignments - selected.assignmentsDone,
            daysUntilExam: selected.daysUntilExam,
            availableMinutesPerDay: 90,
          });
          return <section className="plan-panel">
            <div className="plan-panel-head"><div><p className="eyebrow">PLANO GERADO PELO NEXO</p><h2>{selected.name}</h2></div><button className="close-plan" onClick={() => setSelected(null)}>×</button></div>
            <div className="plan-highlight"><span>🎯</span><div><strong>Prioridade {plan.priority}</strong><p>{plan.message}</p></div><b>{plan.recommendedMinutes} min/dia</b></div>
            <div className="plan-steps">
              <div className="plan-step"><span>01</span><div><strong>Conteúdo: {plan.dailyLessons} aula(s) por dia</strong><p>Primeiro avance no conteúdo pendente para liberar os exercícios.</p></div><b>Agora</b></div>
              <div className="plan-step"><span>02</span><div><strong>Fixação: {plan.dailyExercises} exercício(s) por dia</strong><p>Resolva os exercícios relacionados ao conteúdo estudado.</p></div><b>Depois</b></div>
              <div className="plan-step"><span>03</span><div><strong>Entregas: {plan.dailyAssignments} trabalho(s) por dia</strong><p>O NEXO distribui as entregas para evitar concentração perto da prova.</p></div><b>Revisão</b></div>
            </div>
          </section>;
        })()}
      </main>
      <button className="assistant-button" onClick={() => alert("O Assistente de Estudos será conectado à IA nesta próxima etapa.")}><span className="assistant-sparkle">✨</span><span>Preciso de ajuda</span></button>
    </div>
  );
}

export default Disciplinas;
