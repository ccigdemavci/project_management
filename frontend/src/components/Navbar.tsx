import { Plus, CheckCircle2, LogOut } from "lucide-react";
import logo from "@/assets/trex-logo.png";

type Props = {
  username: string;
  onAddProject: () => void;
  showFinished: boolean;
  onToggleFinished: () => void;
};

export default function Navbar({
  username,
  onAddProject,
  showFinished,
  onToggleFinished,
}: Props) {
  return (
    <header className="nv">
      <div className="nv-left">
        <img className="nv-logo" src={logo} alt="Trex" />
        <div className="nv-title">Trex Projects</div>
      </div>

      <div className="nv-right">
        <button className="btn ghost" onClick={onToggleFinished}>
          <CheckCircle2 size={18} />
          <span>{showFinished ? "Tüm Projeler" : "Biten Projeler"}</span>
        </button>

        <button className="btn primary" onClick={onAddProject}>
          <Plus size={18} />
          <span>Yeni Proje</span>
        </button>

        <div className="nv-user">
          <div className="nv-avatar">{username.charAt(0).toUpperCase()}</div>
          <div className="nv-name">{username}</div>
        </div>

        <button className="btn ghost danger" title="Çıkış">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}