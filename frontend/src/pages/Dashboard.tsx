// src/pages/Dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Navbar from "@/components/Navbar";
import ProjectCard, { Project as CardProject } from "@/components/ProjectCard";
import CreateProjectPanel from "@/components/CreateProjectPanel";

import { fetchProjects, updateProject } from "@/lib/projects";
import type { ApiProject } from "@/lib/projects";
import { getProfileName, logout } from "@/lib/auth";

/** Backend -> UI status dönüştürücü (UI'da "hold" için özel rozet yok; "risk" -> "at-risk") */
const toUiStatus = (s?: string): CardProject["status"] => {
  if (!s) return "planning";
  const v = s.toLowerCase();
  if (v === "risk" || v === "at-risk") return "at-risk";
  // Map "closed" to "done" for UI consistency
  if (v === "closed") return "done";
  if (v === "active" || v === "done" || v === "planning" || v === "hold") {
    return v as CardProject["status"];
  }
  return "planning";
};

/** API Project -> ProjectCard tipi */
const toCardProject = (p: ApiProject): CardProject => {
  const owner =
    typeof p.owner === "string"
      ? p.owner
      : (p.owner as any)?.name ?? "—";

  const progress =
    Number(
      p.progress ??
      (p as any).percent ??
      (p as any).completion ??
      (p as any).progress_pct ??
      0
    ) || 0;

  const teamSize =
    Number((p as any).team_size ?? (p as any).teamSize ?? 0) || 0;

  return {
    id: String(p.id),
    name: p.name ?? p.code ?? (p as any).title ?? (p as any).project_name ?? "Adsız Proje",
    owner,
    teamSize,
    status: toUiStatus(typeof p.status === "string" ? p.status : undefined),
    progress,
    startDate: (p as any).startDate ?? p.start_date ?? undefined,
    endDate: (p as any).endDate ?? (p.end_date ?? undefined),
    phases: Array.isArray((p as any).phases) ? (p as any).phases : [],
    priority: p.priority ?? "Normal",
    archived: Boolean((p as any).archived),
  };
};

export default function Dashboard() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<CardProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Kullanıcı");

  const [filter, setFilter] = useState<"all" | "active" | "important" | "done">("all");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setUserName(getProfileName());
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Sayfalama istersen: fetchProjects({ page: 1, size: 50 })
        const res = await fetchProjects({});
        if (!alive) return;

        const items = (res.items ?? []).map(toCardProject);
        setProjects(items);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Projeler alınamadı.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const visibleProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filter === "done") return p.status === "done";
      if (filter === "active") return p.status === "active" || p.status === "planning";
      if (filter === "important") return p.priority === "High";
      // filter === "all" -> Show everything (or maybe just non-archived? User said "hepsi")
      // Let's show everything for "all", or maybe everything except done?
      // "toplama tıklayınca hepsi" usually implies everything including done.
      return true;
    });
  }, [projects, filter]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function handleCreated(newProj: CardProject) {
    setProjects((prev) => [newProj, ...prev]);
    setAddOpen(false);
    navigate("/dashboard", { replace: true });
  }

  async function handleToggleStatus(id: string, currentStatus: CardProject["status"]) {
    try {
      const newStatus = currentStatus === "done" ? "planning" : "closed"; // Reactivate to planning, Close to closed
      await updateProject(id, { status: newStatus as any });

      // Update local state
      setProjects(prev => prev.map(p => {
        if (p.id === id) {
          return { ...p, status: newStatus === "closed" ? "done" : "planning" };
        }
        return p;
      }));
    } catch (err) {
      console.error("Failed to update status:", err);
      setError("Durum güncellenemedi.");
    }
  }

  async function handleUpdatePriority(id: string, currentPriority: "High" | "Medium" | "Normal") {
    const next =
      currentPriority === "High" ? "Normal" :
        currentPriority === "Medium" ? "High" :
          "Medium";

    try {
      await updateProject(id, { priority: next });
      setProjects(prev => prev.map(p => {
        if (p.id === id) {
          return { ...p, priority: next };
        }
        return p;
      }));
    } catch (err) {
      console.error("Failed to update priority:", err);
      setError("Öncelik güncellenemedi.");
    }
  }

  return (
    <>
      <Navbar
        username={userName}
        showFinished={filter === "done"}
        onToggleFinished={() => setFilter(filter === "done" ? "all" : "done")}
        onAddProject={() => setAddOpen(true)}
        onLogout={handleLogout}
      />

      <div className="page page-dashboard">
        <section className="hero">
          <div>
            <h1 className="hero-title">Gösterge Paneli</h1>
            <p className="hero-sub">Projelerin durumu, faz ilerlemeleri ve risk görünümü.</p>
          </div>
          <div className="hero-kpis">
            <div
              className={`kpi ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
              style={{ cursor: "pointer", border: filter === "all" ? "2px solid #22c55e" : undefined }}
            >
              <div className="kpi-h">Toplam</div>
              <div className="kpi-v">{projects.length}</div>
            </div>
            <div
              className={`kpi ${filter === "active" ? "active" : ""}`}
              onClick={() => setFilter("active")}
              style={{ cursor: "pointer", border: filter === "active" ? "2px solid #22c55e" : undefined }}
            >
              <div className="kpi-h">Aktif</div>
              <div className="kpi-v">{projects.filter((p) => p.status === "active" || p.status === "planning").length}</div>
            </div>
            <div
              className={`kpi ${filter === "important" ? "active" : ""}`}
              onClick={() => setFilter("important")}
              style={{ cursor: "pointer", border: filter === "important" ? "2px solid #ef4444" : undefined }}
            >
              <div className="kpi-h">Önemli</div>
              <div className="kpi-v">{projects.filter((p) => p.priority === "High").length}</div>
            </div>
            <div
              className={`kpi ${filter === "done" ? "active" : ""}`}
              onClick={() => setFilter("done")}
              style={{ cursor: "pointer", border: filter === "done" ? "2px solid #64748b" : undefined }}
            >
              <div className="kpi-h">Biten</div>
              <div className="kpi-v">{projects.filter((p) => p.status === "done").length}</div>
            </div>
          </div>
        </section>

        <section className="list">
          {loading && <div className="empty">Yükleniyor…</div>}
          {!loading && error && <div className="empty">Hata: {error}</div>}

          {!loading &&
            !error &&
            visibleProjects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={(id) => navigate(`/project/${id}`)}
                onToggleStatus={handleToggleStatus}
                onUpdatePriority={handleUpdatePriority}
              />
            ))}

          {!loading && !error && visibleProjects.length === 0 && (
            <div className="empty">
              {filter === "done" ? "Bitmiş proje yok." :
                filter === "important" ? "Önemli proje yok." :
                  "Proje bulunamadı."}
            </div>
          )}
        </section>

        <CreateProjectPanel
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onCreated={handleCreated}
          onError={(msg) => setError(msg)}
        />
      </div>
    </>
  );
}
