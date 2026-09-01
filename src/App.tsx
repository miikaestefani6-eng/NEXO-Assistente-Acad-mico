import { useMemo, useState } from "react";
import { generateDailyMissions } from "./lib/nexo/dailyMissions";
import { buildRecoveryPlan } from "./lib/nexo/planner";
import { applyMissionCompletion, loadAcademicState, saveAcademicState } from "./lib/nexo/academicState";
import { completeCmsActivity, loadCmsActivities, loadCmsEvents, saveCmsActivities, toggleCmsActivityStep, type CmsActivity, type CmsEvent } from "./lib/nexo/cmsState";

type Task = { id: string; cmsId?: string; title: string; subject: string; duration: string; durationMinutes: number; type: string; time: string; description: string; steps: string[]; completed: boolean };

function todayISO() { return new Date().toISOString().slice(0, 10); }

function buildFallbackTasks(): Task[] {
  const state = loadAcademicState();
  return generateDailyMissions(state.map(({ code, name, lessons, lessonsDone, exercises, exercisesDone, assignments, assignmentsDone, daysUntilExam }) => ({ code, name, pendingLessons: lessons - lessonsDone, pendingExercises: exercises - exercisesDone, pendingAssignments: assignments - assignmentsDone, daysUntilExam })), 90).map((mission, index) => ({
    id: mission.id, title: mission.title, subject: mission.subject, duration: `${mission.duration} min`, durationMinutes: mission.duration, type: mission.type, time: index === 0 ? "Agora" : index === 1 ? "Depois" : "A seguir",
    description: mission.priority === "urgente" ? "Prioridade alta: avance nesta missão antes de mudar de disciplina." : "O NEXO colocou esta missão na sequência para manter seu semestre sob controle.",
    steps: mission.type === "Aula" ? ["Abrir a próxima aula pendente", "Assistir ao conteúdo completo", "Anotar os conceitos principais", "Registrar dúvidas", "Marcar a aula como concluída"] : mission.type === "Exercício" ? ["Abrir os próximos exercícios", "Ler todas as questões", "Resolver sem consultar a resposta", "Revisar os resultados", "Enviar a atividade"] : mission.type === "Trabalho" ? ["Abrir a atividade", "Revisar o que precisa ser entregue", "Avançar na produção", "Revisar o material", "Salvar o progresso"] : ["Revisar os pontos fracos", "Conferir dúvidas registradas", "Escolher o conteúdo que precisa de reforço", "Fazer uma revisão curta", "Registrar o próximo passo"], completed: false
  }));
}

function buildTasks(): Task[] {
  const state = loadAcademicState();
  const byCode = new Map(state.map((d) => [d.code, d.name]));
  const today = todayISO();
  const activities = loadCmsActivities().filter((activity) => !activity.done && (!activity.dueDate || activity.dueDate === today));
  const cmsTasks = activities.map((activity, index) => ({
    id: `cms-${activity.id}`, cmsId: activity.id, title: activity.title, subject: byCode.get(activity.disciplineCode) ?? activity.disciplineCode || "Atividade acadêmica",
    duration: `${activity.minutes} min`, durationMinutes: activity.minutes, type: activity.type, time: index === 0 ? "Agora" : "A seguir",
    description: activity.type === "Aula ao vivo" ? "Aula ao vivo cadastrada no CMS. O NEXO separa esse compromisso das aulas da plataforma." : "Atividade cadastrada no CMS e incorporada ao seu próximo passo.",
    steps: activity.checklist.map((step) => step.label), completed: activity.done
  }));
  return cmsTasks.length ? cmsTasks : buildFallbackTasks();
}

