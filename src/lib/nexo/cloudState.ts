import { supabase } from "../supabase";
import type { AcademicDiscipline } from "./academicState";
import type { StudyProfile } from "./studyProfile";
import type { LearningGap } from "./learningMemory";

export async function currentUserId() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function syncProfile(profile: StudyProfile) {
  if (!supabase) return false; const userId=await currentUserId(); if(!userId) return false;
  const { error }=await supabase.from("profiles").upsert({id:userId,journey_type:profile.journeyType,objective:profile.objective,target_date:profile.targetDate||null,available_minutes_per_day:profile.availableMinutesPerDay,updated_at:new Date().toISOString()});
  return !error;
}

export async function syncSubjects(subjects: AcademicDiscipline[]) {
  if (!supabase) return false; const userId=await currentUserId(); if(!userId) return false;
  const rows=subjects.map(s=>({user_id:userId,code:s.code,name:s.name,lessons:s.lessons,lessons_done:s.lessonsDone,exercises:s.exercises,exercises_done:s.exercisesDone,assignments:s.assignments,assignments_done:s.assignmentsDone,exam_date:null}));
  const { error:delError }=await supabase.from("study_subjects").delete().eq("user_id",userId); if(delError) return false;
  if(!rows.length) return true; const {error}=await supabase.from("study_subjects").insert(rows); return !error;
}

export async function fetchSubjects(): Promise<AcademicDiscipline[] | null> {
  if(!supabase) return null; const userId=await currentUserId(); if(!userId) return null;
  const {data,error}=await supabase.from("study_subjects").select("*").eq("user_id",userId).order("created_at"); if(error||!data?.length) return null;
  return data.map((s:any)=>({code:s.code||String(s.id).slice(0,8).toUpperCase(),name:s.name,lessons:s.lessons,lessonsDone:s.lessons_done,exercises:s.exercises,exercisesDone:s.exercises_done,assignments:s.assignments,assignmentsDone:s.assignments_done,exam:s.exam_date?new Date(s.exam_date+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}).toUpperCase().replace(".",""):"A DEFINIR",daysUntilExam:s.exam_date?Math.max(0,Math.ceil((new Date(s.exam_date+"T12:00:00").getTime()-Date.now())/86400000)):30}));
}

export async function syncLearningGap(gap: LearningGap) {
  if(!supabase) return false; const userId=await currentUserId(); if(!userId) return false;
  const {error}=await supabase.from("learning_gaps").upsert({id:gap.id.startsWith("gap-")?undefined:gap.id,user_id:userId,discipline_name:gap.discipline,topic:gap.topic,note:gap.note,strength:gap.strength,occurrences:gap.occurrences,last_seen:gap.lastSeen,next_review:gap.nextReview,resolved:gap.resolved});
  return !error;
}

export async function uploadStudyMaterial(file: File, discipline="Não classificado") {
  if(!supabase) return null; const userId=await currentUserId(); if(!userId) return null;
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"-"); const path=`${userId}/${Date.now()}-${safe}`;
  const {error:uploadError}=await supabase.storage.from("study-materials").upload(path,file,{contentType:file.type,upsert:false}); if(uploadError) return null;
  const {data,error}=await supabase.from("study_materials").insert({user_id:userId,name:file.name,mime_type:file.type||"application/pdf",storage_path:path,source:"assistant"}).select("id").single();
  if(error) { await supabase.storage.from("study-materials").remove([path]); return null; }
  return {id:data.id,path,discipline};
}
