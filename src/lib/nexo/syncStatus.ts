const KEY="nexo-sync-pending";
export type SyncArea="profile"|"subjects"|"activities"|"events"|"learning";
export function markSyncPending(area:SyncArea){if(typeof window==="undefined")return;try{const current=JSON.parse(window.localStorage.getItem(KEY)||"[]") as SyncArea[];window.localStorage.setItem(KEY,JSON.stringify(Array.from(new Set([...current,area]))));window.dispatchEvent(new Event("nexo-sync-status"));}catch{}}
export function clearSyncPending(area:SyncArea){if(typeof window==="undefined")return;try{const current=JSON.parse(window.localStorage.getItem(KEY)||"[]") as SyncArea[];window.localStorage.setItem(KEY,JSON.stringify(current.filter(x=>x!==area)));window.dispatchEvent(new Event("nexo-sync-status"));}catch{}}
export function pendingSyncAreas():SyncArea[]{if(typeof window==="undefined")return[];try{return JSON.parse(window.localStorage.getItem(KEY)||"[]");}catch{return[];}}

export async function retryPendingSync(){
  if(typeof window==="undefined"||!navigator.onLine)return false;
  const pending=pendingSyncAreas(); if(!pending.length)return true;
  const cloud=await import("./cloudState");
  let ok=true;
  for(const area of pending){
    let saved=false;
    try{
      if(area==="profile"){const {loadStudyProfile}=await import("./studyProfile");saved=await cloud.syncProfile(loadStudyProfile());}
      else if(area==="subjects"){const {loadAcademicState}=await import("./academicState");saved=await cloud.syncSubjects(loadAcademicState());}
      else if(area==="activities"){const {loadCmsActivities}=await import("./cmsState");saved=await cloud.syncStudyActivities(loadCmsActivities());}
      else if(area==="events"){const {loadCmsEvents}=await import("./cmsState");saved=await cloud.syncStudyEvents(loadCmsEvents());}
      else if(area==="learning"){const {loadLearningGaps}=await import("./learningMemory");const gaps=loadLearningGaps();saved=true;for(const gap of gaps){if(!(await cloud.syncLearningGap(gap))){saved=false;break;}}}
    }catch{saved=false;}
    if(saved)clearSyncPending(area);else ok=false;
  }
  return ok;
}
