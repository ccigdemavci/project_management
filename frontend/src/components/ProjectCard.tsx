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
  progress: number; // 0-100
  startDate: string;
  endDate: string;
  phases: Phase[];
  archived?: boolean;
};

type Props = {
  project: Project;
  onOpen?: (id: string) => void;
};

export default function ProjectCard({ project, onOpen }: Props) {
  const navigate = useNavigate();

  function handleClick() {
    if (onOpen) onOpen(project.id);
    else navigate(`/project/${project.id}`);
  }

  return (
    <div className="pc" onClick={handleClick}>
      <div className="pc-h">
        <div className="pc-title">
          <FolderKanban size={18} />
          <span>{project.name}</span>
        </div>
        <StatusPill status={project.status} />
      </div>

      <MiniGantt phases={project.phases} />

      <div className="pc-m">
        <div className="pc-row">
          <Users size={16} />
          <span>{project.teamSize} kişi</span>
        </div>
        <div className="pc-row">
          <CalendarDays size={16} />
          <span>
            {new Date(project.startDate).toLocaleDateString()} –{" "}
            {new Date(project.endDate).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="pc-f">
        <div className="progress">
          <div
            className="progress-bar"
            style={{ width: `${project.progress}%` }}
          />
        </div>
        <div className="progress-text">{project.progress}%</div>
      </div>
    </div>
  );
}