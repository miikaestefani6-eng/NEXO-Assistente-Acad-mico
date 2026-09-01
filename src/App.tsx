import { useState } from "react";

function App() {
  const [completed, setCompleted] = useState(false);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <span className="brand">NEXO</span>
          <span className="brand-subtitle">Assistente Acadêmico</span>
        </div>

        <div className="student">
          <div className="avatar">E</div>
          <span>Estudante</span>
        </div>
      </header>

      <main className="main-content">
        <section className="welcome">
          <p className="eyebrow">TERÇA-FEIRA, 1 DE SETEMBRO</p>

          <h1>
            Olá! 👋
            <br />
            Vamos cuidar do próximo passo.
          </h1>

          <p className="welcome-text">
            Você não precisa decidir o que fazer.
            <br />
            O NEXO já organizou o caminho para você.
          </p>
        </section>

        <section className="mission-card">
          <div className="mission-label">
            <span className="status-dot"></span>
            PRÓXIMA MISSÃO
          </div>

          <div className="mission-time">19:00</div>

          <p className="mission-subject">
            Estatística e Probabilidade
          </p>

          <h2>Aula ao vivo</h2>

          <p className="mission-description">
            Participar da aula ao vivo de Estatística e Probabilidade.
          </p>

          <div className="mission-footer">
            <span>⏱ Aproximadamente 1h30</span>

            <button
              className={completed ? "complete-button completed" : "complete-button"}
              onClick={() => setCompleted(true)}
            >
              {completed ? "✓ Missão concluída" : "Começar →"}
            </button>
          </div>
        </section>

        <section className="next-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DEPOIS DA AULA</p>
              <h2>A seguir</h2>
            </div>

            <span className="progress-text">0 de 3 concluídos</span>
          </div>

          <div className="task-list">
            <div className="task">
              <span className="task-number">01</span>
              <div>
                <strong>Assistir Aula 02</strong>
                <p>Probabilidade Básica · 35 min</p>
              </div>
              <span className="task-arrow">→</span>
            </div>

            <div className="task">
              <span className="task-number">02</span>
              <div>
                <strong>Fazer Exercício 01</strong>
                <p>Estatística e Probabilidade · 20 min</p>
              </div>
              <span className="task-arrow">→</span>
            </div>

            <div className="task">
              <span className="task-number">03</span>
              <div>
                <strong>Fazer Exercício 02</strong>
                <p>Estatística e Probabilidade · 20 min</p>
              </div>
              <span className="task-arrow">→</span>
            </div>
          </div>
        </section>
      </main>

      <button className="assistant-button">
        ✨ <span>Preciso de ajuda</span>
      </button>
    </div>
  );
}

export default App;