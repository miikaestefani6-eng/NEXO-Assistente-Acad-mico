import { useMemo, useState } from "react";

type Discipline = {
  name: string;
  code: string;
  done: number;
  total: number;
  exam: string;
  days: number;
  accent: string;
};

const disciplines: Discipline[] = [
  { name: "Estatística e Probabilidade", code: "EST-PROB", done: 1, total: 32, exam: "15 SET", days: 14, accent: "lagoon" },
  { name: "Cálculo II", code: "CALC-II", done: 8, total: 32, exam: "22 SET", days: 21, accent: "coral" },
  { name: "Fundamentos da Administração", code: "ADM-FUND", done: 18, total: 29, exam: "29 SET", days: 28, accent: "sand" },
];

function Progresso() {
  const [selected, setSelected] = useState<string | null>(null);
  const overall = useMemo(() => Math.round(disciplines.reduce((sum, d) => sum + d.done, 0) / disciplines.reduce((sum, d) => sum + d.total, 0) * 100), []);
  const urgent = disciplines.find((d) => d.days === Math.min(...disciplines.map((x) => x.days)));

  return <div className="app">
    <header className="topbar"><div className="brand-area"><span className="brand">NEXO</span><span className="brand-subtitle">Assistente Acadêmico</span></div><nav className="desktop-nav"><a href="/">Hoje</a><a href="/agenda">Agenda</a><a href="/disciplinas">Disciplinas</a><a className="active" href="/progresso">Progresso</a></nav><div className="student"><div className="avatar">E</div><div className="student-info"><strong>Estudante</strong><span>Meu semestre</span></div></div></header>
    <main className="main-content">
      <section className="welcome"><div><p className="eyebrow">VISÃO ACADÊMICA</p><h1>Você está avançando.<br />O NEXO mostra <em>quanto.</em></h1><p className="welcome-text">Seu progresso não é só uma porcentagem. É a distância entre onde você está e o que precisa estar pronto para as próximas provas.</p></div></section>
      <section className="progress-container">
        <div className="progress-hero"><div><span className="eyebrow">PROGRESSO GERAL</span><div className="progress-number">{overall}<span>%</span></div><p>do conteúdo cadastrado já foi concluído.</p></div><div className="progress-ring"><span>{overall}%</span></div></div>
        <div className="insight-card"><span className="insight-icon">🧠</span><div><strong>O que o NEXO percebe</strong><p>{urgent?.name} exige atenção primeiro: é a disciplina com a prova mais próxima e a maior necessidade de recuperação.</p></div><a href="/disciplinas">Ver plano →</a></div>
        <div className="section-title"><div><p className="eyebrow">POR DISCIPLINA</p><h2>Seu semestre, de verdade.</h2></div></div>
        <div className="progress-grid">{disciplines.map((d) => { const percent = Math.round(d.done / d.total * 100); const pending = d.total - d.done; return <article className={`progress-card ${selected === d.code ? "selected" : ""}`} key={d.code} onClick={() => setSelected(selected === d.code ? null : d.code)}><div className="progress-card-head"><div><span className="task-type">{d.code}</span><h3>{d.name}</h3></div><span className={`risk-dot ${d.days <= 14 ? "risk-high" : d.days <= 21 ? "risk-medium" : "risk-low"}`}>{d.days <= 14 ? "URGENTE" : d.days <= 21 ? "ATENÇÃO" : "ESTÁVEL"}</span></div><div className="progress-bar"><span style={{ width: `${percent}%` }} /></div><div className="progress-card-meta"><strong>{percent}%</strong><span>{d.done} de {d.total} concluídos</span><span>{pending} pendentes</span></div><div className="progress-exam"><span>PRÓXIMA PROVA</span><strong>{d.exam}</strong><small>em {d.days} dias</small></div>{selected === d.code && <div className="progress-detail"><strong>Leitura do NEXO</strong><p>{d.days <= 14 ? "Priorize esta disciplina na sua próxima sessão. O objetivo é reduzir o atraso sem sacrificar as outras matérias." : d.days <= 21 ? "Mantenha o ritmo e use as próximas sessões para transformar pendências em avanço consistente." : "Situação sob controle. Continue avançando e preserve espaço para revisão antes da prova."}</p></div>}</article>; })}</div>
      </section>
    </main><button className="assistant-button" onClick={() => alert("O Assistente de Estudos será conectado à IA.")}><span className="assistant-sparkle">✨</span><span>Preciso de ajuda</span></button>
  </div>;
}
export default Progresso;
