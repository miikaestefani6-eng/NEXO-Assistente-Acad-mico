import { useRef, useState } from "react";
import { getCriticalDiscipline } from "./lib/nexo/adaptivePlanner";
import { loadAcademicState } from "./lib/nexo/academicState";
import { activeLearningGaps, recordLearningGap } from "./lib/nexo/learningMemory";
import { registerStudyMaterial } from "./lib/nexo/studyMaterials";
import { uploadStudyMaterial } from "./lib/nexo/cloudState";

type AssistantAction = "explain" | "summary" | "flashcards" | "mindmap" | "late" | "doubt";

function workload() {
  return loadAcademicState().map(({ code, name, lessons, lessonsDone, exercises, exercisesDone, assignments, assignmentsDone, daysUntilExam }) => ({
    code, name, pendingLessons: lessons-lessonsDone, pendingExercises: exercises-exercisesDone,
    pendingAssignments: assignments-assignmentsDone, daysUntilExam
  }));
}
function fileToBase64(file: File) {
  return new Promise<string>((resolve,reject) => {
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error("Não consegui ler esse material."));
    reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");
    reader.readAsDataURL(file);
  });
}

export default function StudyAssistant({ open, onClose }: { open:boolean; onClose:()=>void }) {
  const [action,setAction]=useState<AssistantAction|null>(null);
  const [input,setInput]=useState("");
  const [answer,setAnswer]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [file,setFile]=useState<File|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  if(!open) return null;

  const work=workload();
  const critical=getCriticalDiscipline(work);
  const pendingMinutes=work.reduce((sum,item)=>sum+Math.max(0,item.pendingLessons)*30+Math.max(0,item.pendingExercises)*15+Math.max(0,item.pendingAssignments)*45,0);
  const subject=critical?.discipline ?? "seus estudos";

  function choose(next:AssistantAction) {
    setAction(next); setError("");
    setInput(next==="late"?"Fiquei atrasado. O que devo fazer agora?":next==="doubt"?"Não entendi a matéria e preciso destravar.":next==="explain"?"Explique o conteúdo que devo estudar agora.":next==="summary"?"Faça um resumo do conteúdo que devo estudar agora.":next==="flashcards"?"Crie flashcards para eu revisar agora.":"Monte um mapa mental do conteúdo que devo estudar agora.");
  }
  async function ask() {
    const message=input.trim(); if((!message&&!file)||loading) return;
    setLoading(true); setError("");
    try {
      const filePayload=file?{name:file.name,mimeType:file.type||"application/pdf",data:await fileToBase64(file)}:null;
      const response=await fetch("/api/nexo-assistant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        message, action, file:filePayload,
        context:{priority:critical?.discipline??null,priorityReason:critical?.reason??null,pendingMinutes,
          learningGaps:activeLearningGaps().map(g=>({discipline:g.discipline,topic:g.topic,note:g.note,occurrences:g.occurrences})),
          workload:work.map(i=>({discipline:i.name,pendingLessons:i.pendingLessons,pendingExercises:i.pendingExercises,pendingAssignments:i.pendingAssignments,daysUntilExam:i.daysUntilExam}))}
      })});
      const data=await response.json(); if(!response.ok) throw new Error(data?.error||"Não foi possível responder agora.");
      const raw=String(data.answer||""); const gap=raw.match(/\[\[NEXO_GAP:(\{.*?\})\]\]/s);
      if(gap){try{recordLearningGap(JSON.parse(gap[1]));}catch{/* mantém resposta */}}
      setAnswer(raw.replace(/\n?\[\[NEXO_GAP:.*?\]\]/s,"").trim());
      if(file){registerStudyMaterial({name:file.name,mimeType:file.type||"application/pdf",discipline:critical?.discipline||"Não classificado",source:"assistant"});void uploadStudyMaterial(file,critical?.discipline||"Não classificado");}
      setFile(null);
    } catch(e){setError(e instanceof Error?e.message:"Não foi possível responder agora.");}
    finally{setLoading(false);}
  }

  return <div className="assistant-overlay" onClick={onClose}><aside className="assistant-panel" onClick={e=>e.stopPropagation()}>
    <div className="assistant-panel-header"><div><span className="assistant-kicker">NEXO · PRECISO DE AJUDA</span><h2>Vamos destravar isso.</h2><p>Converse comigo ou envie o material que está estudando.</p></div><button className="assistant-close" onClick={onClose}>×</button></div>
    <div className="assistant-context"><span>CONTEXTO ATUAL</span><strong>{subject}</strong><small>{critical?.reason||"O NEXO usa seu plano, pendências e dificuldades para responder."}</small></div>
    {answer&&<div className="assistant-response"><span>✨ NEXO</span><p>{answer}</p></div>}
    {loading&&<div className="assistant-response"><span>✨ NEXO</span><p>Estou pensando no melhor próximo passo para você…</p></div>}
    {error&&<div className="assistant-response"><span>⚠️ NEXO</span><p>{error}</p></div>}
    <div className="assistant-actions"><button onClick={()=>choose("explain")}>📖 Explicar conteúdo</button><button onClick={()=>choose("summary")}>📝 Resumir aula</button><button onClick={()=>choose("flashcards")}>🧠 Criar flashcards</button><button onClick={()=>choose("mindmap")}>🗺️ Mapa mental</button><button onClick={()=>choose("late")}>⏳ Estou atrasado</button><button onClick={()=>choose("doubt")}>❓ Não entendi a matéria</button></div>
    <input ref={fileRef} type="file" accept=".pdf,image/png,image/jpeg" hidden onChange={e=>setFile(e.target.files?.[0]??null)}/>
    {file&&<div className="assistant-file"><span>📎</span><div><strong>{file.name}</strong><small>O NEXO vai usar este material para responder.</small></div><button onClick={()=>setFile(null)}>×</button></div>}
    <div className="assistant-input"><button className="assistant-attach" title="Anexar material" onClick={()=>fileRef.current?.click()}>📎</button><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void ask();}} placeholder="O que você precisa destravar?"/><button disabled={loading||(!input.trim()&&!file)} onClick={()=>void ask()}>Enviar</button></div>
  </aside></div>;
}
