// src/lib/api.ts

// .env’de yoksa localhost’a düşer
const API_URL =
  (import.meta.env.VITE_API_URL as string) ?? "http://localhost:8000";

/* =====================================
   AUTH / TOKEN KISMI
===================================== */

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

/* =====================================
   CORE FETCH
===================================== */

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = getAuthToken();

  // Body varsa ve FormData/URLSearchParams değilse JSON gönder
  const isFormLike =
    options.body instanceof FormData ||
    options.body instanceof URLSearchParams;

  if (!isFormLike && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) headers.set("Authorization", `Bearer ${token}`);

  // Gövde string değil ve JSON ise stringify et
  let body = options.body as BodyInit | undefined;
  if (
    body &&
    headers.get("Content-Type")?.includes("application/json") &&
    typeof body !== "string"
  ) {
    body = JSON.stringify(body);
  }

  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const res = await fetch(url, { ...options, headers, body });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    if (res.status === 401) {
      // Token expired or invalid
      setAuthToken(null);
      window.location.href = "/login";
      throw new Error("Session expired");
    }

    const detail =
      (isJson &&
        payload &&
        ((payload as any).detail || (payload as any).message)) ||
      res.statusText ||
      "Request failed";
    throw new Error(detail);
  }

  return (payload ?? (null as unknown)) as T;
}

/** Sadece GET için küçük helper (ProjectDetail vs. kullanmak için) */
export function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "GET" });
}

/* =====================================
   AUTH İSTEĞİ
===================================== */

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

  // Token’ı anında kaydedelim
  setAuthToken(resp.access_token);
  return resp;
}

/* =====================================
   PROJECT DTO / HELPER'LAR
===================================== */

export type ProjectPhaseDTO = {
  name: string;
  start: string; // ISO date
  end: string; // ISO date
  cls?: string | null;
};

export type MemberDTO = { id: number | string; name: string; role: string };
export type NoteDTO = {
  id: number | string;
  text: string;
  created_at: string;
};
export type FileDTO = {
  id: number | string;
  name: string;
  size_kb?: number | null;
};
export type ExpenseDTO = {
  id: number | string;
  label: string;
  amount: number;
  date: string;
};

export type ProjectDetailDTO = {
  id: number;
  name: string;
  owner_name?: string | null;
  status: "planning" | "active" | "risk" | "hold" | "done";
  progress: number;
  start_date: string; // ISO
  end_date: string; // ISO
  current_phase?:
  | "baslangic"
  | "planlama"
  | "gelistirme"
  | "teslim"
  | null;
  phases?: ProjectPhaseDTO[];
  budget_planned?: number | null;
  team?: MemberDTO[];
  notes?: NoteDTO[];
  files?: FileDTO[];
  expenses?: ExpenseDTO[];
};

export type ProjectListItemDTO = {
  id: number;
  name: string;
  status: ProjectDetailDTO["status"];
  progress: number;
  start_date: string;
  end_date: string;
  team_size?: number;
};

/** Tek proje detayı (backend /projects/{id}) */
export async function getProjectById(
  projectId: string | number,
): Promise<ProjectDetailDTO> {
  return apiGet<ProjectDetailDTO>(`/projects/${projectId}`);
}

/** Dashboard listesi için /projects */
export async function getProjects(): Promise<ProjectListItemDTO[]> {
  return apiGet<ProjectListItemDTO[]>("/projects");
}

/* =====================================
   PHASE & DETAIL CRUD
===================================== */

// --- Phase Types ---
export type BackendPhase = {
  id: number;
  project_id: number;
  name: string;
  sort_order: number;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
};

export type BackendPhaseCreate = {
  name: string;
  sort_order?: number;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
};

export type BackendPhaseUpdate = Partial<BackendPhaseCreate>;

// --- Phase Detail Types ---
export interface BackendPhaseDetail {
  id: number;
  phase_id: number;
  title: string;
  description?: string | null;
  is_completed: boolean;
  sort_order: number;
  parent_id?: number | null;
  item_type?: string; // "task" | "sub_phase"
  created_at: string;
  updated_at: string;
  children?: BackendPhaseDetail[];

  // New detailed fields
  scope?: string | null;
  reference?: string | null;
  responsible?: string | null;
  effort?: number | null;
  unit?: string | null;

  // Gantt dates
  start_date?: string | null;
  end_date?: string | null;
  priority?: string | null;
  completed_at?: string | null;
}

export interface BackendPhaseDetailCreate {
  phase_id: number;
  title: string;
  description?: string;
  is_completed?: boolean;
  sort_order?: number;
  parent_id?: number | null;
  item_type?: string;

  scope?: string;
  reference?: string;
  responsible?: string;
  effort?: number;
  unit?: string;

  start_date?: string;
  end_date?: string;
  priority?: string;
}

export interface BackendPhaseDetailUpdate {
  title?: string;
  description?: string;
  is_completed?: boolean;
  sort_order?: number;
  parent_id?: number | null;
  item_type?: string;

  scope?: string;
  reference?: string;
  responsible?: string;
  effort?: number;
  unit?: string;

  priority?: string;
  start_date?: string;
  end_date?: string;
};

// --- Note Types ---
export interface BackendPhaseDetailNote {
  id: number;
  detail_id: number;
  user: string;
  note: string;
  created_at: string;
}

export interface BackendPhaseDetailNoteCreate {
  detail_id: number;
  user: string;
  note: string;
}

// --- Note Functions ---
export async function getPhaseDetailNotes(detailId: string): Promise<BackendPhaseDetailNote[]> {
  return apiFetch<BackendPhaseDetailNote[]>(`/phase-details/${detailId}/notes`);
}

export async function createPhaseDetailNote(data: BackendPhaseDetailNoteCreate): Promise<BackendPhaseDetailNote> {
  return apiFetch<BackendPhaseDetailNote>(`/phase-details/notes`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Phase Functions ---

export async function createProjectPhase(projectId: string, data: BackendPhaseCreate): Promise<BackendPhase> {
  return apiFetch<BackendPhase>(`/projects/${projectId}/phases`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProjectPhase(projectId: string, phaseId: string, data: BackendPhaseUpdate): Promise<BackendPhase> {
  return apiFetch<BackendPhase>(`/projects/${projectId}/phases/${phaseId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteProjectPhase(projectId: string, phaseId: string): Promise<void> {
  return apiFetch<void>(`/projects/${projectId}/phases/${phaseId}`, {
    method: "DELETE",
  });
}

// --- Phase Detail Functions ---

export async function getPhaseDetails(phaseId: string): Promise<BackendPhaseDetail[]> {
  return apiGet<BackendPhaseDetail[]>(`/phase-details/phase/${phaseId}`);
}

export async function createPhaseDetail(data: BackendPhaseDetailCreate): Promise<BackendPhaseDetail> {
  return apiFetch<BackendPhaseDetail>(`/phase-details/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePhaseDetail(detailId: string, data: BackendPhaseDetailUpdate): Promise<BackendPhaseDetail> {
  return apiFetch<BackendPhaseDetail>(`/phase-details/${detailId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePhaseDetail(detailId: string): Promise<void> {
  return apiFetch<void>(`/phase-details/${detailId}`, {
    method: "DELETE",
  });
}
