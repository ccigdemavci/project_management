import { useState } from "react";
import { X, Save, CalendarClock, FolderPlus } from "lucide-react";
import { createProject } from "@/lib/projects";
import type { CardProject } from "@/lib/projects";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (p: CardProject) => void;
  onError?: (msg: string) => void;
};

export default function CreateProjectPanel({ open, onClose, onCreated, onError }: Props) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState<string>("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Normal">("Normal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    onError?.("");
    try {
      const np = await createProject({
        name: name.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        priority,
      });
      onCreated(np);
      setName("");
      setEndDate("");
      onClose();
    } catch (err: any) {
      const msg = err?.message || "Proje oluşturulamadı";
      setError(msg);
      onError?.(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "var(--ring)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary)"
            }}>
              <FolderPlus size={20} />
            </div>
            <div>
              <div className="modal-title">Yeni Proje Oluştur</div>
              <div className="modal-subtitle">Projenizin detaylarını girerek başlayın.</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form className="modal-b" onSubmit={submit}>
          <div style={{ marginBottom: "20px" }}>
            <label className="f-label">PROJE ADI</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Örn. Üretim Takip Sistemi v2"
              required
              autoFocus
            />
          </div>

          <div className="row-sm">
            <div style={{ flex: 1 }}>
              <label className="f-label">BAŞLANGIÇ TARİHİ</label>
              <input
                className="input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.currentTarget.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="f-label">BİTİŞ TARİHİ (OPSİYONEL)</label>
              <div className="input has-icon" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    style={{ paddingLeft: 40 }}
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.currentTarget.value)}
                  />
                  <span className="input-icon" aria-hidden style={{ left: 12 }}>
                    <CalendarClock size={16} className="text-muted" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <label className="f-label">ÖNCELİK SEVİYESİ</label>
            <div style={{ display: "flex", gap: "12px" }}>
              {["High", "Medium", "Normal"].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`btn ${priority === p ? "primary" : "soft"}`}
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => setPriority(p as any)}
                >
                  {p === "High" ? "🔥 Önemli" : p === "Medium" ? "⚡ Orta" : "🟢 Normal"}
                </button>
              ))}
            </div>
          </div>

          <div className="hint" style={{ marginTop: "12px", color: "var(--muted)", fontSize: "12px" }}>
            * Bitiş tarihi boş bırakılırsa proje süresi otomatik hesaplanmaz.
          </div>

          {error && (
            <div className="error mt" style={{
              background: "color-mix(in srgb, var(--danger) 10%, transparent)",
              color: "var(--danger)",
              padding: "10px",
              borderRadius: "8px",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span>⚠️</span> {error}
            </div>
          )}
        </form>

        <div className="modal-f">
          <button className="btn ghost" type="button" onClick={onClose}>Vazgeç</button>
          <button className="btn primary" type="button" onClick={submit} disabled={saving}>
            {saving ? (
              <>
                <span className="spinner-sm" /> Kaydediliyor...
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Projeyi Oluştur</span>
              </>
            )}
          </button>
        </div>
      </div >
    </div >
  );
}
