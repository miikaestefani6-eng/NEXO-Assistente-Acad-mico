import { supabase } from "../supabase";
type CloudDiscipline = { code:string; name:string; lessons:number; lessonsDone:number; exercises:number; exercisesDone:number; assignments:number; assignmentsDone:number; exam:string; daysUntilExam:number; examDate?:string; scheduleKnown?:boolean };
type CloudStudyProfile = { journeyType:string; objective:string; targetDate?:string; availableMinutesPerDay:number; preferredStudyDays:number[] };
type CloudLearningGap = { id:string; discipline:string; topic:string; note:string; strength:number; occurrences:number; lastSeen:string; nextReview:string; resolved:boolean };

export async function currentUserId() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function syncProfile(profile: CloudStudyProfile) {
  if (!supabase) return false; const userId=await currentUserId(); if(!userId) return false;
  const { error }=await supabase.from("profiles").upsert({id:userId,journey_type:profile.journeyType,objective:profile.objective,target_date:profile.targetDate||null,available_minutes_per_day:profile.availableMinutesPerDay,preferred_study_days:profile.preferredStudyDays,updated_at:new Date().toISOString()});
  return !error;
}

export async function syncSubjects(subjects: CloudDiscipline[]) {
  if (!supabase) return false; const userId=await currentUserId(); if(!userId) return false;
  const rows=subjects.map(s=>({user_id:userId,code:s.code,name:s.name,lessons:s.lessons,lessons_done:s.lessonsDone,exercises:s.exercises,exercises_done:s.exercisesDone,assignments:s.assignments,assignments_done:s.assignmentsDone,exam_date:s.examDate||null,schedule_known:Boolean(s.scheduleKnown)}));
  if(!rows.length){const {error}=await supabase.from("study_subjects").delete().eq("user_id",userId);return !error;}
  const {error}=await supabase.from("study_subjects").upsert(rows,{onConflict:"user_id,code"}); if(error)return false;
  const keepCodes=rows.map(row=>row.code); const {error:cleanup}=await supabase.from("study_subjects").delete().eq("user_id",userId).not("code","in",`(${keepCodes.map(code=>`"${String(code).replace(/"/g,'\\"')}"`).join(",")})`); return !cleanup;
}

export async function fetchSubjects(): Promise<CloudDiscipline[] | null> {
  if(!supabase) return null; const userId=await currentUserId(); if(!userId) return null;
  const {data,error}=await supabase.from("study_subjects").select("*").eq("user_id",userId).order("created_at"); if(error||!data?.length) return null;
  return data.map((s:any)=>({code:s.code||String(s.id).slice(0,8).toUpperCase(),name:s.name,lessons:s.lessons,lessonsDone:s.lessons_done,exercises:s.exercises,exercisesDone:s.exercises_done,assignments:s.assignments,assignmentsDone:s.assignments_done,exam:s.exam_date?new Date(s.exam_date+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}).toUpperCase().replace(".",""):"A DEFINIR",daysUntilExam:s.exam_date?Math.max(0,Math.ceil((new Date(s.exam_date+"T12:00:00").getTime()-Date.now())/86400000)):30,examDate:s.exam_date||undefined,scheduleKnown:Boolean(s.schedule_known)}));
}

export async function syncLearningGap(gap: CloudLearningGap) {
  if(!supabase) return false; const userId=await currentUserId(); if(!userId) return false;
  const {error}=await supabase.from("learning_gaps").upsert({user_id:userId,discipline_name:gap.discipline,topic:gap.topic,note:gap.note,strength:gap.strength,occurrences:gap.occurrences,last_seen:gap.lastSeen,next_review:gap.nextReview,resolved:gap.resolved},{onConflict:"user_id,discipline_name,topic"});
  return !error;
}


type CloudActivity = { id:string; title:string; disciplineCode:string; type:string; dueDate:string; minutes:number; done:boolean; checklist:Array<{id:string;label:string;done:boolean}> };
export async function syncStudyActivities(activities: CloudActivity[]) {
  const userId=await currentUserId(); if(!userId) return false;
  const {data:subjects}=await supabase.from("study_subjects").select("id,code").eq("user_id",userId);
  const byCode=new Map((subjects||[]).map((s:any)=>[s.code,s.id]));
  if(!activities.length){const {error}=await supabase.from("study_activities").delete().eq("user_id",userId);return !error;}
  const rows=activities.map(a=>({user_id:userId,subject_id:byCode.get(a.disciplineCode)||null,client_id:a.id,title:a.title,activity_type:a.type,due_date:a.dueDate||null,minutes:a.minutes,done:a.done,checklist:a.checklist,updated_at:new Date().toISOString()}));
  const {error}=await supabase.from("study_activities").upsert(rows,{onConflict:"user_id,client_id"}); if(error)return false;
  const keepIds=rows.map(row=>row.client_id); const {error:cleanup}=await supabase.from("study_activities").delete().eq("user_id",userId).not("client_id","in",`(${keepIds.map(id=>`"${String(id).replace(/"/g,'\\"')}"`).join(",")})`); return !cleanup;
}

type CloudEvent = { id:string; title:string; date:string; time:string; disciplineCode:string; kind:"Aula ao vivo"|"Prova"|"Entrega"|"Outro" };

