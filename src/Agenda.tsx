import { useState } from "react";

type AgendaItem = {
  id: number;
  time: string;
  subject: string;
  title: string;
  type: string;
  duration: string;
  status: "next" | "pending" | "done";
};

const initialAgenda: AgendaItem[] = [
  {
    id: 1,
    time: "19:00",
    subject: "Estatística e Probabilidade",
    title: "Aula ao vivo",
    type: "Aula ao vivo",
    duration: "1h30",
    status: "next",
  },
  {
    id: 2,
    time: "20:45",
    subject: "Estatística e Probabilidade",
    title: "Assistir Aula 02",
    type: "Aula da plataforma",
    duration: "35 min",
    status: "pending",
  },
  {
    id: 3,
    time: "21:30",
    subject: "Estatística e Probabilidade",
    title: "Fazer Exercício 01",
    type: "Exercício",
    duration: "20 min",
    status: "pending",
  },
  {
    id: 4,
    time: "22:00",
    subject: "Estatística e Probabilidade",
    title: "Fazer Exercício 02",
    type: "Exercício",
    duration: "20 min",
    status: "pending",
  },
];

function Agenda() {
  const [items, setItems] = useState(initialAgenda);

  function markDone(id: number) {
    setItems((current) => {
      const updated = current.map((item) =>
        item.id === id ? { ...item, status: "done" as const } : item
      );

      const nextPending = updated.find((item) => item.status !== "done");

      return updated.map((item) => ({
        ...item,
        status:
          item.status === "done"
            ? "done"
            : item.id === nextPending?.id
              ? "next"
              : "pending",
      }));
    });
  }

  const completed = items.filter((item) => item.status === "done").length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-area">
          <span className="brand">NEXO</span>
          <span className="brand-subtitle">Assistente Acadêmico</span>
        </div>

        <nav className="desktop-nav">
          <a href="/">Hoje</a>
          <a className="active" href="/agenda">Agenda</a>
          <a href="#">Disciplinas</a>
          <a href="#">Progresso</a>
        </nav>

        <div className="student">
          <div className="avatar">E</div>
          <div className="student-info">
            <strong>Estudante</strong>
            <span>Meu semestre</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <section className="welcome">
          <div>
            <p className="eyebrow">PLANEJAMENTO ACADÊMICO</p>
            <h1>
              Sua semana,
              <br />
              organizada.
            </h1>
            <p className="welcome-text">
              Você não precisa descobrir quando fazer cada coisa.
              <br />
              O NEXO já colocou cada etapa no caminho.
            </p>
          </div>
        </section>

        <section className="agenda-container">
          <div className="agenda-header">
            <div>
              <p className="eyebrow">TERÇA-FEIRA · 1 DE SETEMBRO</p>
              <h2>Hoje</h2>
            </div>
            <div className="agenda-summary">
              <strong>{completed}</strong>
              <span>de {items.length} concluídas</span>
            </div>
          </div>

          <div className="agenda-timeline">
            {items.map((item, index) => {
              const isDone = item.status === "done";
              const isNext = item.status === "next";

              return (
                <div
                  className={`agenda-item ${isDone ? "done" : ""} ${isNext ? "next" : ""}`}
                  key={item.id}
                >
                  <div className="agenda-time">{item.time}</div>

                  <div className="timeline-line">
                    <span className="timeline-dot">{isDone ? "✓" : ""}</span>
                    {index < items.length - 1 && <span className="timeline-connector" />}
                  </div>

                  <article className="agenda-card">
                    <div className="agenda-card-top">
                      <div>
                        <span className="task-type">{item.type}</span>
                        <h3>{item.title}</h3>
                        <p>{item.subject}</p>
                      </div>
                      <span className="agenda-duration">⏱ {item.duration}</span>
                    </div>

                    <div className="agenda-card-footer">
                      {isNext && <span className="next-badge">PRÓXIMO</span>}
                      {isDone && <span className="done-badge">✓ CONCLUÍDO</span>}
                      {!isDone && (
                        <button className="agenda-complete" onClick={() => markDone(item.id)}>
                          Marcar como concluído <span>→</span>
                        </button>
                      )}
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <button className="assistant-button" onClick={() => alert("O Assistente de Estudos será conectado à IA.")}>
        <span className="assistant-sparkle">✨</span>
        <span>Preciso de ajuda</span>
      </button>
    </div>
  );
}

export default Agenda;
