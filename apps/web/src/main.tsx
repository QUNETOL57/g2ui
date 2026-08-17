import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";

import { App } from "@app/App";
import "@app/styles/tokens.css";
import "@app/styles/reset.css";

function BootReadyPing() {
  useEffect(() => {
    window.dispatchEvent(new Event("g2ui:app-ready"));
  }, []);
  return null;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BootReadyPing />
    <App />
  </React.StrictMode>,
);
