import { Plus, CheckCircle2, LogOut } from "lucide-react";
import logo from "@/assets/trex-logo.png";

type Props = {
  username: string;
  onAddProject: () => void;
  showFinished: boolean;
  onToggleFinished: () => void;
  onLogout?: () => void;
  showAddProject?: boolean;
};

export default function Navbar({
  username,
  onAddProject,
  showFinished,
  onToggleFinished,
  onLogout,
  showAddProject = true,
}: Props) {
  return (
    <header className="nv">
      <div className="nv-left">
        <img className="nv-logo" src={logo} alt="Trex" />
        <div>
          <div className="nv-title">Trex Projects</div>
          <div className="nv-sub">Proje ve Operasyon Konsolu</div>
        </div>
      </div>

      <div className="nv-right">
        <button className="btn soft" onClick={onToggleFinished}>
          <CheckCircle2 size={18} />
          <span>{showFinished ? "Tüm Projeler" : "Biten Projeler"}</span>
        </button>

        {showAddProject && (
          <button className="btn primary" onClick={onAddProject}>
            <Plus size={18} />
            <span>Yeni Proje</span>
          </button>
        )}

        <div className="nv-user">
          <div className="nv-avatar">{username.charAt(0).toUpperCase()}</div>
          <div className="nv-name">{username}</div>
        </div>

        <button className="btn ghost danger" title="Çıkış" onClick={onLogout}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
