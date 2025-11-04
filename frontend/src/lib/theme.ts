// src/lib/theme.ts
export type Theme = "dark" | "light";

// OS tercihine bak
function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// <html data-theme="..."> ayarla
function setTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
}

// Başlat + OS değişimini dinle
export function initSystemTheme() {
  setTheme(systemTheme());

  // OS tema değişince otomatik güncelle
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => setTheme(systemTheme());

  // modern + eski webkit
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", handler);
  } else {
    // @ts-ignore
    mq.addListener(handler);
  }
}