// src/lib/projects.ts
import { apiFetch } from "@/lib/api";

// Backend statüleri
export type BackendStatus = "planning" | "active" | "risk" | "hold" | "done";

/** Backend’ten gelebilecek alanları kapsayan gevşek tip */
export type ApiProject = {
  id: string | number;
  name?: string;
  code?: string;
  status?: BackendStatus | "at-risk";
  priority?: "High" | "Medium" | "Normal";
  progress?: number | string;
  owner?: string | { name: string };
  start_date?: string;
  end_date?: string | null;
  startDate?: string;
  endDate?: string | null;
  phases?: Array<{ name: string; start: string; end: string; cls?: string }>;
  // ekstra alanlar da gelebilir:
  [key: string]: any;
};

// ProjectCard'ın beklediği minimal tip (UI)
export type CardProject = {
  id: string;
  name: string;
  owner: string; // ProjectCard expects string, not optional
  status: "planning" | "active" | "at-risk" | "hold" | "done";
  priority: "High" | "Medium" | "Normal";
  progress: number;
  startDate?: string;
  endDate?: string | null;
  phases: Array<{ name: string; start: string; end: string; cls?: string }>;
  teamSize: number;
};

export type ProjectQuery = {
  q?: string;
  status?: BackendStatus;
  page?: number; // 1-based
  size?: number;
  skip?: number;
  limit?: number;
};

export type CreateProjectInput = {
  name: string;
  startDate?: string;
  endDate?: string;
  priority?: "High" | "Medium" | "Normal";
};

function buildQS(params: Record<string, any>) {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    u.set(k, String(v));
  });
  const s = u.toString();
  return s ? `?${s}` : "";
}

// Tek bir öğeyi normalize et → UI tipine çevir
export function adaptProject(item: ApiProject): CardProject {
  const backendStatus = (item.status ?? "planning") as BackendStatus | "at-risk";

  const status: CardProject["status"] =
    backendStatus === "risk" ? "at-risk" : (backendStatus as any);

  const progressRaw =
    (item as any).progress ?? (item as any).percent ?? (item as any).completion ?? (item as any).progress_pct ?? 0;

  // Ekip sayısı: API'den gelen team_size yoksa owner varsa 1'e düş
  const rawTeam = Number((item as any).team_size ?? (item as any).teamSize ?? 0) || 0;
  const hasOwner = Boolean((item as any).owner_id ?? (item as any).owner);
  const teamSize = rawTeam > 0 ? rawTeam : (hasOwner ? 1 : 0);

  const ownerName = (item as any).owner?.name ?? (item as any).owner_name ?? (item as any).created_by ?? "—";

  return {
    id: String(item.id),
    name: item.name ?? (item as any).title ?? (item as any).project_name ?? "Adsız Proje",
    owner: ownerName,
    status,
    priority: item.priority ?? "Normal",
    progress: typeof progressRaw === "number" ? progressRaw : Number(progressRaw) || 0,
    startDate: item.start_date ?? item.startDate ?? (item as any).start ?? undefined,
    endDate: item.end_date ?? item.endDate ?? (item as any).end ?? undefined,
    phases: Array.isArray(item.phases) ? item.phases : [],
    teamSize,
  };
}

/**
 * Aşağıdaki yanıt şekillerini destekler:
 * - Project[]                       → dizi
 * - { items: Project[], ... }       → items
 * - { results: Project[], ... }     → results
 * - { data: { items: [] } }         → data.items
 * - { data: [] }                    → data (dizi)
 * - { data: [] }                    → data (dizi)
 */
export async function fetchProjects(params: ProjectQuery = {}) {
  const url = `/projects${buildQS(params)}`;
  const raw = await apiFetch<any>(url);

  let list: any[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (Array.isArray(raw?.items)) list = raw.items;
  else if (Array.isArray(raw?.results)) list = raw.results;
  else if (Array.isArray(raw?.data?.items)) list = raw.data.items;
  else if (Array.isArray(raw?.data)) list = raw.data;
  else {
    console.debug("fetchProjects: beklenmeyen yanıt", raw);
  }

  const items = list.map(adaptProject);
  return {
    items,            // CardProject[]
    __debug_raw: raw, // istersen Network/Console'da bakarsın
  };
}

/** Yeni proje oluşturur ve UI tipine çevirir */
export async function createProject(data: CreateProjectInput) {
  const payload: Record<string, any> = {
    title: data.name,
    priority: data.priority ?? "Normal",
  };
  if (data.startDate) payload.start_date = data.startDate;
  if (data.endDate) payload.end_date = data.endDate;

  const res = await apiFetch<ApiProject>("/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return adaptProject(res);
}

export async function updateProject(id: string, data: Partial<ApiProject>) {
  const res = await apiFetch<ApiProject>(`/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return adaptProject(res);
}
