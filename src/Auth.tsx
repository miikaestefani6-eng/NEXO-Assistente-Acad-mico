import { useEffect, useState, type FormEvent } from "react";
import { supabase, supabaseConfigured } from "./lib/supabase";

type Mode = "login" | "signup";

export default function Auth() {
  const [mode,setMode]=useState<Mode>("login");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);

  useEffect(() => { if (!supabase) return; void supabase.auth.getSession().then(({data}) => { if (data.session) window.location.replace("/"); }); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault(); setMessage("");
    if (!supabaseConfigured || !supabase) { setMessage("A conexão segura do NEXO ainda não foi configurada neste ambiente."); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
        if (error) throw error;
        if (data.session) window.location.replace("/comecar");
        else setMessage("Conta criada. Confira seu e-mail para confirmar o acesso.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.replace("/");
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível entrar agora."); }
    finally { setLoading(false); }
  }

  return <div className="auth-page"><section className="auth-brand"><span className="brand">NEXO</span><p className="eyebrow">SEU ASSISTENTE ESTUDANTIL</p><h1>Você estuda.<br/>O NEXO cuida do <em>caminho.</em></h1><p>Entre para continuar exatamente de onde parou — com seu plano, materiais e dificuldades protegidos na sua conta.</p></section><section className="auth-card"><div className="auth-tabs"><button className={mode==="login"?"active":""} onClick={()=>setMode("login")}>Entrar</button><button className={mode==="signup"?"active":""} onClick={()=>setMode("signup")}>Criar conta</button></div><form onSubmit={submit}>{mode==="signup"&&<label>Seu nome<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Como o NEXO pode te chamar?" /></label>}<label>E-mail<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com" /></label><label>Senha<input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" /></label>{message&&<p className="auth-message">{message}</p>}<button className="auth-submit" disabled={loading}>{loading?"Só um instante…":mode==="login"?"Entrar no NEXO":"Criar minha conta"}</button></form><small>Seus estudos e materiais ficam vinculados somente à sua conta.</small></section></div>;
}
