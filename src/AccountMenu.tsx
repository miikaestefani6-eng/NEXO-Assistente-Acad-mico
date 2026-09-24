import { useEffect, useState } from "react";
import { pendingSyncAreas, retryPendingSync } from "./lib/nexo/syncStatus";
import { supabase } from "./lib/supabase";
import { clearSessionUser } from "./lib/nexo/sessionState";

export default function AccountMenu() {
  const [name,setName]=useState("Estudante");
  const [open,setOpen]=useState(false);
  const [pending,setPending]=useState(()=>pendingSyncAreas().length);
  const [logoutError,setLogoutError]=useState("");
  const [loggingOut,setLoggingOut]=useState(false);
  useEffect(()=>{ void supabase.auth.getUser().then(({data})=>{const n=String(data.user?.user_metadata?.full_name||"").trim(); if(n)setName(n);}); const update=()=>setPending(pendingSyncAreas().length); window.addEventListener("nexo-sync-status",update); return()=>window.removeEventListener("nexo-sync-status",update); },[]);
  async function logout(){ if(loggingOut)return; setLogoutError(""); setLoggingOut(true); try { if(pendingSyncAreas().length){ const synced=await retryPendingSync(); if(!synced){ setLogoutError("Não foi possível sincronizar suas alterações. Confira sua conexão e tente sair novamente."); return; } } const {error}=await supabase.auth.signOut(); if(error){ setLogoutError("Não foi possível sair da conta agora. Tente novamente em instantes."); return; } clearSessionUser(); window.location.replace("/entrar"); } finally { setLoggingOut(false); } }
  const initial=name.charAt(0).toUpperCase()||"E";
  return <div className="account-menu"><button className="student account-trigger" onClick={()=>{setOpen(v=>!v);setLogoutError("");}} aria-expanded={open}><div className="avatar">{initial}</div><div className="student-info"><strong>{name}</strong><span>{pending ? "Salvando alterações…" : "Meus estudos"}</span></div><span className="account-chevron">⌄</span></button>{open&&<div className="account-popover"><div><strong>{name}</strong><span>{pending ? "Há alterações aguardando sincronização" : "Conta do NEXO"}</span></div>{logoutError&&<p role="alert" style={{fontSize:12,lineHeight:1.4,margin:"10px 0",maxWidth:240}}>{logoutError}</p>}<button onClick={logout} disabled={loggingOut}>{loggingOut ? "Salvando antes de sair…" : "Sair da conta"}</button></div>}</div>;
}
