import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import ProjectCard, { Project } from "@/components/ProjectCard";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  // MOCK veriler (sonra API'den)
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "p1",
      name: "Üretim Hattı MES Entegrasyonu",
      owner: "Çiğdem",
      teamSize: 6,
      status: "active",
      progress: 62,
      startDate: "2025-08-26",
      endDate: "2025-12-10",
      phases: [
        { name: "Başlangıç", start: "2025-08-26", end: "2025-09-02", cls: "ph-discovery" },
        { name: "Planlama", start: "2025-09-02", end: "2025-09-18", cls: "ph-design" },
        { name: "Geliştirme", start: "2025-09-18", end: "2025-11-18", cls: "ph-dev" },
        { name: "Teslim", start: "2025-11-18", end: "2025-12-10", cls: "ph-test" },
      ],
    },
    {
      id: "p2",
      name: "Kalite Kontrol - Görüntü İşleme",
      owner: "Mert",
      teamSize: 4,
      status: "at-risk",
      progress: 41,
      startDate: "2025-09-10",
      endDate: "2025-11-30",
      phases: [
        { name: "Başlangıç", start: "2025-09-10", end: "2025-09-15", cls: "ph-discovery" },
        { name: "Planlama", start: "2025-09-15", end: "2025-09-28", cls: "ph-design" },
        { name: "Geliştirme", start: "2025-09-28", end: "2025-11-15", cls: "ph-dev" },
        { name: "Teslim", start: "2025-11-15", end: "2025-11-30", cls: "ph-test" },
      ],
    },
    {
      id: "p3",
      name: "Bakım Planlama (CMMS) Revizyonu",
      owner: "Arda",
      teamSize: 5,
      status: "done",
      progress: 100,
      startDate: "2025-06-01",
      endDate: "2025-09-01",
      phases: [
        { name: "Başlangıç", start: "2025-06-01", end: "2025-06-10", cls: "ph-discovery" },
        { name: "Planlama", start: "2025-06-10", end: "2025-06-25", cls: "ph-design" },
        { name: "Geliştirme", start: "2025-06-25", end: "2025-08-05", cls: "ph-dev" },
        { name: "Teslim", start: "2025-08-05", end: "2025-09-01", cls: "ph-test" },
      ],
      archived: true,
    },
  ]);

  const [showFinished, setShowFinished] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const visibleProjects = useMemo(
    () => projects.filter(p => (showFinished ? p.status === "done" : p.status !== "done")),
    [projects, showFinished]
  );

  return (
    <div className="page">
      <Navbar
        username="Çiğdem"
        showFinished={showFinished}
        onToggleFinished={() => setShowFinished(v => !v)}
        onAddProject={() => setAddOpen(true)}
      />

      <section className="hero">
        <div>
          <h1 className="hero-title">Gösterge Paneli</h1>
          <p className="hero-sub">
            Projelerin durumu, faz ilerlemeleri ve risk görünümü.
          </p>
        </div>
        <div className="hero-kpis">
          <div className="kpi">
            <div className="kpi-h">Toplam</div>
            <div className="kpi-v">{projects.length}</div>
          </div>
          <div className="kpi">
            <div className="kpi-h">Aktif</div>
            <div className="kpi-v">{projects.filter(p => p.status === "active").length}</div>
          </div>
          <div className="kpi">
            <div className="kpi-h">Risk</div>
            <div className="kpi-v">{projects.filter(p => p.status === "at-risk").length}</div>
          </div>
          <div className="kpi">
            <div className="kpi-h">Biten</div>
            <div className="kpi-v">{projects.filter(p => p.status === "done").length}</div>
          </div>
        </div>
      </section>

      <section className="list">
        {visibleProjects.map(p => (
          <ProjectCard
            key={p.id}
            project={p}
            onOpen={(id) => navigate(`/project/${id}`)}
          />
        ))}

        {visibleProjects.length === 0 && (
          <div className="empty">
            {showFinished ? "Bitmiş proje yok." : "Henüz aktif proje yok."}
          </div>
        )}
      </section>

      {/* Modal en sonda importlanmış olsun */}
      <AddProjectModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={(np) => setProjects(prev => [np, ...prev])}
      />
    </div>
  );
}

// Modal importu en altta (döngüden kaçmak için)
import AddProjectModal from "@/components/AddProjectModal";