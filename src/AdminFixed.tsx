import { useMemo, useState, type CSSProperties } from "react";
import { defaultAcademicState, loadAcademicState, saveAcademicState, type AcademicDiscipline } from "./lib/nexo/academicState";

type ActivityType = "Aula da plataforma" | "Aula ao vivo" | "Exercício" | "Trabalho" | "Revisão";
type ChecklistItem = { id: string; label: string; done: boolean };
type Activity = { id: string; title: string; disciplineCode: string; type: ActivityType; dueDate: string; minutes: number; done: boolean; checklist: ChecklistItem[] };
type EventItem = { id: string; title: string; date: string; time: string; disciplineCode: string; kind: "Aula ao vivo" | "Prova" | "Entrega" | "Outro" };
type EditableDiscipline = AcademicDiscipline & { examDate?: string };

const ACTIVITY_KEY = "nexo-admin-activities";
const EVENT_KEY = "nexo-admin-events";

function read<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return fallback;
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* mantém a sessão utilizável */ }
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function daysUntil(date: string) {
  if (!date) return 0;
  const target = new Date(`${date}T12:00:00`);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / 86400000));
}
function emptyDiscipline(): EditableDiscipline {
  return { code: "", name: "", lessons: 0, lessonsDone: 0, exercises: 0, exercisesDone: 0, assignments: 0, assignmentsDone: 0, exam: "", daysUntilExam: 0, examDate: "" };
}
function checklistFor(type: ActivityType): ChecklistItem[] {
  const labels: Record<ActivityType, string[]> = {
    "Aula da plataforma": ["Assistir à aula", "Fazer anotações", "Marcar a aula como concluída", "Registrar exercícios ou dúvidas relacionados"],
    "Aula ao vivo": ["Verificar horário e acesso", "Participar da aula ao vivo", "Fazer anotações", "Registrar pendências e dúvidas"],
    "Exercício": ["Fazer os exercícios", "Corrigir e conferir o resultado", "Registrar dúvidas"],
    "Trabalho": ["Ler o enunciado", "Desenvolver o trabalho", "Revisar", "Entregar"],
    "Revisão": ["Revisar o conteúdo", "Fazer recuperação ativa", "Registrar dúvidas"],
  };
  return labels[type].map((label, index) => ({ id: `${type}-${index}`, label, done: false }));
}
function normalizeActivity(item: Partial<Activity>, disciplines: AcademicDiscipline[]): Activity {
  const type: ActivityType = ["Aula da plataforma", "Aula ao vivo", "Exercício", "Trabalho", "Revisão"].includes(item.type as string) ? item.type as ActivityType : "Aula da plataforma";
  const checklist = Array.isArray(item.checklist) && item.checklist.length ? item.checklist.map((x, i) => ({ id: x.id || `${type}-${i}`, label: x.label || "Etapa", done: Boolean(x.done) })) : checklistFor(type);
  return {
    id: item.id || `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: String(item.title || ""),
    disciplineCode: item.disciplineCode || disciplines[0]?.code || "",
    type,
    dueDate: item.dueDate || todayISO(),
    minutes: Math.max(5, Number(item.minutes) || 30),
    done: Boolean(item.done),
    checklist,
  };
}

export default function AdminFixed() {
  const [tab, setTab] = useState<"overview" | "disciplines" | "activities" | "agenda">("overview");
  const [disciplines, setDisciplines] = useState<AcademicDiscipline[]>(() => loadAcademicState());
  const [activities, setActivities] = useState<Activity[]>(() => {
    const raw = read<Partial<Activity>[]>(ACTIVITY_KEY, []);
    return Array.isArray(raw) ? raw.map((item) => normalizeActivity(item, loadAcademicState())) : [];
  });
  const [events, setEvents] = useState<EventItem[]>(() => {
    const raw = read<EventItem[]>(EVENT_KEY, []);
    return Array.isArray(raw) ? raw : [];
  });
  const [editing, setEditing] = useState<EditableDiscipline | null>(null);
  const [activity, setActivity] = useState<Activity>(() => normalizeActivity({ type: "Aula da plataforma" }, loadAcademicState()));
  const [event, setEvent] = useState<EventItem>(() => ({ id: "", title: "", date: todayISO(), time: "19:00", disciplineCode: loadAcademicState()[0]?.code || "", kind: "Aula ao vivo" }));
  const [notice, setNotice] = useState("");

  const stats = useMemo(() => ({
    disciplines: disciplines.length,
    activities: activities.filter((a) => !a.done).length,
    events: events.length,
    pending: disciplines.reduce((sum, d) => sum + Math.max(0, d.lessons - d.lessonsDone) + Math.max(0, d.exercises - d.exercisesDone) + Math.max(0, d.assignments - d.assignmentsDone), 0),
  }), [disciplines, activities, events]);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  function saveDiscipline() {
    if (!editing?.code.trim() || !editing.name.trim()) return flash("Informe código e nome da disciplina.");
    const code = editing.code.trim().toUpperCase();
    const clean: AcademicDiscipline = {
      ...editing,
      code,
      name: editing.name.trim(),
      lessons: Math.max(0, Number(editing.lessons) || 0),
      lessonsDone: Math.min(Math.max(0, Number(editing.lessonsDone) || 0), Math.max(0, Number(editing.lessons) || 0)),
      exercises: Math.max(0, Number(editing.exercises) || 0),
      exercisesDone: Math.min(Math.max(0, Number(editing.exercisesDone) || 0), Math.max(0, Number(editing.exercises) || 0)),
      assignments: Math.max(0, Number(editing.assignments) || 0),
      assignmentsDone: Math.min(Math.max(0, Number(editing.assignmentsDone) || 0), Math.max(0, Number(editing.assignments) || 0)),
      daysUntilExam: daysUntil(editing.examDate || ""),
    };
    const exists = disciplines.some((d) => d.code === code);
    const next = exists ? disciplines.map((d) => d.code === code ? clean : d) : [...disciplines, clean];
    setDisciplines(next); saveAcademicState(next); setEditing(null);
    if (!activity.disciplineCode) setActivity((current) => ({ ...current, disciplineCode: code }));
    flash("Disciplina salva. O planejamento já usa os novos dados.");
  }

  function removeDiscipline(code: string) {
    if (!window.confirm("Excluir esta disciplina? As atividades vinculadas também serão removidas.")) return;
    const next = disciplines.filter((d) => d.code !== code);
    setDisciplines(next); saveAcademicState(next);
    const filtered = activities.filter((a) => a.disciplineCode !== code);
    setActivities(filtered); write(ACTIVITY_KEY, filtered);
    flash("Disciplina removida.");
  }

  function changeActivityType(type: ActivityType) {
    setActivity((current) => ({ ...current, type, checklist: checklistFor(type), done: false }));
  }

  function saveActivity() {
    const title = activity.title.trim();
    const disciplineCode = activity.disciplineCode || disciplines[0]?.code || "";
    if (!title) return flash("Informe o título da atividade.");
    if (!disciplineCode) return flash("Cadastre uma disciplina antes de adicionar atividades.");
    if (!activity.dueDate) return flash("Informe o prazo da atividade.");
    const item: Activity = normalizeActivity({ ...activity, title, disciplineCode, minutes: Number(activity.minutes) }, disciplines);
    const next = activity.id ? activities.map((a) => a.id === item.id ? item : a) : [...activities, item];
    setActivities(next); write(ACTIVITY_KEY, next);
    setActivity(normalizeActivity({ type: "Aula da plataforma", disciplineCode }, disciplines));
    flash("Atividade salva com sucesso.");
  }

  function toggleChecklist(activityId: string, itemId: string) {
    const next = activities.map((a) => {
      if (a.id !== activityId) return a;
      const checklist = a.checklist.map((item) => item.id === itemId ? { ...item, done: !item.done } : item);
      return { ...a, checklist, done: checklist.every((item) => item.done) };
    });
    setActivities(next); write(ACTIVITY_KEY, next);
  }

  function deleteActivity(id: string) {
    const next = activities.filter((a) => a.id !== id);
    setActivities(next); write(ACTIVITY_KEY, next); flash("Atividade removida.");
  }

  function saveEvent() {
    if (!event.title.trim() || !event.date || !event.time) return flash("Informe título, data e horário.");
    const item: EventItem = { ...event, id: event.id || `event-${Date.now()}`, title: event.title.trim() };
    const next = event.id ? events.map((e) => e.id === item.id ? item : e) : [...events, item];
    next.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    setEvents(next); write(EVENT_KEY, next);
    setEvent({ id: "", title: "", date: todayISO(), time: "19:00", disciplineCode: disciplines[0]?.code || "", kind: "Aula ao vivo" });
    flash("Evento salvo na agenda.");
  }

  function resetDemo() {
    if (!window.confirm("Voltar aos dados iniciais? Isso substitui as alterações feitas neste navegador.")) return;
    setDisciplines(defaultAcademicState); saveAcademicState(defaultAcademicState);
    setActivities([]); write(ACTIVITY_KEY, []);
    setEvents([]); write(EVENT_KEY, []);
    setActivity(normalizeActivity({ type: "Aula da plataforma", disciplineCode: defaultAcademicState[0]?.code }, defaultAcademicState));
    flash("Dados iniciais restaurados.");
  }

  const field = (label: string, value: string | number, onChange: (value: string) => void, type = "text") => (
    <label style={labelStyle}><span>{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} /></label>
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-area"><span className="brand">NEXO</span><span className="brand-subtitle">CMS · Administração</span></div>
        <nav className="desktop-nav"><a href="/">Hoje</a><a href="/agenda">Agenda</a><a href="/disciplinas">Disciplinas</a><a href="/progresso">Progresso</a></nav>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 11, color: "var(--muted)" }}>Painel de conteúdo</span><a href="/" style={{ fontSize: 12, fontWeight: 700, color: "var(--lagoon)" }}>Sair →</a></div>
      </header>
      <main className="main-content" style={{ maxWidth: 1240 }}>
        <section className="welcome" style={{ alignItems: "flex-start" }}>
          <div><p className="eyebrow">CENTRAL DE ADMINISTRAÇÃO</p><h1 style={{ fontSize: "clamp(32px, 5vw, 50px)" }}>Coloque o NEXO para funcionar.</h1><p className="welcome-text">Cadastre disciplinas, aulas da plataforma, aulas ao vivo, atividades, provas e compromissos. O planejamento usa estes dados.</p></div>
          <button onClick={resetDemo} style={dangerButton}>Restaurar dados de demonstração</button>
        </section>
        <div style={tabBar}>{([['overview','Visão geral'],['disciplines','Disciplinas'],['activities','Atividades'],['agenda','Agenda']] as const).map(([key, label]) => <button key={key} onClick={() => setTab(key)} style={tab === key ? activeTab : tabButton}>{label}</button>)}</div>
        {notice && <div style={noticeStyle}>✓ {notice}</div>}

        {tab === "overview" && <section style={cardGrid}>
          <Stat title="Disciplinas" value={stats.disciplines} text="cadastradas" /><Stat title="Pendências" value={stats.pending} text="itens acadêmicos" /><Stat title="Atividades" value={stats.activities} text="pendentes" /><Stat title="Agenda" value={stats.events} text="eventos" />
          <article style={wideCard}><div><p className="eyebrow">FLUXO DO NEXO</p><h2 style={h2}>Cadastre a realidade acadêmica.</h2><p style={paragraph}>As <b>aulas da plataforma</b> e as <b>aulas ao vivo</b> são diferentes. Cada uma tem seu próprio checklist. O NEXO usa as informações cadastradas para organizar o próximo passo do aluno.</p></div><button style={primaryButton} onClick={() => setTab("activities")}>Cadastrar conteúdo →</button></article>
        </section>}

        {tab === "disciplines" && <section>
          <div style={sectionHeader}><div><p className="eyebrow">BASE ACADÊMICA</p><h2 style={h2}>Disciplinas</h2></div><button style={primaryButton} onClick={() => setEditing(emptyDiscipline())}>+ Nova disciplina</button></div>
          {editing && <div style={formCard}><div style={sectionHeader}><div><p className="eyebrow">EDIÇÃO</p><h3 style={h3}>{disciplines.some((d) => d.code === editing.code) ? "Editar disciplina" : "Nova disciplina"}</h3></div><button style={ghostButton} onClick={() => setEditing(null)}>Cancelar</button></div>
            <div style={formGrid}>{field("Código", editing.code, (v) => setEditing({ ...editing, code: v }))}{field("Nome", editing.name, (v) => setEditing({ ...editing, name: v }))}{field("Total de aulas da plataforma", editing.lessons, (v) => setEditing({ ...editing, lessons: Number(v) }), "number")}{field("Aulas concluídas", editing.lessonsDone, (v) => setEditing({ ...editing, lessonsDone: Number(v) }), "number")}{field("Total de exercícios", editing.exercises, (v) => setEditing({ ...editing, exercises: Number(v) }), "number")}{field("Exercícios concluídos", editing.exercisesDone, (v) => setEditing({ ...editing, exercisesDone: Number(v) }), "number")}{field("Total de trabalhos", editing.assignments, (v) => setEditing({ ...editing, assignments: Number(v) }), "number")}{field("Trabalhos concluídos", editing.assignmentsDone, (v) => setEditing({ ...editing, assignmentsDone: Number(v) }), "number")}{field("Data da próxima prova", editing.examDate || "", (v) => setEditing({ ...editing, exam: v ? new Date(`${v}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).toUpperCase() : "", daysUntilExam: daysUntil(v), examDate: v }), "date")}</div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}><button style={primaryButton} onClick={saveDiscipline}>Salvar disciplina</button></div>
          </div>}
          {disciplines.map((d) => <article key={d.code} style={listCard}><div><span className="task-type">{d.code}</span><h3 style={h3}>{d.name}</h3><p style={paragraph}>{d.lessonsDone}/{d.lessons} aulas da plataforma · {d.exercisesDone}/{d.exercises} exercícios · {d.assignmentsDone}/{d.assignments} trabalhos · prova {d.exam || "não cadastrada"}</p></div><div style={{ display: "flex", gap: 8 }}><button style={ghostButton} onClick={() => setEditing({ ...d, examDate: "" })}>Editar</button><button style={deleteButton} onClick={() => removeDiscipline(d.code)}>Excluir</button></div></article>)}
        </section>}

        {tab === "activities" && <section>
          <div style={sectionHeader}><div><p className="eyebrow">CONTEÚDO E CHECKLISTS</p><h2 style={h2}>Atividades</h2><p style={paragraph}>Agora o CMS diferencia claramente a aula da plataforma da aula ao vivo.</p></div></div>
          <div style={formCard}>
            <div style={formGrid}>{field("Título", activity.title, (v) => setActivity({ ...activity, title: v }))}
              <label style={labelStyle}><span>Disciplina</span><select value={activity.disciplineCode} onChange={(e) => setActivity({ ...activity, disciplineCode: e.target.value })} style={inputStyle}><option value="">Selecione uma disciplina</option>{disciplines.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}</select></label>
              <label style={labelStyle}><span>Tipo de conteúdo</span><select value={activity.type} onChange={(e) => changeActivityType(e.target.value as ActivityType)} style={inputStyle}><option>Aula da plataforma</option><option>Aula ao vivo</option><option>Exercício</option><option>Trabalho</option><option>Revisão</option></select></label>
              {field("Prazo", activity.dueDate, (v) => setActivity({ ...activity, dueDate: v }), "date")}{field("Minutos", activity.minutes, (v) => setActivity({ ...activity, minutes: Number(v) }), "number")}
            </div>
            <div style={checklistBox}><div><p className="eyebrow">CHECKLIST AUTOMÁTICO</p><h3 style={h3}>{activity.type}</h3><p style={paragraph}>O NEXO já cria as etapas certas para esse tipo de atividade.</p></div><div style={{ display: "grid", gap: 8 }}>{activity.checklist.map((item) => <label key={item.id} style={checkItem}><input type="checkbox" checked={item.done} onChange={() => setActivity({ ...activity, checklist: activity.checklist.map((x) => x.id === item.id ? { ...x, done: !x.done } : x) })} /><span>{item.label}</span></label>)}</div></div>
            <button style={primaryButton} onClick={saveActivity}>{activity.id ? "Atualizar atividade" : "Cadastrar atividade"}</button>
          </div>
          {activities.length === 0 ? <Empty text="Nenhuma atividade cadastrada ainda." /> : activities.map((a) => <article key={a.id} style={listCard}><div style={{ flex: 1 }}><span className="task-type">{a.type} · {a.dueDate}</span><h3 style={h3}>{a.title}</h3><p style={paragraph}>{disciplines.find((d) => d.code === a.disciplineCode)?.name ?? a.disciplineCode} · {a.minutes} min</p><div style={miniChecklist}>{a.checklist.map((item) => <label key={item.id} style={checkItem}><input type="checkbox" checked={item.done} onChange={() => toggleChecklist(a.id, item.id)} /><span style={{ textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.6 : 1 }}>{item.label}</span></label>)}</div></div><div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><button style={ghostButton} onClick={() => setActivity(a)}>Editar</button><button style={deleteButton} onClick={() => deleteActivity(a.id)}>Excluir</button></div></article>)}
        </section>}

        {tab === "agenda" && <section>
          <div style={sectionHeader}><div><p className="eyebrow">COMPROMISSOS</p><h2 style={h2}>Agenda do semestre</h2><p style={paragraph}>Aulas ao vivo entram aqui como compromissos de horário.</p></div></div>
          <div style={formCard}><div style={formGrid}>{field("Título", event.title, (v) => setEvent({ ...event, title: v }))}{field("Data", event.date, (v) => setEvent({ ...event, date: v }), "date")}{field("Horário", event.time, (v) => setEvent({ ...event, time: v }), "time")}<label style={labelStyle}><span>Disciplina</span><select value={event.disciplineCode} onChange={(e) => setEvent({ ...event, disciplineCode: e.target.value })} style={inputStyle}><option value="">Geral</option>{disciplines.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}</select></label><label style={labelStyle}><span>Tipo</span><select value={event.kind} onChange={(e) => setEvent({ ...event, kind: e.target.value as EventItem["kind"] })} style={inputStyle}><option>Aula ao vivo</option><option>Prova</option><option>Entrega</option><option>Outro</option></select></label></div><button style={primaryButton} onClick={saveEvent}>{event.id ? "Atualizar evento" : "Adicionar à agenda"}</button></div>
          {events.length === 0 ? <Empty text="Nenhum evento cadastrado ainda." /> : events.map((e) => <article key={e.id} style={listCard}><div><span className="task-type">{e.kind} · {e.date} · {e.time}</span><h3 style={h3}>{e.title}</h3><p style={paragraph}>{disciplines.find((d) => d.code === e.disciplineCode)?.name ?? "Geral"}</p></div><div style={{ display: "flex", gap: 8 }}><button style={ghostButton} onClick={() => setEvent(e)}>Editar</button><button style={deleteButton} onClick={() => { const next = events.filter((x) => x.id !== e.id); setEvents(next); write(EVENT_KEY, next); flash("Evento removido."); }}>Excluir</button></div></article>)}
        </section>}
      </main>
    </div>
  );
}

