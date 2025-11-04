import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import StatusPill, { ProjectStatus } from "@/components/StatusPill";
import MiniGantt, { Phase } from "@/components/MiniGantt";
import {
  CalendarDays,
  Users,
  FileText,
  Upload,
  Coins,
  NotebookText,
  FolderKanban,
  Trash2,
  Plus,
  ChevronLeft,
} from "lucide-react";

/** ---- MOCK veri (sonra API'ye bağlayacağız) ---- */
type Member = { id: string; name: string; role: string };
type Note = { id: string; text: string; createdAt: string };
type Doc = { id: string; name: string; sizeKB: number };
type Expense = { id: string; label: string; amount: number; date: string };

export type FullProject = {
  id: string;
  name: string;
  owner: string;
  teamSize: number;
  team: Member[];
  status: ProjectStatus;
  progress: number;
  startDate: string;
  endDate: string;
  phases: Phase[];
  currentPhase: "baslangic" | "planlama" | "gelistirme" | "teslim";
  budget: {
    planned: number; // planlanan
    // spent/remaining artık hesaplanacak; ancak geriye dönük uyum için tutuyoruz
    spent?: number;
    remaining?: number;
  };
  notes: Note[];
  files: Doc[];
  // local mock için başlangıç harcamaları
  initExpenses?: Expense[];
};

const MOCK: FullProject[] = [
  {
    id: "p1",
    name: "Üretim Hattı MES Entegrasyonu",
    owner: "Çiğdem",
    teamSize: 6,
    team: [
      { id: "u1", name: "Çiğdem", role: "PM" },
      { id: "u2", name: "Mert", role: "Dev" },
      { id: "u3", name: "Arda", role: "QA" },
      { id: "u4", name: "Berkan", role: "Dev" },
      { id: "u5", name: "Elif", role: "BA" },
      { id: "u6", name: "Ece", role: "UI/UX" },
    ],
    status: "active",
    progress: 62,
    startDate: "2025-08-26",
    endDate: "2025-12-10",
    phases: [
      { name: "Başlangıç", start: "2025-08-26", end: "2025-08-30", cls: "ph-discovery" },
      { name: "Planlama", start: "2025-08-30", end: "2025-09-18", cls: "ph-design" },
      { name: "Geliştirme", start: "2025-09-18", end: "2025-11-18", cls: "ph-dev" },
      { name: "Teslim", start: "2025-11-18", end: "2025-12-10", cls: "ph-test" },
    ],
    currentPhase: "gelistirme",
    budget: {
      planned: 480000,
    },
    notes: [
      { id: "n1", text: "Tedarikçi API anahtarları onaylandı.", createdAt: "2025-10-12 10:24" },
      { id: "n2", text: "İstasyon-3 PLC entegrasyonunda gecikme riski.", createdAt: "2025-10-26 13:02" },
    ],
    files: [
      { id: "f1", name: "Sözleşme_v3.pdf", sizeKB: 842 },
      { id: "f2", name: "Akış_Diyagramı.drawio", sizeKB: 311 },
    ],
    initExpenses: [
      { id: "e1", label: "Endüstriyel kamera", amount: 42000, date: "2025-09-05" },
      { id: "e2", label: "Danışmanlık (Eylül)", amount: 28000, date: "2025-09-30" },
      { id: "e3", label: "Sunucu kiralama", amount: 9000, date: "2025-10-10" },
    ],
  },
];