export async function syncStudyEvents(events: CloudEvent[]) {
  const userId=await currentUserId(); if(!userId) return false;
  const {data:subjects}=await supabase.from("study_subjects").select("id,code").eq("user_id",userId);
  const byCode=new Map((subjects||[]).map((s:any)=>[s.code,s.id]));
  const {error:del}=await supabase.from("study_events").delete().eq("user_id",userId); if(del) return false;
  if(!events.length) return true;
  const rows=events.map(e=>({user_id:userId,subject_id:byCode.get(e.disciplineCode)||null,title:e.title,kind:e.kind,event_date:e.date,event_time:e.time||null}));
  const {error}=await supabase.from("study_events").insert(rows); return !error;
}

export async function uploadStudyMaterial(file: File, discipline="Não classificado") {
  if(!supabase) return null; const userId=await currentUserId(); if(!userId) return null;
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"-"); const path=`${userId}/${Date.now()}-${safe}`;
  const {error:uploadError}=await supabase.storage.from("study-materials").upload(path,file,{contentType:file.type,upsert:false}); if(uploadError) return null;
  const {data,error}=await supabase.from("study_materials").insert({user_id:userId,name:file.name,mime_type:file.type||"application/pdf",storage_path:path,source:"assistant",discipline_name:discipline}).select("id").single();
  if(error) { await supabase.storage.from("study-materials").remove([path]); return null; }
  return {id:data.id,path,discipline};
}

export async function hydrateFromCloud(skipAreas: string[] = []) {
  if (!supabase || typeof window === "undefined") return false;
  const userId = await currentUserId(); if (!userId) return false;
  const [profileResult, subjectsResult, gapsResult, materialsResult, eventsResult, activitiesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("study_subjects").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("learning_gaps").select("*").eq("user_id", userId).order("last_seen", { ascending:false }),
    supabase.from("study_materials").select("*").eq("user_id", userId).order("created_at", { ascending:false }),
    supabase.from("study_events").select("*,study_subjects(code)").eq("user_id",userId).order("event_date"),
    supabase.from("study_activities").select("*,study_subjects(code)").eq("user_id",userId).order("created_at"),
  ]);
  if (profileResult.data && !skipAreas.includes("profile")) {
    const p=profileResult.data;
    window.localStorage.setItem("nexo-study-profile", JSON.stringify({journeyType:p.journey_type||"faculdade",objective:p.objective||"Organizar meus estudos",targetDate:p.target_date||undefined,availableMinutesPerDay:p.available_minutes_per_day||90,preferredStudyDays:p.preferred_study_days||[1,2,3,4,5]}));
  }
  if (subjectsResult.data?.length && !skipAreas.includes("subjects")) {
    const subjects=subjectsResult.data.map((s:any)=>({code:s.code||String(s.id).slice(0,8).toUpperCase(),name:s.name,lessons:s.lessons,lessonsDone:s.lessons_done,exercises:s.exercises,exercisesDone:s.exercises_done,assignments:s.assignments,assignmentsDone:s.assignments_done,exam:s.exam_date?new Date(s.exam_date+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}).toUpperCase().replace(".",""):"A DEFINIR",daysUntilExam:s.exam_date?Math.max(0,Math.ceil((new Date(s.exam_date+"T12:00:00").getTime()-Date.now())/86400000)):30,examDate:s.exam_date||undefined,scheduleKnown:Boolean(s.schedule_known)}));
    window.localStorage.setItem("nexo-academic-state", JSON.stringify(subjects));
  }
  if (gapsResult.data?.length && !skipAreas.includes("learning")) {
    const gaps=gapsResult.data.map((g:any)=>({id:g.id,discipline:g.discipline_name,topic:g.topic,note:g.note||"",strength:g.strength,occurrences:g.occurrences,lastSeen:g.last_seen,nextReview:g.next_review,resolved:g.resolved}));
    window.localStorage.setItem("nexo-learning-gaps", JSON.stringify(gaps));
  }
  if (eventsResult.data?.length && !skipAreas.includes("events")) {
    const events=eventsResult.data.map((e:any)=>({id:e.id,title:e.title,date:e.event_date,time:e.event_time||"",disciplineCode:e.study_subjects?.code||"",kind:e.kind||"Outro"}));
    window.localStorage.setItem("nexo-admin-events",JSON.stringify(events));
  }
  if (activitiesResult.data?.length && !skipAreas.includes("activities")) {
    const activities=activitiesResult.data.map((a:any)=>({id:a.client_id,title:a.title,disciplineCode:a.study_subjects?.code||"",type:a.activity_type,dueDate:a.due_date||"",minutes:a.minutes,done:a.done,checklist:Array.isArray(a.checklist)?a.checklist:[]}));
    window.localStorage.setItem("nexo-admin-activities",JSON.stringify(activities));
  }
  if (materialsResult.data?.length) {
    const materials=materialsResult.data.map((m:any)=>({id:m.id,name:m.name,mimeType:m.mime_type,discipline:m.discipline_name||"Não classificado",addedAt:m.created_at,source:m.source||"assistant",storagePath:m.storage_path}));
    window.localStorage.setItem("nexo-study-materials", JSON.stringify(materials));
  }
  return true;
}

export async function markOnboardingCompleted() {
  const userId=await currentUserId(); if(!userId) return false;
  const {error}=await supabase.from("profiles").update({onboarding_completed:true,updated_at:new Date().toISOString()}).eq("id",userId);
  return !error;
}

export async function isOnboardingCompleted() {
  const userId=await currentUserId(); if(!userId) return false;
  const {data}=await supabase.from("profiles").select("onboarding_completed").eq("id",userId).maybeSingle();
  return Boolean(data?.onboarding_completed);
}
