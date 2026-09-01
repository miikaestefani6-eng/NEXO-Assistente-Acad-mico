import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Admin from "./AdminFixed";
import Agenda from "./Agenda";
import Disciplinas from "./Disciplinas";
import Progresso from "./Progresso";
import "./styles.css";
import "./nexo-enhancements.css";

function Router() {
  const [path, setPath] = React.useState(window.location.pathname);
  React.useEffect(() => { const handlePopState = () => setPath(window.location.pathname); window.addEventListener("popstate", handlePopState); return () => window.removeEventListener("popstate", handlePopState); }, []);
  React.useEffect(() => { const handleInternalNavigation = (event: MouseEvent) => { const target = event.target as HTMLElement | null; const link = target?.closest("a[href]") as HTMLAnchorElement | null; if (!link) return; const href = link.getAttribute("href"); if (!href || !href.startsWith("/") || href.startsWith("//")) return; event.preventDefault(); window.history.pushState({}, "", href); setPath(href); window.scrollTo({ top: 0, behavior: "smooth" }); }; document.addEventListener("click", handleInternalNavigation); return () => document.removeEventListener("click", handleInternalNavigation); }, []);
  if (path === "/admin") return <Admin />;
  if (path === "/agenda") return <Agenda />;
  if (path === "/disciplinas") return <Disciplinas />;
  if (path === "/progresso") return <Progresso />;
  return <App />;
}
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><Router /></React.StrictMode>);
