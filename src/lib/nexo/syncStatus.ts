const KEY="nexo-sync-pending";
export type SyncArea="profile"|"subjects"|"activities"|"events"|"learning";
export function markSyncPending(area:SyncArea){if(typeof window==="undefined")return;try{const current=JSON.parse(window.localStorage.getItem(KEY)||"[]") as SyncArea[];window.localStorage.setItem(KEY,JSON.stringify(Array.from(new Set([...current,area]))));window.dispatchEvent(new Event("nexo-sync-status"));}catch{}}
export function clearSyncPending(area:SyncArea){if(typeof window==="undefined")return;try{const current=JSON.parse(window.localStorage.getItem(KEY)||"[]") as SyncArea[];window.localStorage.setItem(KEY,JSON.stringify(current.filter(x=>x!==area)));window.dispatchEvent(new Event("nexo-sync-status"));}catch{}}
export function pendingSyncAreas():SyncArea[]{if(typeof window==="undefined")return[];try{return JSON.parse(window.localStorage.getItem(KEY)||"[]");}catch{return[];}}
