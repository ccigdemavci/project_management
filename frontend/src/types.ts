// src/types.ts
export type PhaseStatus = "not_started" | "in_progress" | "blocked" | "done";

export interface Phase {
  id: number;
  name: string;
  status: PhaseStatus;
  sort_order?: number;
  start_date?: string | null;
  end_date?: string | null;
}

export interface Project {
  id: number;
  name: string;
  description?: string | null;
  department_id?: number | null;
  created_at?: string;
  start_date?: string | null;
  end_date?: string | null;
  phases?: Phase[];
  // İlerleme için opsiyonel yüzdeler; overview döndürüyorsa gelebilir:
  percent_done?: number | null;
}