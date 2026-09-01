import { useMemo, useState } from "react";

type Task = {
  id: number;
  title: string;
  subject: string;
  duration: string;
  type: string;
  time: string;
  description: string;
  steps: string[];
  completed: boolean;
};

function App() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: "Participar da aula ao vivo", subject: "Estatística e Probabilidade", duration: "1h30", type: "Aula ao vivo", time: "19:00", description: "Participe da aula ao vivo e acompanhe o conteúdo apresentado pelo professor.", steps: ["Entrar na aula às 19:00", "Assistir à aula completa", "Fazer anotações importantes", "Marcar as dúvidas que surgirem", "Encerrar a aula somente após a conclusão"], completed: false },
    { id: 2, title: "Assistir Aula 02", subject: "Estatística e Probabilidade", duration: "35 min", type: "Aula da plataforma", time: "20:45", description: "Avance no conteúdo da plataforma antes de começar os exercícios.", steps: ["Abrir a Aula 02", "Assistir ao conteúdo completo", "Anotar os conceitos principais", "Registrar dúvidas", "Marcar a aula como concluída"], completed: false },
    { id: 3, title: "Fazer Exercício 01", subject: "Estatística e Probabilidade", duration: "20 min", type: "Exercício", time: "21:30", description: "Coloque em prática o conteúdo estudado na aula.", steps: ["Abrir o exercício", "Ler todas as questões", "Resolver sem consultar a resposta", "Revisar as respostas", "Enviar a atividade"], completed: false },
    { id: 4, title: "Fazer Exercício 02", subject: "Estatística e Probabilidade", duration: "20 min", type: "Exercício", time: "22:00", description: "Continue a sequência de exercícios da disciplina.", steps: ["Abrir o exercício", "Resolver as questões", "Revisar os resultados", "Corrigir os erros", "Enviar a atividade"], completed: false },
  ]);

  const [stepProgress, setStepProgress] = useState<Record<number, number[]>>({});
  const completedTasks = tasks.filter((task) => task.completed).length;
  const progress = useMemo(() => tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100), [completedTasks, tasks.length]);
  const currentTask = tasks.find((task) => !task.completed) ?? null;

  function toggleStep(taskId: number, stepIndex: number) {
    setStepProgress((current) => {
      const existing = current[taskId] ?? [];
      const updated = existing.includes(stepIndex) ? existing.filter((index) => index !== stepIndex) : [...existing, stepIndex];
      return { ...current, [taskId]: updated };
    });
  }

  function completeTask(id: number) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const completedSteps = stepProgress[id] ?? [];
    if (completedSteps.length < task.steps.length) return;
    setTasks((current) => current.map((item) => item.id === id ? { ...item, completed: true } : item));
  }

  const currentCompletedSteps = currentTask ? (stepProgress[currentTask.id] ?? []).length : 0;
  const currentTotalSteps = currentTask ? currentTask.steps.length : 0;
  const checklistComplete = currentTask !== null && currentCompletedSteps === currentTotalSteps;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-area"><span className="brand">NEXO</span><span className="brand-subtitle">Assistente Acadêmico</span></div>
        <nav className="desktop-nav">
          <a className="active" href="/">Hoje</a>
          <a href="/agenda">Agenda</a>
          <a href="#">Disciplinas</a>
          <a href="#">Progresso</a>
        </nav>
        <div className="student"><div className="avatar">E</div><div className="student-info"><strong>Estudante</strong><span>Meu semestre</span></div></div>
      </header>

      <main className="main-content">
        <section className="welcome">
          <div>
            <p className="eyebrow">TERÇA-FEIRA · 1 DE SETEMBRO</p>
            <h1>Olá! 👋<br />Vamos cuidar do próximo passo.</h1>
            <p className="welcome-text">Você não precisa decidir o que estudar agora.<br />O NEXO já organizou o seu caminho.</p>
          </div>
          <div className="day-progress"><div className="progress-circle"><span>{progress}%</span></div><div><strong>Progresso de hoje</strong><span>{completedTasks} de {tasks.length} missões</span></div></div>
        </section>

        <section className="dashboard-grid">
          <div className="mission-column">
            <div className="mission-header"><div><p className="eyebrow">SEU PRÓXIMO PASSO</p><h2>Agora</h2></div><span className="mission-count">{completedTasks}/{tasks.length}</span></div>

            {currentTask ? (
              <article className="mission-card">
                <div className="mission-top"><div className="mission-label"><span className="status-dot"></span>{currentTask.type}</div><span className="mission-time">{currentTask.time}</span></div>
                <div className="mission-content">
                  <p className="mission-subject">{currentTask.subject}</p><h3>{currentTask.title}</h3><p className="mission-description">{currentTask.description}</p>
                  <div className="mission-checklist">
                    <div className="checklist-header"><span>Checklist</span><span>{currentCompletedSteps}/{currentTotalSteps}</span></div>
                    <div className="checklist-progress"><div style={{ width: currentTotalSteps === 0 ? "0%" : `${(currentCompletedSteps / currentTotalSteps) * 100}%` }} /></div>
                    <div className="checklist-items">
                      {currentTask.steps.map((step, index) => {
                        const checked = (stepProgress[currentTask.id] ?? []).includes(index);
                        return <button key={step} className={checked ? "checklist-item checked" : "checklist-item"} onClick={() => toggleStep(currentTask.id, index)}><span className="check-box">{checked ? "✓" : ""}</span><span>{step}</span></button>;
                      })}
                    </div>
                  </div>
                </div>
                <div className="mission-footer"><span className="duration">⏱ {currentTask.duration}</span><button className={checklistComplete ? "complete-button" : "complete-button disabled"} onClick={() => completeTask(currentTask.id)} disabled={!checklistComplete}>{checklistComplete ? "Concluir missão" : "Complete o checklist"}<span>→</span></button></div>
              </article>
            ) : (
              <article className="mission-card mission-complete"><div className="success-icon">✓</div><h3>Você terminou tudo por hoje.</h3><p>Excelente. Amanhã o NEXO prepara o próximo passo.</p></article>
            )}

            <div className="after-section"><div className="section-heading"><div><p className="eyebrow">DEPOIS</p><h2>A seguir</h2></div></div><div className="task-list">
              {tasks.filter((task) => !task.completed).slice(1).map((task, index) => <div className="task" key={task.id}><span className="task-number">{String(index + 1).padStart(2, "0")}</span><div className="task-main"><span className="task-type">{task.type}</span><strong>{task.title}</strong><p>{task.subject} · {task.duration}</p></div><span className="task-arrow">→</span></div>)}
            </div></div>
          </div>

          <aside className="sidebar">
            <div className="side-card"><div className="side-card-header"><span className="side-icon">◷</span><div><p className="eyebrow">HOJE</p><h3>Seu dia</h3></div></div><div className="day-stat"><strong>{completedTasks}</strong><span>concluídas</span></div><div className="day-stat"><strong>{tasks.length - completedTasks}</strong><span>restantes</span></div></div>
            <div className="side-card exam-card"><p className="eyebrow">PRÓXIMA PROVA</p><h3>Estatística e Probabilidade</h3><div className="exam-date"><strong>15</strong><span>SET</span></div><p className="exam-warning">14 dias para se preparar</p><button className="secondary-button">Ver plano de preparação</button></div>
            <div className="alert-card"><span className="alert-icon">!</span><div><strong>Atenção</strong><p>Você tem 14 exercícios pendentes nesta disciplina.</p></div></div>
          </aside>
        </section>
      </main>

      <button className="assistant-button" onClick={() => alert("O Assistente de Estudos será conectado à IA nesta próxima etapa.")}><span className="assistant-sparkle">✨</span><span>Preciso de ajuda</span></button>
    </div>
  );
}

export default App;
