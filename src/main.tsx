import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Agenda from "./Agenda";
import "./styles.css";
import "./nexo-enhancements.css";

function Router() {
  const path = window.location.pathname;

  if (path === "/agenda") {
    return <Agenda />;
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
