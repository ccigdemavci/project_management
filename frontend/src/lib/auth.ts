// src/lib/auth.ts
export function saveToken(token: string) {
  localStorage.setItem("trex_token", token);
}

export function getToken() {
  return localStorage.getItem("trex_token");
}

export function clearToken() {
  localStorage.removeItem("trex_token");
}

export function isAuthed() {
  return !!getToken();
}

