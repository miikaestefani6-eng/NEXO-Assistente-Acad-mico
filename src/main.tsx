import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Agenda from "./Agenda";
import Disciplinas from "./Disciplinas";
import Progresso from "./Progresso";
import Onboarding from "./Onboarding";
import Auth from "./Auth";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { hydrateFromCloud, isOnboardingCompleted } from "./lib/nexo/cloudState";
import "./styles.css";
import "./nexo-enhancements.css";

function Router() {
  const [path, setPath] = React.useState(window.location.pathname);
  const [authReady, setAuthReady] = React.useState(!supabaseConfigured);
  const [signedIn, setSignedIn] = React.useState(false);
  const [onboardingDone, setOnboardingDone] = React.useState(true);
  React.useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    let active=true;
    void supabase.auth.getSession().then(async ({data}) => {
      if (!active) return;
      const logged=Boolean(data.session); setSignedIn(logged);
      if (logged) { await hydrateFromCloud(); setOnboardingDone(await isOnboardingCompleted()); }
      if (active) setAuthReady(true);
    });
    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{ setSignedIn(Boolean(session)); });
    return () => { active=false; listener.subscription.unsubscribe(); };
  }, []);
  React.useEffect(() => { const handlePopState = () => setPath(window.location.pathname); window.addEventListener("popstate", handlePopState); return () => window.removeEventListener("popstate", handlePopState); }, []);
  React.useEffect(() => { const handleInternalNavigation = (event: MouseEvent) => { const target = event.target as HTMLElement | null; const link = target?.closest("a[href]") as HTMLAnchorElement | null; if (!link) return; const href = link.getAttribute("href"); if (!href || !href.startsWith("/") || href.startsWith("//")) return; event.preventDefault(); window.history.pushState({}, "", href); setPath(href); window.scrollTo({ top: 0, behavior: "smooth" }); }; document.addEventListener("click", handleInternalNavigation); return () => document.removeEventListener("click", handleInternalNavigation); }, []);
  if (!authReady) return <div className="nexo-boot">NEXO está preparando seu caminho…</div>;
  if (path === "/entrar") return signedIn ? <App /> : <Auth />;
  if (supabaseConfigured && !signedIn) return <Auth />;
  if (signedIn && !onboardingDone && path !== "/comecar") { window.history.replaceState({}, "", "/comecar"); return <Onboarding />; }
  if (path === "/comecar") return <Onboarding />;
  if (path === "/admin") { window.history.replaceState({}, "", "/"); return <App />; }
  if (path === "/agenda") return <Agenda />;
  if (path === "/disciplinas") return <Disciplinas />;
  if (path === "/progresso") return <Progresso />;
  return <App />;
}
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><Router /></React.StrictMode>);
