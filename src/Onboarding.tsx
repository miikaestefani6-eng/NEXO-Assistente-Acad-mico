import { useRef, useState } from "react";
import { saveStudyProfile, type StudyJourneyType } from "./lib/nexo/studyProfile";
import { applyIntake, type IntakeResult } from "./lib/nexo/intakeState";
import { markOnboardingCompleted } from "./lib/nexo/cloudState";

const journeys: Array<{ id: StudyJourneyType; label: string; hint: string }> = [
  { id: "faculdade", label: "Faculdade", hint: "Disciplinas, aulas, trabalhos e provas" },
  { id: "concurso", label: "Concurso", hint: "Edital, matérias e data da prova" },
  { id: "vestibular", label: "ENEM / Vestibular", hint: "Áreas, simulados e preparação" },
  { id: "escola", label: "Escola", hint: "Matérias, atividades e avaliações" },
  { id: "certificacao", label: "Certificação", hint: "Conteúdo e prazo da certificação" },
  { id: "outro", label: "Outro objetivo", hint: "Conte ao NEXO o que você quer aprender" },
];

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não consegui ler o arquivo."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.readAsDataURL(file);
  });
}

export default function Onboarding() {
  const [journeyType, setJourneyType] = useState<StudyJourneyType>("faculdade");
  const [objective, setObjective] = useState("");
  const [minutes, setMinutes] = useState(90);
  const [file, setFile] = useState<File | null>(null);
  const [intake, setIntake] = useState<IntakeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function saveProfile() {
    saveStudyProfile({ journeyType, objective: objective.trim() || "Organizar meus estudos", availableMinutesPerDay: minutes, preferredStudyDays: [1, 2, 3, 4, 5] });
  }

  async function analyze() {
    saveProfile();
    if (!objective.trim() && !file) { setError("Conte um pouco sobre seus estudos ou envie um documento."); return; }
    setLoading(true); setError("");
    try {
      const payload: any = { text: objective, journeyType, file: null };
      if (file) payload.file = { name: file.name, mimeType: file.type || "application/pdf", data: await toBase64(file) };
      const response = await fetch("/api/nexo-intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não consegui interpretar essas informações.");
      setIntake(data.intake);
    } catch (e) { setError(e instanceof Error ? e.message : "Não consegui interpretar essas informações."); }
    finally { setLoading(false); }
  }

  async function confirm() {
    if (!intake) return;
    saveProfile();
    applyIntake(intake);
    await markOnboardingCompleted();
    window.localStorage.setItem("nexo-onboarding-complete", "true");
    window.location.href = "/";
  }

  async function demo() {
    saveProfile();
    await markOnboardingCompleted();
    window.localStorage.setItem("nexo-onboarding-complete", "true");
    window.location.href = "/";
  }

  if (intake) return <div className="onboarding-shell"><main className="onboarding-card">
    <div className="onboarding-brand"><strong>NEXO</strong><span>Assistente Estudantil</span></div>
    <p className="eyebrow">FOI ISSO QUE EU ENTENDI</p><h1>Confere comigo antes de organizar.</h1>
    <p className="onboarding-lead">{intake.summary}</p>
    <div className="intake-review">
      <section><span>MATÉRIAS / ÁREAS</span>{intake.subjects?.length ? intake.subjects.map((s) => <div className="intake-row" key={s.name}><strong>{s.name}</strong><small>{s.examDate ? `Prova/data-alvo: ${s.examDate}` : "Sem prova identificada"}</small></div>) : <p>Nenhuma matéria identificada com segurança.</p>}</section>
      <section><span>DATAS E COMPROMISSOS</span>{intake.events?.length ? intake.events.map((e, i) => <div className="intake-row" key={i}><strong>{e.title}</strong><small>{e.date}{e.time ? ` · ${e.time}` : ""}</small></div>) : <p>Nenhuma data identificada com segurança.</p>}</section>
      {!!intake.missing?.length && <section><span>AINDA PRECISO SABER</span>{intake.missing.map((m) => <p key={m}>• {m}</p>)}</section>}
    </div>
    <div className="intake-actions"><button className="onboarding-skip" onClick={() => setIntake(null)}>← Quero corrigir</button><button className="onboarding-continue" onClick={confirm}>Está certo. Organizar meu caminho <span>→</span></button></div>
  </main></div>;

  return <div className="onboarding-shell"><main className="onboarding-card">
    <div className="onboarding-brand"><strong>NEXO</strong><span>Assistente Estudantil</span></div>
    <p className="eyebrow">VAMOS ORGANIZAR SEU CAMINHO</p><h1>Me conta o que você está estudando.</h1>
    <p className="onboarding-lead">Você não precisa cadastrar tudo manualmente. Conte sua realidade ou entregue um documento; o NEXO organiza com você.</p>
    <div className="journey-grid">{journeys.map((item) => <button key={item.id} className={journeyType === item.id ? "journey-option selected" : "journey-option"} onClick={() => setJourneyType(item.id)}><strong>{item.label}</strong><span>{item.hint}</span></button>)}</div>
    <label className="onboarding-field"><span>O que você precisa aprender ou preparar?</span><textarea value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ex.: Estou no 4º semestre de Administração. Tenho Estatística segunda e quarta e prova dia 18." /></label>
    <label className="onboarding-field"><span>Quanto tempo você costuma ter para estudar por dia?</span><select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}><option value={30}>30 minutos</option><option value={60}>1 hora</option><option value={90}>1h30</option><option value={120}>2 horas</option><option value={180}>3 horas ou mais</option></select></label>
    <input ref={inputRef} type="file" accept=".pdf,image/png,image/jpeg" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
    <button className={file ? "onboarding-import has-file" : "onboarding-import"} onClick={() => inputRef.current?.click()}><div><strong>{file ? file.name : "Anexar calendário, cronograma ou edital"}</strong><p>{file ? "O NEXO vai ler este documento junto com o que você contou." : "PDF ou imagem. O NEXO interpreta matérias, datas e compromissos antes de pedir sua confirmação."}</p></div><span>{file ? "✓" : "📎"}</span></button>
    {error && <p className="onboarding-error">{error}</p>}
    <button className="onboarding-continue" onClick={analyze} disabled={loading}>{loading ? "NEXO está organizando..." : "Deixar o NEXO organizar"} <span>→</span></button>
    <button className="onboarding-skip" onClick={demo}>Usar a demonstração atual por enquanto</button>
  </main></div>;
}
