// src/lib/auth.ts
import { loginRequest, setAuthToken } from "./api";

const STORAGE_KEY = "trex_token";
const USER_EMAIL_KEY = "trex_user_email";

/**
 * Tarayıcıyı yenilediğinde token'ı localStorage veya sessionStorage'dan yükler.
 * Token varsa api.ts içindeki belleğe (setAuthToken) de aktarır.
 */
export function loadToken(): string | null {
  const token =
    localStorage.getItem(STORAGE_KEY) ||
    sessionStorage.getItem(STORAGE_KEY);

  if (token) setAuthToken(token);
  return token;
}

/**
 * Giriş fonksiyonu.
 * remember=true → localStorage, false → sessionStorage
 */
export async function login(
  username: string,
  password: string,
  remember = false
): Promise<string> {
  try {
    const { access_token } = await loginRequest(username, password);

    if (remember) {
      localStorage.setItem(STORAGE_KEY, access_token);
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, access_token);
      localStorage.removeItem(STORAGE_KEY);
    }

    // kullanıcı e-postasını sakla ki navbar'da gösterelim
    localStorage.setItem(USER_EMAIL_KEY, username);

    setAuthToken(access_token);
    return access_token;
  } catch (err: any) {
    console.error("Login failed:", err);
    throw new Error(err?.message || "Giriş başarısız");
  }
}

/**
 * Çıkış fonksiyonu: tüm saklanan token’ları temizler.
 */
export function logout() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  setAuthToken(null);
}

// src/lib/auth.ts
const TOKEN_KEY = "trex_token";

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

/** Navbar'da göstermek için kullanıcı adı/e-posta çözümü */
export function getProfileName(): string {
  const storedEmail =
    localStorage.getItem(USER_EMAIL_KEY) ||
    sessionStorage.getItem(USER_EMAIL_KEY);
  if (storedEmail) return storedEmail;

  const token = getToken();
  if (!token) return "Kullanıcı";
  const parts = token.split(".");
  if (parts.length < 2) return "Kullanıcı";
  try {
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || "Kullanıcı";
  } catch (e) {
    return "Kullanıcı";
  }
}
