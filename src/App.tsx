import { useMemo, useState } from "react";

type Task = {
  id: number;
  title: string;
  subject: string;
  duration: string;
  type: string;
  completed: boolean;
};

function App() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 1,
      title: "Participar da aula ao vivo",
      subject: "Estatística e Probabilidade",
      duration: "1h30",
      type: "Aula ao vivo",
      completed: false,
    },
    {
      id: 2,
      title: "Assistir Aula 02",
      subject: "Estatística e Probabilidade",
      duration: "35 min",
      type: "Aula da plataforma",
      completed: false,
    },
    {
      id: 3,
      title: "Fazer Exercício 01",
      subject: "Estatística e Probabilidade",
      duration: "20 min",
      type: "Exercício",
      completed: false,
    },
    {
      id: 4,
      title: "Fazer Exercício 02",
      subject: "Estatística e Probabilidade",
      duration: "20 min",
      type: "Exercício",
      completed: false,
    },
  ]);

  const completedTasks = tasks.filter((task) => task.completed).length;

  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((completedTasks / tasks.length) * 100);
  }, [completedTasks, tasks.length]);

  const currentTask =
    tasks.find((task) => !task.completed) ?? null;

  function completeTask(id: number) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? { ...task, completed: true }
          : task
      )
    );
  }

  return (
    <div className="app">

      {/* HEADER */}
      <header className="topbar">
        <div className="brand-area">
          <span className="brand">NEXO</span>
          <span className="brand-subtitle">
            Assistente Acadêmico
          </span>
        </div>

        <nav className="desktop-nav">
          <a className="active" href="#">
            Hoje
          </a>
          <a href="#">Agenda</a>
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

      {/* MAIN */}
      <main className="main-content">

        {/* WELCOME */}
        <section className="welcome">
          <div>
            <p className="eyebrow">
              TERÇA-FEIRA · 1 DE SETEMBRO
            </p>

            <h1>
              Olá! 👋
              <br />
              Vamos cuidar do próximo passo.
            </h1>

            <p className="welcome-text">
              Você não precisa decidir o que estudar agora.
              <br />
              O NEXO já organizou o seu caminho.
            </p>
          </div>

          <div className="day-progress">
            <div className="progress-circle">
              <span>{progress}%</span>
            </div>

            <div>
              <strong>Progresso de hoje</strong>
              <span>
                {completedTasks} de {tasks.length} missões
              </span>
            </div>
          </div>
        </section>

        {/* DASHBOARD GRID */}
        <section className="dashboard-grid">

          {/* MAIN MISSION */}
          <div className="mission-column">

            <div className="mission-header">
              <div>
                <p className="eyebrow">SEU PRÓXIMO PASSO</p>
                <h2>Agora</h2>
              </div>

              <span className="mission-count">
                {completedTasks}/{tasks.length}
              </span>
            </div>

            {currentTask ? (
              <article className="mission-card">

                <div className="mission-top">
                  <div className="mission-label">
                    <span className="status-dot"></span>
                    {currentTask.type}
                  </div>

                  <span className="mission-time">
                    19:00
                  </span>
                </div>

                <div className="mission-content">
                  <p className="mission-subject">
                    {currentTask.subject}
                  </p>

                  <h3>{currentTask.title}</h3>

                  <p className="mission-description">
                    Este é o seu próximo passo.
                    Concentre-se apenas nele.
                    O NEXO cuida do que vem depois.
                  </p>
                </div>

                <div className="mission-footer">
                  <span className="duration">
                    ⏱ {currentTask.duration}
                  </span>

                  <button
                    className="complete-button"
                    onClick={() => completeTask(currentTask.id)}
                  >
                    Concluir missão
                    <span>→</span>
                  </button>
                </div>

              </article>
            ) : (
              <article className="mission-card mission-complete">
                <div className="success-icon">✓</div>

                <h3>
                  Você terminou tudo por hoje.
                </h3>

                <p>
                  Excelente. Amanhã o NEXO prepara
                  o próximo passo.
                </p>
              </article>
            )}

            {/* AFTER */}
            <div className="after-section">

              <div className="section-heading">
                <div>
                  <p className="eyebrow">DEPOIS</p>
                  <h2>A seguir</h2>
                </div>
              </div>

              <div className="task-list">

                {tasks
                  .filter((task) => !task.completed)
                  .slice(1)
                  .map((task, index) => (
                    <div
                      className="task"
                      key={task.id}
                    >
                      <span className="task-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className="task-main">
                        <span className="task-type">
                          {task.type}
                        </span>

                        <strong>
                          {task.title}
                        </strong>

                        <p>
                          {task.subject} · {task.duration}
                        </p>
                      </div>

                      <span className="task-arrow">
                        →
                      </span>
                    </div>
                  ))}

              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <aside className="sidebar">

            {/* TODAY */}
            <div className="side-card">
              <div className="side-card-header">
                <span className="side-icon">◷</span>

                <div>
                  <p className="eyebrow">
                    HOJE
                  </p>

                  <h3>
                    Seu dia
                  </h3>
                </div>
              </div>

              <div className="day-stat">
                <strong>
                  {completedTasks}
                </strong>

                <span>
                  concluídas
                </span>
              </div>

              <div className="day-stat">
                <strong>
                  {tasks.length - completedTasks}
                </strong>

                <span>
                  restantes
                </span>
              </div>
            </div>

            {/* NEXT EXAM */}
            <div className="side-card exam-card">

              <p className="eyebrow">
                PRÓXIMA PROVA
              </p>

              <h3>
                Estatística e
                Probabilidade
              </h3>

              <div className="exam-date">
                <strong>
                  15
                </strong>

                <span>
                  SET
                </span>
              </div>

              <p className="exam-warning">
                14 dias para se preparar
              </p>

              <button className="secondary-button">
                Ver plano de preparação
              </button>

            </div>

            {/* ALERT */}
            <div className="alert-card">

              <span className="alert-icon">
                !
              </span>

              <div>
                <strong>
                  Atenção
                </strong>

                <p>
                  Você tem 14 exercícios
                  pendentes nesta disciplina.
                </p>
              </div>

            </div>

          </aside>

        </section>
      </main>

      {/* AI ASSISTANT */}
      <button
        className="assistant-button"
        onClick={() =>
          alert(
            "O Assistente de Estudos será conectado à IA nesta próxima etapa."
          )
        }
      >
        <span className="assistant-sparkle">
          ✨
        </span>

        <span>
          Preciso de ajuda
        </span>
      </button>

    </div>
  );
}

export default App;