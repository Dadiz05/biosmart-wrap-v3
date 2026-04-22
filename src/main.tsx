import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { appEnv } from './config/env'

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(() => {
        if (appEnv.logLevel === "debug" || appEnv.logLevel === "info") {
          console.log("✅ SW registered");
        }
      })
      .catch((err) => {
        if (appEnv.logLevel !== "error") {
          console.log("❌ SW error", err);
        }
      });
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}

if (appEnv.enableDebugUi) {
  console.info(`[BioSmartWrap] mode=${appEnv.mode} apiBase=${appEnv.apiBaseUrl || "same-origin"}`);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)