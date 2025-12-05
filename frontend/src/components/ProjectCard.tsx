import StatusPill, { ProjectStatus } from "./StatusPill";
import MiniGantt, { Phase } from "./MiniGantt";
import { CalendarDays, Users, FolderKanban } from "lucide-react";
import { useNavigate } from "react-router-dom";

export type Project = {
  id: string;
  name: string;
  owner: string;
  teamSize: number;
  status: ProjectStatus;
  priority?: "High" | "Medium" | "Normal";
  progress: number; // 0-100
  startDate?: string;
  endDate?: string | null;
  phases: Phase[];
  archived?: boolean;
};

type Props = {
  project: Project;
  onOpen?: (id: string) => void;
  onToggleStatus?: (id: string, currentStatus: ProjectStatus) => void;
  onUpdatePriority?: (id: string, currentPriority: "High" | "Medium" | "Normal") => void;
};

export default function ProjectCard({ project, onOpen, onToggleStatus, onUpdatePriority }: Props) {
  const navigate = useNavigate();

  function handleClick(e: React.MouseEvent) {
    // Prevent navigation if clicking buttons
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.priority-badge')) return;

    if (onOpen) onOpen(project.id);
    else navigate(`/project/${project.id}`);
  }

  const priorityColors = {
    High: { bg: "rgba(239, 68, 68, 0.1)", color: "#ef4444", label: "🔥 Önemli" },
    Medium: { bg: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", label: "⚡ Orta" },
    Normal: { bg: "rgba(34, 197, 94, 0.1)", color: "#22c55e", label: "🟢 Normal" },
  };

  const priorityConfig = priorityColors[project.priority || "Normal"];

  return (
    <div className="pc" onClick={handleClick}>
      <div className="pc-h">
        <div className="pc-title">
          <FolderKanban size={18} />
          <span>{project.name}</span>
          <span
            className="priority-badge"
            style={{
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor: priorityConfig.bg,
              color: priorityConfig.color,
              fontWeight: 600,
              marginLeft: "8px",
              cursor: onUpdatePriority ? "pointer" : "default",
              userSelect: "none"
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onUpdatePriority) {
                onUpdatePriority(project.id, project.priority || "Normal");
              }
            }}
            title={onUpdatePriority ? "Önceliği değiştirmek için tıklayın" : undefined}
          >
            {priorityConfig.label}
          </span>
        </div>
        <StatusPill status={project.status} />
      </div>

      <MiniGantt phases={project.phases} />

      <div className="pc-m">
        <div className="pc-row">
          <Users size={16} />
          <span>{project.teamSize || 0} kişi</span>
        </div>
        <div className="pc-row">
          <CalendarDays size={16} />
          <span>
            {project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"} –{" "}
            {project.endDate ? new Date(project.endDate).toLocaleDateString() : "—"}
          </span>
        </div>
      </div>

      <div className="pc-f">
        <div style={{ flex: 1 }}>
          <div className="progress">
            <div
              className="progress-bar"
              style={{ width: `${project.progress}%` }}
            />
          </div>
          <div className="progress-text">{project.progress}%</div>
        </div>

        {onToggleStatus && (
          <button
            className="btn-soft"
            style={{
              marginLeft: '12px',
              fontSize: '11px',
              padding: '4px 8px',
              color: project.status === 'done' ? 'var(--primary)' : 'var(--success)',
              backgroundColor: project.status === 'done' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(project.id, project.status);
            }}
          >
            {project.status === 'done' ? 'Aktif Et' : 'Tamamla'}
          </button>
        )}
      </div>
    </div>
  );
}
