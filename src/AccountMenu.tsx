import { useEffect, useState } from "react";
import { pendingSyncAreas } from "./lib/nexo/syncStatus";
import { supabase } from "./lib/supabase";

export default function AccountMenu() {
  const [name,setName]=useState("Estudante");
  const [open,setOpen]=useState(false);
  const [pending,setPending]=useState(()=>pendingSyncAreas().length);
  useEffect(()=>{ void supabase.auth.getUser().then(({data})=>{const n=String(data.user?.user_metadata?.full_name||"").trim(); if(n)setName(n);}); const update=()=>setPending(pendingSyncAreas().length); window.addEventListener("nexo-sync-status",update); return()=>window.removeEventListener("nexo-sync-status",update); },[]);
  async function logout(){ await supabase.auth.signOut(); window.location.replace("/entrar"); }
  const initial=name.charAt(0).toUpperCase()||"E";
  return <div className="account-menu"><button className="student account-trigger" onClick={()=>setOpen(v=>!v)} aria-expanded={open}><div className="avatar">{initial}</div><div className="student-info"><strong>{name}</strong><span>{pending ? "Salvando alterações…" : "Meus estudos"}</span></div><span className="account-chevron">⌄</span></button>{open&&<div className="account-popover"><div><strong>{name}</strong><span>{pending ? "Há alterações aguardando sincronização" : "Conta do NEXO"}</span></div><button onClick={logout}>Sair da conta</button></div>}</div>;
}
