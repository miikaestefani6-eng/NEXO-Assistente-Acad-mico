import { useState } from "react";
import { saveStudyProfile, type StudyJourneyType } from "./lib/nexo/studyProfile";

const journeys: Array<{ id: StudyJourneyType; label: string; hint: string }> = [
  { id: "faculdade", label: "Faculdade", hint: "Disciplinas, aulas, trabalhos e provas" },
  { id: "concurso", label: "Concurso", hint: "Edital, matérias e data da prova" },
  { id: "vestibular", label: "ENEM / Vestibular", hint: "Áreas, simulados e preparação" },
  { id: "escola", label: "Escola", hint: "Matérias, atividades e avaliações" },
  { id: "certificacao", label: "Certificação", hint: "Conteúdo e prazo da certificação" },
  { id: "outro", label: "Outro objetivo", hint: "Conte ao NEXO o que você quer aprender" },
];

export default function Onboarding() {
  const [journeyType, setJourneyType] = useState<StudyJourneyType>("faculdade");
  const [objective, setObjective] = useState("");
  const [minutes, setMinutes] = useState(90);

  function finish() {
    saveStudyProfile({
      journeyType,
      objective: objective.trim() || "Organizar meus estudos",
      availableMinutesPerDay: minutes,
      preferredStudyDays: [1, 2, 3, 4, 5],
    });
    window.localStorage.setItem("nexo-onboarding-complete", "true");
    window.location.href = "/";
  }

  return <div className="onboarding-shell">
    <main className="onboarding-card">
      <div className="onboarding-brand"><strong>NEXO</strong><span>Assistente Estudantil</span></div>
      <p className="eyebrow">VAMOS ORGANIZAR SEU CAMINHO</p>
      <h1>Me conta o que você está estudando.</h1>
      <p className="onboarding-lead">Você não precisa cadastrar tudo manualmente. Comece pelo seu objetivo; o NEXO organiza o restante com você.</p>
      <div className="journey-grid">{journeys.map((item) => <button key={item.id} className={journeyType === item.id ? "journey-option selected" : "journey-option"} onClick={() => setJourneyType(item.id)}><strong>{item.label}</strong><span>{item.hint}</span></button>)}</div>
      <label className="onboarding-field"><span>O que você precisa aprender ou preparar?</span><textarea value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ex.: Estou no 4º semestre de Administração e quero organizar minhas disciplinas e provas." /></label>
      <label className="onboarding-field"><span>Quanto tempo você costuma ter para estudar por dia?</span><select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}><option value={30}>30 minutos</option><option value={60}>1 hora</option><option value={90}>1h30</option><option value={120}>2 horas</option><option value={180}>3 horas ou mais</option></select></label>
      <div className="onboarding-import"><div><strong>Já tem um calendário, cronograma ou edital?</strong><p>Na próxima etapa, você poderá entregar o documento ao NEXO para ele interpretar as matérias, datas e compromissos por você.</p></div><span>📎</span></div>
      <button className="onboarding-continue" onClick={finish}>Continuar com o NEXO <span>→</span></button>
      <button className="onboarding-skip" onClick={finish}>Usar a demonstração atual por enquanto</button>
    </main>
  </div>;
}
