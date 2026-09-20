const USER_MARKER="nexo-session-user-id";
export const USER_SCOPED_KEYS=[
 "nexo-study-profile","nexo-academic-state","nexo-learning-gaps","nexo-study-materials",
 "nexo-admin-events","nexo-admin-activities","nexo-onboarding-complete","nexo-planner-state","nexo-sync-pending"
];
export function clearLocalUserState(){
 if(typeof window==="undefined")return;
 for(const key of USER_SCOPED_KEYS) window.localStorage.removeItem(key);
 window.dispatchEvent(new Event("nexo-sync-status"));
}
export function prepareLocalStateForUser(userId:string){
 if(typeof window==="undefined")return;
 const previous=window.localStorage.getItem(USER_MARKER);
 if(previous&&previous!==userId) clearLocalUserState();
 window.localStorage.setItem(USER_MARKER,userId);
}
export function clearSessionUser(){
 if(typeof window==="undefined")return;
 clearLocalUserState();
 window.localStorage.removeItem(USER_MARKER);
}
