// src/lib/auth.ts
import { loginRequest, setAuthToken } from "./api";

const STORAGE_KEY = "trex_token";

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
  setAuthToken(null);
}