function App() {
  const state = loadAcademicState();
  const urgent = [...state].sort((a, b) => a.daysUntilExam - b.daysUntilExam)[0];
  const plan = buildRecoveryPlan({ pendingLessons: urgent ? Math.max(0, urgent.lessons - urgent.lessonsDone) : 0, pendingExercises: urgent ? Math.max(0, urgent.exercises - urgent.exercisesDone) : 0, pendingAssignments: urgent ? Math.max(0, urgent.assignments - urgent.assignmentsDone) : 0, daysUntilExam: urgent?.daysUntilExam ?? 30, availableMinutesPerDay: 90 });
  const [tasks, setTasks] = useState<Task[]>(buildTasks);
  const [stepProgress, setStepProgress] = useState<Record<string, number[]>>(() => Object.fromEntries(tasks.map((task) => [task.id, task.cmsId ? loadCmsActivities().find((a) => a.id === task.cmsId)?.checklist.flatMap((s, i) => s.done ? [i] : []) ?? [] : []])));
  const completedTasks = tasks.filter((task) => task.completed).length;
  const progress = useMemo(() => tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100), [completedTasks, tasks.length]);
  const currentTask = tasks.find((task) => !task.completed) ?? null;
  const todayEvents = loadCmsEvents().filter((event) => event.date === todayISO()).sort((a, b) => a.time.localeCompare(b.time));

  function toggleStep(taskId: string, stepIndex: number) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    setStepProgress((current) => { const existing = current[taskId] ?? []; const updated = existing.includes(stepIndex) ? existing.filter((index) => index !== stepIndex) : [...existing, stepIndex]; return { ...current, [taskId]: updated }; });
    if (task.cmsId) {
      const activity = loadCmsActivities().find((item) => item.id === task.cmsId);
      const step = activity?.checklist[stepIndex];
      if (step) {
        const next = toggleCmsActivityStep(task.cmsId, step.id);
        const updated = next.find((item) => item.id === task.cmsId);
        if (updated?.done) setTasks((current) => current.map((item) => item.id === taskId ? { ...item, completed: true } : item));
      }
    }
  }

  function completeTask(id: string) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const completedSteps = stepProgress[id] ?? [];
    if (completedSteps.length < task.steps.length) return;
    if (task.cmsId) {
      completeCmsActivity(task.cmsId);
    } else {
      const updatedState = applyMissionCompletion(loadAcademicState(), id);
      saveAcademicState(updatedState);
    }
    setTasks((current) => current.map((item) => item.id === id ? { ...item, completed: true } : item));
  }

  const currentCompletedSteps = currentTask ? (stepProgress[currentTask.id] ?? []).length : 0;
  const currentTotalSteps = currentTask ? currentTask.steps.length : 0;
  const checklistComplete = currentTask !== null && currentCompletedSteps === currentTotalSteps;

  return <div className="app"><header className="topbar"><div className="brand-area"><span className="brand">NEXO</span><span className="brand-subtitle">Assistente Acadêmico</span></div><nav className="desktop-nav"><a className="active" href="/">Hoje</a><a href="/agenda">Agenda</a><a href="/disciplinas">Disciplinas</a><a href="/progresso">Progresso</a></nav><div className="student"><div className="avatar">E</div><div className="student-info"><strong>Estudante</strong><span>Meu semestre</span></div></div></header><main className="main-content"><section className="welcome"><div><p className="eyebrow">TERÇA-FEIRA · 1 DE SETEMBRO</p><h1>Olá! 👋<br />Vamos cuidar do próximo passo.</h1><p className="welcome-text">Você não precisa decidir o que estudar agora.<br />O NEXO já organizou o seu caminho.</p></div><div className="day-progress"><div className="progress-circle"><span>{progress}%</span></div><div><strong>Progresso de hoje</strong><span>{completedTasks} de {tasks.length} missões</span></div></div></section><section className="dashboard-grid"><div className="mission-column"><div className="mission-header"><div><p className="eyebrow">SEU PRÓXIMO PASSO</p><h2>Agora</h2></div><span className="mission-count">{completedTasks}/{tasks.length}</span></div>{currentTask ? <article className="mission-card"><div className="mission-top"><div className="mission-label"><span className="status-dot"></span>{currentTask.type}</div><span className="mission-time">{currentTask.time}</span></div><div className="mission-content"><p className="mission-subject">{currentTask.subject}</p><h3>{currentTask.title}</h3><p className="mission-description">{currentTask.description}</p><div className="mission-checklist"><div className="checklist-header"><span>Checklist</span><span>{currentCompletedSteps}/{currentTotalSteps}</span></div><div className="checklist-progress"><div style={{ width: currentTotalSteps === 0 ? "0%" : `${(currentCompletedSteps / currentTotalSteps) * 100}%` }} /></div><div className="checklist-items">{currentTask.steps.map((step, index) => { const checked = (stepProgress[currentTask.id] ?? []).includes(index); return <button key={`${currentTask.id}-${index}`} className={checked ? "checklist-item checked" : "checklist-item"} onClick={() => toggleStep(currentTask.id, index)}><span className="check-box">{checked ? "✓" : ""}</span><span>{step}</span></button>; })}</div></div></div><div className="mission-footer"><span className="duration">⏱ {currentTask.duration}</span><button className={checklistComplete ? "complete-button" : "complete-button disabled"} onClick={() => completeTask(currentTask.id)} disabled={!checklistComplete}>{checklistComplete ? "Concluir missão" : "Complete o checklist"}<span>→</span></button></div></article> : <article className="mission-card mission-complete"><div className="success-icon">✓</div><h3>Você terminou tudo por hoje.</h3><p>Excelente. Amanhã o NEXO prepara o próximo passo.</p></article>}<div className="after-section"><div className="section-heading"><div><p className="eyebrow">DEPOIS</p><h2>A seguir</h2></div></div><div className="task-list">{tasks.filter((task) => !task.completed).slice(1).map((task, index) => <div className="task" key={task.id}><span className="task-number">{String(index + 1).padStart(2, "0")}</span><div className="task-main"><span className="task-type">{task.type}</span><strong>{task.title}</strong><p>{task.subject} · {task.duration}</p></div><span className="task-arrow">→</span></div>)}</div></div></div><aside className="sidebar"><div className="side-card"><div className="side-card-header"><span className="side-icon">◷</span><div><p className="eyebrow">HOJE</p><h3>Seu dia</h3></div></div><div className="day-stat"><strong>{completedTasks}</strong><span>concluídas</span></div><div className="day-stat"><strong>{tasks.length - completedTasks}</strong><span>restantes</span></div></div>{todayEvents.length > 0 && <div className="side-card"><p className="eyebrow">AULAS AO VIVO HOJE</p>{todayEvents.map((event: CmsEvent) => <div key={event.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}><strong style={{ display: "block" }}>{event.time} · {event.title}</strong><span style={{ fontSize: 12, color: "var(--muted)" }}>{event.kind}</span></div>)}</div>}{urgent && <div className="side-card exam-card"><p className="eyebrow">PRÓXIMA PROVA</p><h3>{urgent.name}</h3><div className="exam-date"><strong>{urgent.exam.split(" ")[0] || "—"}</strong><span>{urgent.exam.split(" ")[1] || ""}</span></div><p className="exam-warning">{plan.daysToExam} dias para se preparar</p><p className="planner-note">Plano: {plan.dailyLessons} aula/dia · {plan.dailyExercises} exercício/dia</p><a className="secondary-button" href="/agenda">Ver plano de preparação</a></div>}{urgent && <div className="alert-card"><span className="alert-icon">!</span><div><strong>Atenção</strong><p>{Math.max(0, urgent.exercises - urgent.exercisesDone)} exercícios pendentes em {urgent.name}.</p></div></div>}</aside></section></main><button className="assistant-button" onClick={() => alert("O Assistente de Estudos será conectado à IA nesta próxima etapa.")}><span className="assistant-sparkle">✨</span><span>Preciso de ajuda</span></button></div>;
}
export default App;