function currency(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = useMemo(() => MOCK.find((p) => p.id === id) ?? MOCK[0], [id]);

  /** Yerel (mock) state — sonra API bağlanınca burası kalkar */
  const [notes, setNotes] = useState<Note[]>(project.notes);
  const [files, setFiles] = useState<Doc[]>(project.files);
  const [expenses, setExpenses] = useState<Expense[]>(project.initExpenses ?? []);

  // Bütçe hesapları
  const planned = project.budget.planned;
  const spent = useMemo(() => expenses.reduce((s, e) => s + (e.amount || 0), 0), [expenses]);
  const remaining = Math.max(planned - spent, 0);
  const usedPct = Math.min(Math.round((spent / planned) * 100), 100);

  /** Not ekle */
  function addNote(text: string) {
    if (!text.trim()) return;
    setNotes((prev) => [
      { id: crypto.randomUUID(), text: text.trim(), createdAt: new Date().toLocaleString() },
      ...prev,
    ]);
  }

  /** Dosya “yükle” (mock) */
  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const next: Doc[] = [];
    Array.from(list).forEach((f) =>
      next.push({
        id: crypto.randomUUID(),
        name: f.name,
        sizeKB: Math.max(1, Math.round(f.size / 1024)),
      }),
    );
    setFiles((prev) => [...next, ...prev]);
  }

  /** Harcama ekle/sil (mock) */
  const [exLabel, setExLabel] = useState("");
  const [exAmount, setExAmount] = useState<string>("");
  const [exDate, setExDate] = useState(() => new Date().toISOString().slice(0, 10));

  function addExpense() {
    const val = Number(exAmount);
    if (!exLabel.trim() || !val || val <= 0) return;
    setExpenses((prev) => [
      { id: crypto.randomUUID(), label: exLabel.trim(), amount: val, date: exDate },
      ...prev,
    ]);
    setExLabel("");
    setExAmount("");
  }

  function removeExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  /** Faz stepper’ı vurgusu */
  const stepIndex = ["baslangic", "planlama", "gelistirme", "teslim"].indexOf(project.currentPhase);

  return (
    <div className="page">
      <Navbar
        username="Çiğdem"
        showFinished={false}
        onToggleFinished={() => {}}
        onAddProject={() => {}}
      />

      {/* Başlık şeridi */}
      <div className="pd-head">
        <button className="btn ghost" onClick={() => navigate(-1)}>
          <ChevronLeft size={18} /> Geri
        </button>

        <div className="pd-title">
          <FolderKanban size={22} />
          <div>
            <h1>{project.name}</h1>
            <div className="pd-sub">
              <CalendarDays size={16} />
              <span>
                {new Date(project.startDate).toLocaleDateString()} –{" "}
                {new Date(project.endDate).toLocaleDateString()}
              </span>
              <span className="dot">•</span>
              <Users size={16} />
              <span>{project.teamSize} kişi</span>
            </div>
          </div>
        </div>

        <div className="pd-head-right">
          <StatusPill status={project.status} />
          <Link to="/" className="btn ghost">← Projelere Dön</Link>
        </div>
      </div>

      {/* Faz Stepper (renkli/aktif vurgulu) */}
      <section className={`pd-stepper phase-${project.currentPhase}`}>
        {["Başlangıç", "Planlama", "Geliştirme", "Teslim"].map((label, i) => (
          <div className={`step ${i < stepIndex ? "done" : ""} ${i === stepIndex ? "current" : ""}`} key={label}>
            <div className="step-dot" />
            <div className="step-label">{label}</div>
            {i < 3 && <div className="step-line" />}
          </div>
        ))}
      </section>

      {/* KPI’lar */}
      <section className="pd-kpis">
        <div className="kpi">
          <div className="kpi-h">İlerleme</div>
          <div className="kpi-v">{project.progress}%</div>
        </div>
        <div className="kpi">
          <div className="kpi-h">Planlanan</div>
          <div className="kpi-v">{currency(planned)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-h">Harcanan</div>
          <div className="kpi-v">{currency(spent)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-h">Kalan</div>
          <div className="kpi-v">{currency(remaining)}</div>
        </div>
      </section>

      {/* 2 sütun */}
      <div className="pd-grid">
        {/* Sol */}
        <div className="pd-col">
          <Card title="Zaman Çizelgesi">
            <MiniGantt phases={project.phases} />
            <div className="pd-progress">
              <div className="progress">
                <div className="progress-bar" style={{ width: `${project.progress}%` }} />
              </div>
              <div className="progress-text">{project.progress}%</div>
            </div>
          </Card>

          <Card title="Notlar">
            <NoteEditor onAdd={addNote} />
            <ul className="note-list">
              {notes.map((n) => (
                <li key={n.id} className="note-item">
                  <NotebookText size={16} />
                  <div>
                    <div className="note-text">{n.text}</div>
                    <div className="note-meta">{n.createdAt}</div>
                  </div>
                </li>
              ))}
              {notes.length === 0 && <div className="empty">Henüz not yok.</div>}
            </ul>
          </Card>
        </div>

        {/* Sağ */}
        <div className="pd-col">
          <Card title="Ekip">
            <ul className="team">
              {project.team.map((m) => (
                <li key={m.id} className="team-item">
                  <div className="avatar">{m.name.charAt(0)}</div>
                  <div className="team-info">
                    <div className="team-name">{m.name}</div>
                    <div className="team-role">{m.role}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Dosyalar">
            <label className="upload">
              <Upload size={16} />
              <span>Dosya ekle</span>
              <input type="file" multiple onChange={(e) => addFiles(e.currentTarget.files)} />
            </label>

            <ul className="files">
              {files.map((f) => (
                <li key={f.id} className="file-item">
                  <FileText size={16} />
                  <span className="file-name">{f.name}</span>
                  <span className="file-size">{f.sizeKB} KB</span>
                </li>
              ))}
              {files.length === 0 && <div className="empty">Dosya eklenmemiş.</div>}
            </ul>
          </Card>

          <Card title="Bütçe">
            <div className="budget-nums">
              <div className="bn">
                <div className="bn-h">Planlanan</div>
                <div className="bn-v">{currency(planned)}</div>
              </div>
              <div className="bn">
                <div className="bn-h">Harcanan</div>
                <div className="bn-v">{currency(spent)}</div>
              </div>
              <div className="bn">
                <div className="bn-h">Kalan</div>
                <div className="bn-v accent">{currency(remaining)}</div>
              </div>
            </div>

            <div className="progress mt">
              <div className="progress-bar gradient" style={{ width: `${usedPct}%` }} />
            </div>

            <div className="form-inline mt">
              <div className="fi">
                <div className="f-label">Kalem</div>
                <input className="input" placeholder="örn. Veri etiketleme"
                  value={exLabel} onChange={(e) => setExLabel(e.target.value)} />
              </div>
              <div className="fi">
                <div className="f-label">Tutar (₺)</div>
                <input className="input" type="number" min={0}
                  value={exAmount} onChange={(e) => setExAmount(e.target.value)} />
              </div>
              <div className="fi">
                <div className="f-label">Tarih</div>
                <input className="input" type="date" value={exDate} onChange={(e) => setExDate(e.target.value)} />
              </div>
              <button className="btn primary add-btn" onClick={addExpense}>
                <Plus size={16} /> Ekle
              </button>
            </div>

            <div className="table mt">
              <div className="table-h">
                <div>Kalem</div>
                <div>Tarih</div>
                <div className="right">Tutar</div>
                <div></div>
              </div>
              {expenses.length === 0 && <div className="empty">Henüz harcama girilmedi.</div>}
              {expenses.map((e) => (
                <div key={e.id} className="table-r">
                  <div>{e.label}</div>
                  <div>{new Date(e.date).toLocaleDateString()}</div>
                  <div className="right">{currency(e.amount)}</div>
                  <div className="right">
                    <button className="icon-btn danger" onClick={() => removeExpense(e.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** ----------------- Küçük yardımcı bileşenler ----------------- */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pc">
      <div className="pc-h">
        <div className="pc-title">
          <span>{title}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function NoteEditor({ onAdd }: { onAdd: (text: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="note-editor">
      <input
        className="input"
        placeholder="Not yazın ve Enter'a basın…"
        value={val}
        onChange={(e) => setVal(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && val.trim()) {
            onAdd(val);
            setVal("");
          }
        }}
      />
      <button
        className="btn primary"
        onClick={() => {
          if (!val.trim()) return;
          onAdd(val);
          setVal("");
        }}
      >
        Ekle
      </button>
    </div>
  );
}