function Stat({ title, value, text }: { title: string; value: number; text: string }) { return <article style={statCard}><span className="eyebrow">{title}</span><strong style={statValue}>{value}</strong><span style={statText}>{text}</span></article>; }
function Empty({ text }: { text: string }) { return <div style={emptyStyle}>{text}</div>; }

const inputStyle: CSSProperties = { width: "100%", border: "1px solid var(--line)", borderRadius: 14, padding: "12px 13px", background: "var(--surface)", color: "var(--ink)", boxSizing: "border-box" };
const labelStyle: CSSProperties = { display: "grid", gap: 6, fontSize: 11, color: "var(--muted)" };
const primaryButton: CSSProperties = { border: 0, borderRadius: 999, padding: "12px 17px", background: "var(--lagoon)", color: "white", fontWeight: 800, cursor: "pointer" };
const dangerButton: CSSProperties = { border: "1px solid #e2b8b8", borderRadius: 999, padding: "10px 14px", background: "transparent", color: "#9b5555", fontWeight: 700, cursor: "pointer" };
const ghostButton: CSSProperties = { border: "1px solid var(--line)", borderRadius: 999, padding: "9px 13px", background: "var(--surface)", color: "var(--ink)", fontWeight: 700, cursor: "pointer" };
const deleteButton: CSSProperties = { ...ghostButton, color: "#9b5555" };
const tabBar: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", margin: "26px 0" };
const tabButton: CSSProperties = { ...ghostButton, borderRadius: 12, color: "var(--muted)" };
const activeTab: CSSProperties = { ...primaryButton, borderRadius: 12 };
const noticeStyle: CSSProperties = { marginBottom: 18, padding: "12px 16px", borderRadius: 14, background: "rgba(50,160,145,.10)", color: "var(--lagoon)", fontWeight: 700 };
const cardGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 };
const statCard: CSSProperties = { padding: 20, border: "1px solid var(--line)", borderRadius: 22, background: "var(--surface)", display: "grid", gap: 5 };
const statValue: CSSProperties = { fontSize: 34, letterSpacing: "-0.04em" };
const statText: CSSProperties = { color: "var(--muted)", fontSize: 12 };
const wideCard: CSSProperties = { gridColumn: "1 / -1", padding: 24, border: "1px solid var(--line)", borderRadius: 24, background: "var(--surface)", display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", flexWrap: "wrap" };
const formCard: CSSProperties = { marginBottom: 18, padding: 22, border: "1px solid var(--line)", borderRadius: 24, background: "var(--surface)" };
const formGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14 };
const sectionHeader: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" };
const listCard: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 18, padding: 20, marginBottom: 12, border: "1px solid var(--line)", borderRadius: 22, background: "var(--surface)", flexWrap: "wrap" };
const checklistBox: CSSProperties = { margin: "18px 0", padding: 18, borderRadius: 18, background: "rgba(50,160,145,.06)", border: "1px solid rgba(50,160,145,.18)" };
const miniChecklist: CSSProperties = { display: "grid", gap: 6, marginTop: 12 };
const checkItem: CSSProperties = { display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "var(--ink)", cursor: "pointer" };
const emptyStyle: CSSProperties = { padding: 30, textAlign: "center", color: "var(--muted)", border: "1px dashed var(--line)", borderRadius: 20 };
const h2: CSSProperties = { margin: 0, fontSize: 28 };
const h3: CSSProperties = { margin: "5px 0", fontSize: 17 };
const paragraph: CSSProperties = { color: "var(--muted)", lineHeight: 1.6, margin: "6px 0" };
