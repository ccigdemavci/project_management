// src/main.tsx
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// --- Minimum stiller (önce güvenli açılış) ---
import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/utilities.css";

// Bileşen CSS'leri (doğrudan src/components/* altında olmalı)
import "./components/navbar.css";
import "./components/buttons.css";
import "./components/card.css";
import "./components/kpi.css";
import "./components/gantt.css";
import "./components/status-pill.css";
import "./components/modal.css";
import "./components/forms.css";

// Hata ekranı (güvenli)
function Crash({ error }: { error: unknown }) {
  console.error(error);
  return (
    <div
      style={{
        padding: 16,
        margin: 24,
        borderRadius: 12,
        background: "#fee2e2",
        color: "#7f1d1d",
        border: "1px solid #fecaca",
        fontFamily:
          "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      <b>Uygulama başlatılırken bir hata oluştu.</b>
      <div style={{ marginTop: 8, fontSize: 13 }}>
        Konsoldaki kırmızı hatayı bana gönderirsen, nokta atışı düzeltiriz.
      </div>
    </div>
  );
}

// Basit Error Boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: unknown | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  componentDidCatch(error: any, info: any) {
    console.error("Render error:", error, info);
  }
  render() {
    if (this.state.error) return <Crash error={this.state.error} />;
    return this.props.children;
  }
}

// App’i lazy yükle (ilk hatayı güvenle yakalayalım)
const App = React.lazy(() => import("./App"));

// Opsiyonel init’leri güvenli çalıştır
(async () => {
  try {
    // Bu iki import sende varsa çalışır, yoksa atlar.
    const theme = await import("@/lib/theme").catch(() => null);
    const auth = await import("@/lib/auth").catch(() => null);
    // Fonksiyonlarsa çağır.
    // @ts-ignore
    theme?.initSystemTheme?.();
    // @ts-ignore
    auth?.loadToken?.();
  } catch (e) {
    console.warn("Init sırasında sorun:", e);
  }
})();

// Global promise hatalarını da yakala (beyaz ekranı önler)
window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled Rejection:", e.reason);
});

const root = ReactDOM.createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<div style={{ padding: 24 }}>Yükleniyor…</div>}>
          <App />
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);