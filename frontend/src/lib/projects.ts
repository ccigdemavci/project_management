// src/lib/projects.ts
import { apiFetch } from "@/lib/api";

export type ProjectStatus = "planning" | "active" | "risk" | "hold" | "done";

export type Project = {
  id: number | string;
  name: string;
  code?: string;
  status: ProjectStatus;
  progress?: number;
  owner?: string;
  start_date?: string;
  end_date?: string | null;
  budget_used?: number;
  budget_total?: number;
};

export type ProjectQuery = {
  q?: string;
  status?: ProjectStatus;
  page?: number;   // 1-based
  size?: number;
  skip?: number;   // bazı API'ler skip/limit ister
  limit?: number;
};

function qs(params: Record<string, any>) {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    u.set(k, String(v));
  });
  const s = u.toString();
  return s ? `?${s}` : "";
}

// Alan adları farklıysa map’ler
export function adaptProject(apiItem: any): Project {
  return {
    id: apiItem.id ?? apiItem.project_id ?? apiItem._id,
    name: apiItem.name ?? apiItem.title ?? apiItem.project_name,
    code: apiItem.code ?? apiItem.project_code,
    status: (apiItem.status ?? "planning") as ProjectStatus,
    progress:
      apiItem.progress ??
      apiItem.percent ??
      apiItem.completion ??
      0,
    owner: apiItem.owner?.name ?? apiItem.owner_name ?? apiItem.owner,
    start_date: apiItem.start_date ?? apiItem.startDate ?? apiItem.start,
    end_date: apiItem.end_date ?? apiItem.endDate ?? apiItem.end,
    budget_used: apiItem.budget_used ?? apiItem.budget?.used,
    budget_total: apiItem.budget_total ?? apiItem.budget?.total,
  };
}

/**
 * Aşağıdaki şekillerin hepsini destekler:
 * - Project[]
 * - { items: Project[], total, page, size }
 * - { results: Project[], total } / { data: { items: [] } } / { data: [] }
 */
export async function fetchProjects(params: ProjectQuery = {}) {
  // Sende /api prefix'i varsa burada değiştir:
  const url = `/projects${qs(params)}`;

  const raw = await apiFetch<any>(url);

  // normalize
  let items: any[] = [];
  let meta: { total?: number; page?: number; size?: number } = {};

  if (Array.isArray(raw)) {
    items = raw;
    meta = { total: raw.length, page: 1, size: raw.length };
  } else if (raw?.items && Array.isArray(raw.items)) {
    items = raw.items;
    meta = { total: raw.total ?? raw.count, page: raw.page, size: raw.size ?? raw.limit };
  } else if (raw?.results && Array.isArray(raw.results)) {
    items = raw.results;
    meta = { total: raw.total ?? raw.count };
  } else if (raw?.data) {
    if (Array.isArray(raw.data)) {
      items = raw.data;
      meta = { total: raw.total ?? raw.count ?? raw.data.length };
    } else if (Array.isArray(raw.data?.items)) {
      items = raw.data.items;
      meta = { total: raw.data.total ?? raw.total };
    }
  } else {
    console.debug("fetchProjects: beklenmeyen yanıt", raw);
  }

  const normalized = items.map(adaptProject);
  return {
    items: normalized,
    total: meta.total ?? normalized.length,
    page: meta.page ?? 1,
    size: meta.size ?? normalized.length,
    __debug_raw: raw, // dashboard'ta görüntüleyebiliriz
  };
}