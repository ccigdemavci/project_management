// src/lib/api.ts

// .env’de yoksa localhost’a düşer
const API_URL = (import.meta.env.VITE_API_URL as string) ?? "http://127.0.0.1:8000";

// ---- Types ----
export type LoginResponse = {
  access_token: string;
  token_type?: string; // genelde "bearer"
};

// ---- Token helpers ----
const TOKEN_KEY = "trex_token";
let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getAuthToken() {
  return inMemoryToken ?? localStorage.getItem(TOKEN_KEY);
}

// ---- Core fetch ----
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = getAuthToken();

  // Body varsa ve FormData/URLSearchParams değilse JSON gönder
  const isFormLike =
    options.body instanceof FormData || options.body instanceof URLSearchParams;

  if (!isFormLike && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) headers.set("Authorization", `Bearer ${token}`);

  // Gövde string değil ve JSON ise stringify et
  let body = options.body as BodyInit | undefined;
  if (body && headers.get("Content-Type")?.includes("application/json") && typeof body !== "string") {
    body = JSON.stringify(body);
  }

  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const res = await fetch(url, { ...options, headers, body });

  // JSON/Metin ayrımı ( boş gövde de olabilir )
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const detail =
      (isJson && payload && (payload.detail || payload.message)) ||
      res.statusText ||
      "Request failed";
    throw new Error(detail);
  }

  return (payload ?? (null as unknown)) as T;
}

// ---- Auth ----
export async function loginRequest(username: string, password: string) {
  // FastAPI OAuth2PasswordRequestForm alan adları:
  const form = new URLSearchParams();
  form.set("username", username);
  form.set("password", password);

  const resp = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });

  // Token’ı anında kaydedelim (istersen bunu auth.ts içinden de yapabilirsin)
  setAuthToken(resp.access_token);
  return resp;
}