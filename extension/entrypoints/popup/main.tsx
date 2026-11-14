import React from "react";
import ReactDOM from "react-dom/client";
import "@/assets/ui.css";
import { applyExtensionPageTheme } from "@/lib/theme";
import { App } from "./App";

applyExtensionPageTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
