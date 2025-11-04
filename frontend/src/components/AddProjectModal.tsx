import { useState } from "react";
import { X, Save } from "lucide-react";
import type { Project } from "./ProjectCard";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (p: Project) => void;
};

export default function AddProjectModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("Çiğdem");
  const [team, setTeam] = useState(3);

  if (!open) return null;

  const today = new Date();
  const next = new Date();
  next.setDate(today.getDate() + 30);

  function submit() {
    if (!name.trim()) return;
    const id = crypto.randomUUID();
    onCreate({
      id,
      name,
      owner,
      teamSize: team,
      status: "planning",
      progress: 0,
      startDate: today.toISOString(),
      endDate: next.toISOString(),
      phases: [
        {
          name: "Keşif",
          start: today.toISOString(),
          end: new Date(today.getTime() + 5 * 86400000).toISOString(),
          cls: "ph-discovery",
        },
        {
          name: "Tasarım",
          start: new Date(today.getTime() + 5 * 86400000).toISOString(),
          end: new Date(today.getTime() + 12 * 86400000).toISOString(),
          cls: "ph-design",
        },
        {
          name: "Geliştirme",
          start: new Date(today.getTime() + 12 * 86400000).toISOString(),
          end: new Date(today.getTime() + 26 * 86400000).toISOString(),
          cls: "ph-dev",
        },
        {
          name: "Test",
          start: new Date(today.getTime() + 26 * 86400000).toISOString(),
          end: next.toISOString(),
          cls: "ph-test",
        },
      ],
    });
    onClose();
    setName("");
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <div className="modal-title">Yeni Proje</div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-b">
          <label className="f-label">Proje adı</label>
          <input className="input" value={name} onChange={(e) => setName(e.currentTarget.value)} placeholder="Örn. Üretim Takip 2.0" />

          <label className="f-label mt">Proje sahibi</label>
          <input className="input" value={owner} onChange={(e) => setOwner(e.currentTarget.value)} />

          <label className="f-label mt">Ekip sayısı</label>
          <input className="input" type="number" min={1} value={team} onChange={(e) => setTeam(Number(e.currentTarget.value))} />
        </div>

        <div className="modal-f">
          <button className="btn ghost" onClick={onClose}>Vazgeç</button>
          <button className="btn primary" onClick={submit}>
            <Save size={18} />
            <span>Kaydet</span>
          </button>
        </div>
      </div>
    </div>
  );
}