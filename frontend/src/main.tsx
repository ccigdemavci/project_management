// src/main.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { initSystemTheme } from "@/lib/theme";
import { loadToken } from "@/lib/auth";

// ------------------ GLOBAL STYLES ------------------
import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/utilities.css";

// ------------------ COMPONENT STYLES ------------------
// (Artık src/components/ altında oldukları için doğrudan ./components/ ile import et)
import "./components/navbar.css";
import "./components/buttons.css";
import "./components/card.css";
import "./components/kpi.css";
import "./components/gantt.css";
import "./components/status-pill.css";
import "./components/modal.css";
import "./components/forms.css";

// ------------------ PAGE STYLES ------------------
import "./pages/login.css";
import "./pages/dashboard.css";
import "./pages/project-detail.css";

loadToken();
initSystemTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
