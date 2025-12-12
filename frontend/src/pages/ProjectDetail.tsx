import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import TeamSection from "@/components/TeamSection";
import StatusPill, { ProjectStatus } from "@/components/StatusPill";
import MiniGantt from "@/components/MiniGantt";
import PhaseEditor, { ExtendedPhase } from "@/components/PhaseEditor";
import AuditLog from "@/components/AuditLog";
import ProjectResources from "@/components/ProjectResources";
import MilestoneTracker from "@/components/MilestoneTracker";
import {
  CalendarDays,
  Users,
  FileText,
  Upload,
  NotebookText,
  FolderKanban,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  apiGet,
  apiFetch,
  createProjectPhase,
  updateProjectPhase,
  deleteProjectPhase,
  getPhaseDetails,
  createPhaseDetail,
  updatePhaseDetail,
  deletePhaseDetail,
  BackendPhase,
  BackendPhaseDetail,
  BackendPhaseDetailUpdate,
  createProjectNote,
  uploadProjectFile,
  addLaborLog,
  deleteLaborLog,
  addExpense,
  deleteExpense,
  updateProjectBudget,
  mapLabor,
  LaborLog, // Import type
  deleteProjectFile, // and file delete

  // Extras
  createResource, deleteResource,
  createMilestone, toggleMilestone, deleteMilestone,
  ActivityDTO, ResourceDTO, MilestoneDTO, // Types
} from "@/lib/api";

import { updateProject } from "@/lib/projects"; // Import updateProject
import { getProfileName } from "@/lib/auth";

/** ---- UI tipleri ---- */
export type Member = { id: string; name: string; role: string };
type Note = { id: string; text: string; createdAt: string; author?: string };
type Doc = { id: string; name: string; sizeKB: number; uploader?: string };

// ...




type Expense = { id: string; label: string; amount: number; date: string };

export type FullProject = {
  id: string;
  name: string;
  owner: string;
  teamSize: number;
  team: Member[];
  status: ProjectStatus;
  priority?: "High" | "Medium" | "Normal";
  progress: number;
  startDate: string;
  endDate: string;
  phases: ExtendedPhase[];
  currentPhase: "baslangic" | "planlama" | "gelistirme" | "teslim";
  budget: {
    planned: number;
    spent?: number;
    remaining?: number;
  };
  notes: Note[];
  files: Doc[];
  initExpenses?: Expense[];
  initLaborLogs?: LaborLog[];

  activities?: ActivityDTO[];
  resources?: ResourceDTO[];
  milestones?: MilestoneDTO[];
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
      { id: "ph1", name: "Başlangıç", start: "2025-08-26", end: "2025-08-30", cls: "ph-discovery", items: [] },
      {
        id: "ph2", name: "Planlama", start: "2025-08-30", end: "2025-09-18", cls: "ph-design", items: [
          { id: "i1", title: "Gereksinim Analizi", completed: true },
          { id: "i2", title: "Teknik Mimari", completed: false }
        ]
      },
      { id: "ph3", name: "Yürütme", start: "2025-09-18", end: "2025-11-18", cls: "ph-dev", items: [] },
      { id: "ph4", name: "Test", start: "2025-11-18", end: "2025-12-10", cls: "ph-test", items: [] },
    ],
    currentPhase: "gelistirme",
    budget: { planned: 480000 },
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

/** ----------------- Backend yanıt tipleri ----------------- */
type BackendProject = {
  id: number;
  title?: string;
  status?: string;
  progress?: number;
  owner_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
};

type BackendProjectDetail = BackendProject & {
  members?: Array<{
    id: number;
    user_id: number;
    role_in_project?: string | null;
    user_name?: string | null;
    user_email?: string | null;
  }>;
  owner_name?: string | null;
  notes?: Array<{
    id: number;
    content?: string;
    created_at?: string;
    author_name?: string | null;
  }>;
  labor_logs?: Array<{
    id: number;
    user_id: number;
    user_name?: string | null;
    hours: number;
    cost: number;
    date: string;
  }>;
  total_budget?: number;
  spent_amount?: number;
  expenses?: Array<BackendExpense>;

  activities?: ActivityDTO[];
  resources?: ResourceDTO[];
  milestones?: MilestoneDTO[];
};


type BackendFile = {
  id: number;
  filename?: string;
  size_bytes?: number | null;
  uploader_name?: string | null;
};

type BackendExpense = {
  id: number;
  amount?: number | string;
  note?: string | null;
  created_at?: string;
};

type BackendBudget = {
  total_budget?: number | string;
  spent_amount?: number | string;
  remaining?: number | string;
};

// Helper: Build tree from flat list
function buildTree(items: BackendPhaseDetail[]): any[] {
  const map = new Map<number, any>();
  const roots: any[] = [];

  // Initialize map
  items.forEach(item => {
    map.set(item.id, {
      id: String(item.id),
      title: item.title,
      completed: item.is_completed,
      item_type: item.item_type || "task",
      children: []
    });
  });

  // Build tree
  items.forEach(item => {
    const node = map.get(item.id);
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

// Helper: Recursive find and update
function updateItemInTree(items: any[], itemId: string, updates: any): any[] {
  return items.map(item => {
    if (item.id === itemId) {
      return { ...item, ...updates };
    }
    if (item.children) {
      return { ...item, children: updateItemInTree(item.children, itemId, updates) };
    }
    return item;
  });
}

// Helper: Recursive find and delete
function deleteItemInTree(items: any[], itemId: string): any[] {
  return items.filter(item => item.id !== itemId).map(item => {
    if (item.children) {
      return { ...item, children: deleteItemInTree(item.children, itemId) };
    }
    return item;
  });
}

// Helper: Recursive find and add child
function addItemToTree(items: any[], parentId: string, newItem: any): any[] {
  return items.map(item => {
    if (item.id === parentId) {
      return { ...item, children: [...(item.children || []), newItem] };
    }
    if (item.children) {
      return { ...item, children: addItemToTree(item.children, parentId, newItem) };
    }
    return item;
  });
}

// Helper: Calculate progress from phases (Average of phase completion)
function calculateProgress(phases: ExtendedPhase[]): number {
  if (phases.length === 0) return 0;

  let totalPhaseProgress = 0;

  phases.forEach(p => {
    // If phase is manually marked as done, it's 100%
    if (p.status === "done") {
      totalPhaseProgress += 100;
      return;
    }

    // Otherwise calculate from tasks
    let totalItems = 0;
    let completedItems = 0;

    function traverse(items: any[]) {
      for (const item of items) {
        if (item.item_type === "task" || !item.item_type) {
          totalItems++;
          if (item.completed) completedItems++;
        }
        if (item.children) {
          traverse(item.children);
        }
      }
    }
    traverse(p.items);

    if (totalItems > 0) {
      totalPhaseProgress += (completedItems / totalItems) * 100;
    }
  });

  return Math.round(totalPhaseProgress / phases.length);
}

/** Backend'leri tek seferde çekip UI şekline çevirir */
async function fetchFullProject(id: string): Promise<FullProject> {
  const [base, detail, phases, budget, files, expenses] = await Promise.all([
    apiGet<BackendProject>(`/projects/${id}`),
    apiGet<BackendProjectDetail>(`/projects/${id}/detail`).catch(() => null),
    apiGet<BackendPhase[]>(`/projects/${id}/phases`).catch(() => []),
    apiGet<BackendBudget>(`/projects/${id}/budget`).catch(() => null),
    apiGet<BackendFile[]>(`/projects/${id}/files`).catch(() => []),
    apiGet<BackendExpense[]>(`/projects/${id}/expenses`).catch(() => []),
  ]);

  // Fetch details for all phases in parallel
  const phasesWithDetails = await Promise.all(
    phases.map(async (p) => {
      const details = await getPhaseDetails(String(p.id)).catch(() => []);
      return { ...p, details };
    })
  );

  const members = detail?.members ?? [];
  const team: Member[] = members.map((m) => ({
    id: String(m.user_id ?? m.id),
    name: m.user_name ?? `Kullanıcı #${m.user_id}`,
    role: m.role_in_project ?? "Üye",
  }));
  const owner =
    detail?.owner_name ??
    team.find((m) => (m.role || "").toLowerCase().includes("owner"))?.name ??
    "—";

  let phasesUi: ExtendedPhase[] = phasesWithDetails.map((p, idx) => ({
    id: String(p.id),
    name: p.name ?? `Faz ${idx + 1}`,
    start: p.start_date ?? new Date().toISOString(),
    end: p.end_date ?? p.start_date ?? new Date().toISOString(),
    cls: ["ph-discovery", "ph-design", "ph-dev", "ph-test"][idx % 4],
    items: buildTree(p.details)
  }));

  // Eğer hiç faz yoksa varsayılan 4 fazı ekle
  if (phasesUi.length === 0) {
    const now = new Date();
    phasesUi = [
      { id: "def1", name: "Başlangıç", start: now.toISOString(), end: now.toISOString(), cls: "ph-discovery", items: [] },
      { id: "def2", name: "Planlama", start: now.toISOString(), end: now.toISOString(), cls: "ph-design", items: [] },
      { id: "def3", name: "Yürütme", start: now.toISOString(), end: now.toISOString(), cls: "ph-dev", items: [] },
      { id: "def4", name: "Test", start: now.toISOString(), end: now.toISOString(), cls: "ph-test", items: [] },
    ];
  }

  const notesUi: Note[] = (detail?.notes ?? []).map((n) => ({
    id: String(n.id),
    text: n.content ?? "",
    createdAt: n.created_at ?? "",
    author: n.author_name ?? "Anonim",
  }));

  // ...

  const filesUi: Doc[] = files.map((f) => ({
    id: String(f.id),
    name: f.filename ?? "Dosya",
    sizeKB: Math.max(
      1,
      Math.round(((f.size_bytes ?? 0) as number) / 1024) || 1,
    ),
    uploader: f.uploader_name ?? "Bilinmiyor",
  }));

  const expensesUi: Expense[] = (detail?.expenses ?? expenses).map((e) => ({
    id: String(e.id),
    label: e.note ?? "Harcama",
    amount: Number(e.amount ?? 0),
    date: (e.created_at ?? new Date().toISOString()).slice(0, 10),
  }));

  const laborLogsUi: LaborLog[] = (detail?.labor_logs ?? []).map((l) => ({
    id: String(l.id),
    memberId: String(l.user_id),
    memberName: l.user_name || "Unknown",
    hours: l.hours,
    cost: l.cost,
    date: l.date.toString().slice(0, 10),
  }));

  // Prefer detail budget, fallback to separate budget call
  const planned = Number(detail?.total_budget ?? budget?.total_budget ?? 0);
  const spent = Number(detail?.spent_amount ?? budget?.spent_amount ?? 0);

  const status = normalizeStatus(
    detail?.status ?? base.status ?? "planning",
  );

  // Calculate progress dynamically
  const calculatedProgress = calculateProgress(phasesUi);

  return {
    id: String(detail?.id ?? base.id),
    name: detail?.title ?? base.title ?? "Adsız Proje",
    owner,
    teamSize: team.length,
    team,
    status,
    progress: calculatedProgress, // Use calculated progress
    startDate: detail?.start_date ?? base.start_date ?? new Date().toISOString(),
    endDate: detail?.end_date ?? base.end_date ?? new Date().toISOString(),
    phases: phasesUi,
    currentPhase: pickCurrentPhase(phasesUi, status),
    budget: {
      planned,
      spent,
      remaining: planned ? Math.max(planned - spent, 0) : undefined,
    },
    notes: notesUi,
    files: filesUi,
    initExpenses: expensesUi,
    initLaborLogs: laborLogsUi,
    activities: detail?.activities ?? [],
    resources: detail?.resources ?? [],
    milestones: detail?.milestones ?? [],
  };
}

function normalizeStatus(raw: string): ProjectStatus {
  const s = (raw || "").toLowerCase();
  if (["executing", "monitoring", "active"].includes(s)) return "active";
  if (["closed", "done"].includes(s)) return "done";
  if (["risk", "at-risk"].includes(s)) return "at-risk";
  if (["hold", "on-hold"].includes(s)) return "on-hold";
  return "planning";
}

function pickCurrentPhase(phases: ExtendedPhase[], status: ProjectStatus): FullProject["currentPhase"] {
  if (!phases.length) {
    if (status === "active") return "gelistirme";
    if (status === "done") return "teslim";
    return "planlama";
  }
  const now = Date.now();
  const activeIdx = phases.findIndex((p) => new Date(p.end).getTime() > now);
  if (activeIdx >= 0) {
    return (["baslangic", "planlama", "gelistirme", "teslim"] as const)[
      Math.min(activeIdx, 3)
    ];
  }
  return "teslim";
}

function currency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUserName = getProfileName();

  const [project, setProject] = useState<FullProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Notlar / dosyalar / harcamalar için local state
  const [notes, setNotes] = useState<Note[]>([]);
  const [files, setFiles] = useState<Doc[]>([]);

  const [addingPhase, setAddingPhase] = useState(false);
  const [addingItem, setAddingItem] = useState(false);

  // Budget State
  const [laborLogs, setLaborLogs] = useState<LaborLog[]>([]);
  const [plannedBudget, setPlannedBudget] = useState(0);

  // Labor Form State
  const [laborMemberId, setLaborMemberId] = useState("");
  const [laborHours, setLaborHours] = useState("");
  const [laborDate, setLaborDate] = useState(new Date().toISOString().split('T')[0]);

  // General Expenses State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);


  // Harcama form state
  const [exLabel, setExLabel] = useState("");
  const [exAmount, setExAmount] = useState<string>("");
  const [exDate, setExDate] = useState(() => new Date().toISOString().slice(0, 10));

  // 🔹 SAYFA YÜKLENİNCE BACKEND'TEN PROJE ÇEK
  useEffect(() => {
    let active = true;

    async function fetchProject() {
      setLoading(true);
      setLoadError(null);

      try {
        if (!id) throw new Error("URL'de proje id yok");

        const data = await fetchFullProject(id);
        if (!active) return;

        setProject(data);
        setNotes(data.notes ?? []);
        setFiles(data.files ?? []);
        setExpenses(data.initExpenses ?? []);
        setLaborLogs(data.initLaborLogs ?? []); // Initialize labor logs
        setPlannedBudget(data.budget.planned ?? 0); // Initialize planned budget
      } catch (err: any) {
        console.error("Proje fetch hata:", err);

        const fallback = MOCK.find((p) => p.id === (id || "p1")) ?? MOCK[0];

        if (!active) return;

        setProject(fallback);
        setNotes(fallback.notes);
        setFiles(fallback.files);
        setExpenses(fallback.initExpenses ?? []);
        setLaborLogs([]); // Fallback for labor logs
        setPlannedBudget(fallback.budget.planned ?? 0); // Fallback for planned budget
        setLoadError("Backend'ten proje alınamadı, mock veri gösteriliyor.");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchProject();
    return () => {
      active = false;
    };
  }, [id]);

  // Bütçe hesapları
  const spent = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  // const planned = project?.budget.planned ?? 0; // No longer directly from project
  // const remaining = Math.max(planned - spent, 0); // Calculated in JSX now
  // const usedPct = planned > 0 ? Math.min(Math.round((spent / planned) * 100), 100) : 0; // Calculated in JSX now

  /** Not ekle */
  async function addNote(text: string) {
    if (!text.trim() || !project) return;
    try {
      const newNote = await createProjectNote(project.id, text.trim());
      setNotes((prev) => [
        {
          id: String(newNote.id),
          text: newNote.text,
          createdAt: new Date(newNote.created_at).toLocaleString(),
          author: newNote.author_name || currentUserName || "Ben"
        },
        ...prev,
      ]);
    } catch (err) {
      console.error("Not eklenirken hata:", err);
      alert("Not eklenemedi.");
    }
  }

  /** Dosya “yükle” */
  async function addFiles(list: FileList | null) {
    if (!list || list.length === 0 || !project) return;

    // Upload files sequentially or parallel? Parallel is fine.
    const filesToUpload = Array.from(list);

    try {
      const uploadedFiles = await Promise.all(
        filesToUpload.map(f => uploadProjectFile(project.id, f))
      );

      const next: Doc[] = uploadedFiles.map(f => ({
        id: String(f.id),
        name: f.name,
        sizeKB: f.size_kb || 0,
        uploader: f.uploader_name || currentUserName || "Ben"
      }));

      setFiles((prev) => [...next, ...prev]);
    } catch (err) {
      console.error("Dosya yüklenirken hata:", err);
      alert("Dosya yüklenemedi. Lütfen tekrar deneyin.");
    }
  }

  /** Harcama ekle/sil (API) */
  async function handleAddExpense() {
    const val = Number(exAmount);
    if (!exLabel.trim() || !val || val <= 0 || !project) return;
    try {
      const newEx = await addExpense(project.id, exLabel.trim(), val, exDate);
      setExpenses((prev) => [
        { id: String(newEx.id), label: newEx.label, amount: newEx.amount, date: newEx.date },
        ...prev,
      ]);
      setExLabel("");
      setExAmount("");
    } catch (err) {
      console.error("Harcama eklenemedi:", err);
      alert("Harcama eklenirken hata oluştu.");
    }
  }

  async function handleRemoveExpense(eid: string) {
    if (!project) return;
    if (!confirm("Harcamayı silmek istediğinize emin misiniz?")) return;
    try {
      await deleteExpense(project.id, eid);
      setExpenses((prev) => prev.filter((e) => e.id !== eid));
    } catch (err) {
      console.error("Harcama silinemedi:", err);
      alert("Silme işlemi başarısız.");
    }
  }

  async function handleAddLaborLog() {
    if (!laborMemberId || !laborHours || !project) return;
    const member = project.team.find(m => m.id === laborMemberId);
    if (!member) return;

    try {
      const hours = Number(laborHours);
      const newLog = await addLaborLog(project.id, member.id, hours, laborDate);
      setLaborLogs([...laborLogs, newLog]);
      setLaborHours("");
      setLaborMemberId("");
    } catch (err) {
      console.error("Efor eklenemedi:", err);
      alert("Efor eklenirken hata oluştu.");
    }
  }

  async function handleRemoveLaborLog(lid: string) {
    if (!project) return;
    if (!confirm("Efor kaydını silmek istediğinize emin misiniz?")) return;
    try {
      await deleteLaborLog(project.id, lid);
      setLaborLogs((prev) => prev.filter((l) => l.id !== lid));
    } catch (err) {
      console.error("Efor silinemedi:", err);
      alert("Silme işlemi başarısız.");
    }
  }

  async function addMember(emailOverride?: string) {
    const emailToUse = emailOverride || newMemberEmail;
    if (!id || !emailToUse.trim()) return;
    setAddingMember(true);
    setMemberError(null);
    try {
      // e-postadan kullanıcı bul
      const userLookup = await apiGet<{
        found: boolean;
        id?: number;
        name?: string;
        email?: string;
      }>(`/debug/db/user/by-email?email=${encodeURIComponent(emailToUse)}`);

      if (!userLookup.found || !userLookup.id) {
        throw new Error("E-posta ile kullanıcı bulunamadı");
      }

      const res = await apiFetch<{
        id: number;
        user_id: number;
        role_in_project?: string;
        user_name?: string | null;
        user_email?: string | null;
      }>(`/projects/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userLookup.id, role_in_project: "contributor" }),
      });
      const member: Member = {
        id: String(res.user_id || res.id),
        name: res.user_name ?? userLookup.name ?? `Kullanıcı #${res.user_id}`,
        role: res.role_in_project ?? "member",
      };
      setProject((prev) =>
        prev
          ? {
            ...prev,
            team: [...prev.team, member],
            teamSize: prev.teamSize + 1,
          }
          : prev,
      );
      setNewMemberEmail("");
    } catch (err: any) {
      setMemberError(err?.message || "Ekip üyesi eklenemedi");
    } finally {
      setAddingMember(false);
    }
  }

  // --- Project Status Handler ---
  async function handleToggleStatus() {
    if (!project) return;
    try {
      const newStatus = project.status === "done" ? "planning" : "closed"; // Reactivate to planning, Close to closed
      await updateProject(project.id, { status: newStatus as any });

      // Update local state
      setProject(prev => prev ? { ...prev, status: newStatus === "closed" ? "done" : "planning" } : prev);
    } catch (err) {
      console.error("Failed to update project status:", err);
      alert("Proje durumu güncellenemedi.");
    }
  }

  // --- Phase Handlers ---

  // Helper: Ensure all default phases are persisted to backend
  async function persistDefaultPhases(currentPhases: ExtendedPhase[]): Promise<ExtendedPhase[] | null> {
    if (!project) return null;
    const hasDefaults = currentPhases.some(p => p.id.startsWith("def"));
    if (!hasDefaults) return currentPhases;

    try {
      const newPhases = [...currentPhases];

      // We process sequentially or parallel? Parallel is faster but we need to be careful with order if backend relies on insertion order for something (though we send sort_order).
      // Let's use Promise.all
      await Promise.all(newPhases.map(async (p, index) => {
        if (p.id.startsWith("def")) {
          const res = await createProjectPhase(project.id, {
            name: p.name,
            start_date: p.start,
            end_date: p.end,
            status: p.status as any,
            sort_order: index + 1
          });

          // Update with real ID
          newPhases[index] = {
            ...p,
            id: String(res.id),
            // Keep items if any (though defaults usually have none)
          };
        }
      }));

      return newPhases;
    } catch (err) {
      console.error("Failed to persist default phases", err);
      alert("Varsayılan fazlar kaydedilirken hata oluştu.");
      return null;
    }
  }

  async function handleAddPhase() {
    if (!project) return;

    // 1. Ensure defaults are persisted first
    let currentPhases = project.phases;
    if (currentPhases.some(p => p.id.startsWith("def"))) {
      const persisted = await persistDefaultPhases(currentPhases);
      if (!persisted) return; // Error happened

      currentPhases = persisted;
      setProject(prev => prev ? { ...prev, phases: persisted } : prev);
    }

    try {
      console.log("Adding phase for project:", project.id);
      const res = await createProjectPhase(project.id, {
        name: "Yeni Faz",
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString(),
        status: "not_started",
        sort_order: currentPhases.length + 1
      });

      const newPhase: ExtendedPhase = {
        id: String(res.id),
        name: res.name,
        start: res.start_date ?? new Date().toISOString(),
        end: res.end_date ?? new Date().toISOString(),
        cls: "ph-design",
        status: res.status ?? "not_started",
        items: []
      };

      setProject(prev => prev ? { ...prev, phases: [...currentPhases, newPhase] } : prev);
    } catch (err: any) {
      console.error("Failed to add phase", err);
      alert("Faz eklenirken hata oluştu: " + (err.message || err));
    }
  }

  async function handleUpdatePhase(id: string, updates: Partial<ExtendedPhase>) {
    if (!project) return;

    // Handle default/mock phases
    if (id.startsWith("def")) {
      // If we are editing a default phase, we should persist ALL default phases to ensure consistency
      // and prevent them from disappearing on reload.
      const index = project.phases.findIndex(p => p.id === id);
      if (index === -1) return;

      const persisted = await persistDefaultPhases(project.phases);
      if (!persisted) return;

      // Now apply the update to the specific phase (which now has a real ID)
      const realPhase = persisted[index];
      const newId = realPhase.id;

      // Optimistic update on the already persisted list
      const updatedList = persisted.map((p, i) => i === index ? { ...p, ...updates } : p);
      setProject(prev => prev ? { ...prev, phases: updatedList } : prev);

      try {
        // Send the specific update to backend
        const backendUpdates: any = {};
        if (updates.name) backendUpdates.name = updates.name;
        if (updates.start) backendUpdates.start_date = updates.start;
        if (updates.end) backendUpdates.end_date = updates.end;
        if (updates.status) backendUpdates.status = updates.status;

        if (Object.keys(backendUpdates).length > 0) {
          await updateProjectPhase(project.id, newId, backendUpdates);
        }
      } catch (err: any) {
        console.error("Failed to update phase after persist", err);
        alert("Faz güncellenemedi: " + (err.message || err));
      }
      return;
    }

    // Normal update for existing phases
    // Optimistic update
    setProject(prev => prev ? {
      ...prev,
      phases: prev.phases.map(p => p.id === id ? { ...p, ...updates } : p)
    } : prev);

    try {
      // Map UI updates to Backend updates
      const backendUpdates: any = {};
      if (updates.name) backendUpdates.name = updates.name;
      if (updates.start) backendUpdates.start_date = updates.start;
      if (updates.end) backendUpdates.end_date = updates.end;
      if (updates.status) backendUpdates.status = updates.status;

      if (Object.keys(backendUpdates).length > 0) {
        await updateProjectPhase(project.id, id, backendUpdates);
      }
    } catch (err: any) {
      console.error("Failed to update phase", err);
      alert("Faz güncellenemedi: " + (err.message || err));
    }
  }

  async function handleDeletePhase(id: string) {
    if (!project) return;

    // Handle default/mock phases (just remove from UI)
    if (id.startsWith("def")) {
      setProject(prev => prev ? {
        ...prev,
        phases: prev.phases.filter(p => p.id !== id)
      } : prev);
      return;
    }

    try {
      await deleteProjectPhase(project.id, id);
      setProject(prev => prev ? {
        ...prev,
        phases: prev.phases.filter(p => p.id !== id)
      } : prev);
    } catch (err: any) {
      console.error("Failed to delete phase", err);
      alert("Faz silinemedi: " + (err.message || err));
    }
  }

  // Helper to calculate and save progress
  async function updateProjectProgress(currentPhases: ExtendedPhase[]) {
    if (!project) return;

    const newProgress = calculateProgress(currentPhases);

    // Optimistic update for progress
    setProject(prev => prev ? { ...prev, progress: newProgress } : prev);

    // Save to backend
    try {
      await apiFetch(`/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ progress: newProgress })
      });
    } catch (err) {
      console.error("Failed to update project progress", err);
    }
  }

  // --- Item Handlers ---

  async function handleAddItem(phaseId: string, title: string, parentId?: string, type: string = "task") {
    if (!project) return;
    try {
      const res = await createPhaseDetail({
        phase_id: Number(phaseId),
        title: title,
        sort_order: 0,
        parent_id: parentId ? Number(parentId) : undefined,
        item_type: type
      });

      const newItem = {
        id: String(res.id),
        title: res.title,
        completed: res.is_completed ?? false,
        item_type: res.item_type,
        children: []
      };

      const updatedPhases = project.phases.map(p => {
        if (p.id === phaseId) {
          if (parentId) {
            return { ...p, items: addItemToTree(p.items, parentId, newItem) };
          } else {
            return { ...p, items: [...p.items, newItem] };
          }
        }
        return p;
      });

      setProject(prev => prev ? {
        ...prev,
        phases: updatedPhases
      } : prev);

      // Update project progress after adding an item
      updateProjectProgress(updatedPhases);

    } catch (err) {
      console.error("Failed to add item", err);
    }
  }

  async function handleUpdateItem(itemId: string, updates: Partial<{ title: string; completed: boolean }>) {
    if (!project) return;

    // 1. Optimistic Update
    const updatedPhases = project.phases.map(p => ({
      ...p,
      items: updateItemInTree(p.items, itemId, updates)
    }));

    setProject(prev => prev ? {
      ...prev,
      phases: updatedPhases
    } : prev);

    // 2. Calculate & Save Progress if completed status changed
    if (updates.completed !== undefined) {
      updateProjectProgress(updatedPhases);
    }

    // 3. Save Item Update
    try {
      const backendUpdates: BackendPhaseDetailUpdate = {};
      if (updates.title) backendUpdates.title = updates.title;
      if (updates.completed !== undefined) backendUpdates.is_completed = updates.completed;

      await updatePhaseDetail(itemId, backendUpdates);
    } catch (err) {
      console.error("Failed to update item", err);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!project) return;
    try {
      await deletePhaseDetail(itemId);
      setProject(prev => prev ? {
        ...prev,
        phases: prev.phases.map(p => ({
          ...p,
          items: deleteItemInTree(p.items, itemId)
        }))
      } : prev);
    } catch (err) {
      console.error("Failed to delete item", err);
    }
  }

  // --- Extras Handlers ---
  const handleAddResource = async (label: string, url: string, type: string) => {
    if (!project) return;
    try {
      await createResource(project.id, label, url, type);
      setProject(await fetchFullProject(project.id));
    } catch (err) { console.error(err); }
  };
  const handleDeleteResource = async (rid: number) => {
    if (!project) return;
    try {
      await deleteResource(project.id, rid);
      setProject(await fetchFullProject(project.id));
    } catch (err) { console.error(err); }
  };
  const handleAddMilestone = async (title: string, date: string) => {
    if (!project) return;
    await createMilestone(project.id, title, date);
    setProject(await fetchFullProject(project.id));
  };
  const handleToggleMilestone = async (mid: number) => {
    if (!project) return;
    await toggleMilestone(project.id, mid);
    setProject(await fetchFullProject(project.id));
  };
  const handleDeleteMilestone = async (mid: number) => {
    if (!project) return;
    await deleteMilestone(project.id, mid);
    setProject(await fetchFullProject(project.id));
  };

  // Yükleniyor durumu
  if (loading && !project) {
    return (
      <>
        <Navbar
          username={currentUserName}
          showFinished={false}
          onToggleFinished={() => { }}
          onAddProject={() => { }}
          showAddProject={false}
        />
        <div className="page page-detail">
          <div className="empty" style={{ marginTop: 40 }}>Proje yükleniyor…</div>
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <Navbar
          username={currentUserName}
          showFinished={false}
          onToggleFinished={() => { }}
          onAddProject={() => { }}
          showAddProject={false}
        />
        <div className="page page-detail">
          <div className="empty" style={{ marginTop: 40 }}>
            Proje bulunamadı.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar
        username={currentUserName}
        showFinished={false}
        onToggleFinished={() => { }}
        onAddProject={() => { }}
        showAddProject={false}
      />

      <div className="page page-detail">

        {/* Hata mesajı (mock fallback kullanıyorsak) */}
        {loadError && (
          <div className="pc" style={{ marginBottom: 12, borderStyle: "dashed" }}>
            <div className="pc-h">
              <div className="pc-title">
                <span>Uyarı</span>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>{loadError}</div>
          </div>
        )}

        {/* Başlık şeridi */}
        <div className="pd-head">
          <button className="btn ghost" onClick={() => navigate(-1)}>
            <ChevronLeft size={18} /> Geri
          </button>

          <div className="pd-title">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-0.5px' }}>{project.name}</h1>
                <span style={{
                  fontSize: '12px', padding: '4px 10px', borderRadius: '20px', fontWeight: '600',
                  backgroundColor: project.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : project.priority === 'Medium' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                  color: project.priority === 'High' ? '#ef4444' : project.priority === 'Medium' ? '#eab308' : '#22c55e',
                  border: '1px solid currentColor',
                  opacity: 0.9
                }}>
                  {project.priority === "High" ? "Yüksek" : project.priority === "Medium" ? "Orta" : "Normal"}
                </span>
              </div>

              <div className="pd-sub" style={{ display: 'flex', gap: '24px', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--item-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <CalendarDays size={15} className="text-muted" />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
                    {new Date(project.startDate).toLocaleDateString()} — {new Date(project.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--item-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <Users size={15} className="text-muted" />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{project.teamSize} Kişi</span>
                </div>
              </div>
            </div>

          </div>

          <div className="pd-head-right">
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className={`btn ${project.status === 'done' ? 'primary' : 'soft'}`}
                style={{
                  marginRight: '12px',
                  fontSize: '13px',
                  padding: '8px 16px',
                  backgroundColor: project.status === 'done' ? 'var(--primary)' : 'rgba(34, 197, 94, 0.1)',
                  color: project.status === 'done' ? '#fff' : 'var(--success)',
                  border: '1px solid ' + (project.status === 'done' ? 'transparent' : 'rgba(34, 197, 94, 0.2)'),
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: project.status === 'done' ? '0 2px 4px rgba(59, 130, 246, 0.2)' : 'none'
                }}
                onClick={handleToggleStatus}
              >
                {project.status === 'done' ? (
                  <>
                    <RotateCcw size={16} />
                    <span>Projeyi Aktif Et</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    <span>Projeyi Tamamla</span>
                  </>
                )}
              </button>



              <Link to="/" className="btn ghost">
                ← Projelere Dön
              </Link>
            </div>
          </div>
        </div>

        {project.status === 'done' && (
          <div style={{
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid var(--success)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--success-dark)'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>✓</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>Bu proje tamamlandı!</div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>Proje başarıyla tamamlandı ve arşivlendi. Tekrar aktif etmek için yukarıdaki butonu kullanabilirsiniz.</div>
            </div>
          </div>
        )}

        <PhaseEditor
          phases={project.phases}
          onAddPhase={handleAddPhase}
          onUpdatePhase={handleUpdatePhase}
          onDeletePhase={handleDeletePhase}
          onAddItem={handleAddItem}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
        />

        {/* Detay Butonu */}
        <div style={{ marginTop: 16, marginBottom: 24 }}>
          <button
            className="btn primary btn-detail-plan"
            style={{ width: "100%", justifyContent: "center", height: 48, fontSize: 16, fontWeight: 600 }}
            onClick={() => navigate(`/project/${project.id}/plan`)}
          >
            <FileText size={20} style={{ marginRight: 8 }} />
            Detaylı Planı Görüntüle
          </button>
        </div>


        {/* KPI Section REMOVED based on user request */}


        {/* 12 kolon layout */}
        {/* 12 kolon layout */}
        <div className="pd-grid">
          {/* Sol ana */}
          <div className="pd-col">

            {/* NEW HORIZONTAL TEAM BAR */}
            <Card title="Proje Ekibi" collapsible={false}>
              <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {/* Owner */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    backgroundColor: 'var(--bg-body)', padding: '6px 14px', borderRadius: '50px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                    }}>
                      <ShieldCheck size={14} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{project.owner}</span>
                      <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Proje Sahibi</span>
                    </div>
                  </div>

                  {/* Team Members */}
                  {project.team.map(m => (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      backgroundColor: 'var(--bg-body)', padding: '6px 14px', borderRadius: '50px',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: 'var(--item-bg)', color: 'var(--text)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px'
                      }}>
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{m.name}</span>
                        <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{m.role}</span>
                      </div>
                    </div>
                  ))}

                  {/* Add Button */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      backgroundColor: 'var(--bg-body)', padding: '4px', paddingLeft: '12px', borderRadius: '50px',
                      border: '1px dashed var(--border)', marginLeft: '0px'
                    }}>
                      <input
                        placeholder="Kişi ekle..."
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100px' }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            addMember(e.currentTarget.value);
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                      <button style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Zaman Çizelgesi">
              {/* Added a small progress indicator in the card header or just below title could be nice, 
                  User said "small box". I will put it right inside the card here as a compact row. 
              */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', background: 'var(--item-bg)', padding: '8px 16px', borderRadius: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Genel İlerleme</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '60px', height: '6px', background: 'var(--item-border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${project.progress}%`, height: '100%', background: 'var(--primary)', borderRadius: '3px' }}></div>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{project.progress}%</span>
                </div>
              </div>

              <MiniGantt phases={project.phases} />
            </Card>

            {/* Notlar + Dosyalar yan yana */}
            <div className="pd-board">
              <Card title="Notlar" collapsible={false}>
                <NoteEditor onAdd={addNote} />
                <CollapsibleSubSection title={`Önceki Notlar (${notes.length})`} defaultOpen={false}>
                  <ul className="note-list">
                    {notes.length === 0 && <div className="empty">Henüz not yok.</div>}
                    {notes.map((n) => (
                      <li key={n.id} className="note-item">
                        <div className="note-avatar">
                          {/* Simple avatar or icon */}
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "bold" }}>
                            {(n.author || "A").charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                            <span className="note-author" style={{ fontWeight: 600, fontSize: "13px", color: "var(--text)" }}>
                              {n.author}
                            </span>
                            <span className="note-date" style={{ fontSize: "11px", color: "var(--muted)" }}>
                              {n.createdAt}
                            </span>
                          </div>
                          <div className="note-text" style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                            {n.text}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CollapsibleSubSection>
              </Card>

              <Card title="Dosyalar" collapsible={false}>
                <label className="upload">
                  <Upload size={16} />
                  <span>Dosya ekle</span>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => addFiles(e.currentTarget.files)}
                  />
                </label>

                <CollapsibleSubSection title={`Önceki Dosyalar (${files.length})`} defaultOpen={false}>
                  <ul className="files">
                    {files.length === 0 && <div className="empty">Dosya eklenmemiş.</div>}
                    {files.map((f) => (
                      <li key={f.id} className="file-item">
                        <div className="file-icon-area">
                          <FileText size={20} className="text-primary" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="file-name">{f.name}</div>
                          <div style={{ display: "flex", gap: "8px", fontSize: "11px", color: "var(--muted)" }}>
                            <span>{f.sizeKB} KB</span>
                            <span>•</span>
                            <span>{f.uploader}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CollapsibleSubSection>
              </Card>
            </div>

            {/* Extras Row (Resources & Milestones) */}
            <div className="pd-board" style={{ marginTop: '24px' }}>
              <ProjectResources
                items={project.resources || []}
                onAdd={handleAddResource}
                onDelete={handleDeleteResource}
              />
              <MilestoneTracker
                items={project.milestones || []}
                onAdd={handleAddMilestone}
                onToggle={handleToggleMilestone}
                onDelete={handleDeleteMilestone}
              />
            </div>

          </div>


          <aside className="pd-aside sticky">

            <Card title="Bütçe">
              {/* 1. Overview Cards */}
              <div className="budget-nums">
                <div className="bn">
                  <div className="bn-h">Planlanan</div>
                  <div className="bn-v" style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', marginRight: '4px', color: 'var(--muted)' }}>$</span>
                    <input
                      value={plannedBudget}
                      onChange={(e) => setPlannedBudget(Number(e.target.value))}
                      onBlur={() => {
                        if (project) updateProjectBudget(project.id, plannedBudget).catch(console.error);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px dashed var(--border)',
                        color: 'var(--text)',
                        fontSize: '24px',
                        fontWeight: 800,
                        width: '120px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
                <div className="bn">
                  <div className="bn-h">Harcanan</div>
                  <div className="bn-v">${(spent + laborLogs.reduce((acc, l) => acc + l.cost, 0)).toLocaleString()}</div>
                </div>
                <div className="bn">
                  <div className="bn-h">Kalan</div>
                  <div className="bn-v accent">${(plannedBudget - (spent + laborLogs.reduce((acc, l) => acc + l.cost, 0))).toLocaleString()}</div>
                </div>
              </div>

              <div className="progress mt" data-pct={(spent + laborLogs.reduce((acc, l) => acc + l.cost, 0)) / plannedBudget * 100} style={{ height: '12px', background: 'var(--item-bg)', borderRadius: '6px', overflow: 'hidden', marginTop: '24px' }}>
                <div className="progress-bar gradient" style={{ width: `${Math.min(((spent + laborLogs.reduce((acc, l) => acc + l.cost, 0)) / plannedBudget * 100), 100)}%`, height: '100%', background: 'var(--btn-gradient)', borderRadius: '6px', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>%{Math.round(((spent + laborLogs.reduce((acc, l) => acc + l.cost, 0)) / plannedBudget * 100) || 0)} Kullanıldı</div>

              {/* 2. Labor Costs Section */}
              <div style={{ marginTop: '32px' }}>
                <CollapsibleSubSection title={`Efor Maliyeti ($${laborLogs.reduce((acc, l) => acc + l.cost, 0).toLocaleString()})`} defaultOpen={true}>
                  <div className="form-inline mt" style={{ gridTemplateColumns: '1fr 1fr auto auto' }}>
                    <div className="fi">
                      <div className="f-label">Üye</div>
                      <select
                        className="input"
                        value={laborMemberId}
                        onChange={(e) => setLaborMemberId(e.target.value)}
                      >
                        <option value="">Seçiniz...</option>
                        {project?.team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div className="fi">
                      <div className="f-label">Saat</div>
                      <input
                        className="input"
                        type="number"
                        placeholder="örn. 8"
                        value={laborHours}
                        onChange={(e) => setLaborHours(e.target.value)}
                      />
                    </div>
                    <div className="fi">
                      <div className="f-label">Tarih</div>
                      <input
                        className="input"
                        type="date"
                        value={laborDate}
                        onChange={(e) => setLaborDate(e.target.value)}
                      />
                    </div>
                    <button
                      className="btn primary add-btn"
                      onClick={handleAddLaborLog}
                      style={{ marginTop: 'auto' }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="table mt">
                    <div className="table-h" style={{ gridTemplateColumns: '2fr 1fr 1fr 48px' }}>
                      <div>Kişi</div>
                      <div>Saat</div>
                      <div className="right">Tutar</div>
                      <div></div>
                    </div>
                    {laborLogs.length === 0 && <div className="empty-sm">Henüz efor girilmedi.</div>}
                    {laborLogs.map(l => (
                      <div key={l.id} className="table-r" style={{ gridTemplateColumns: '2fr 1fr 1fr 48px' }}>
                        <div>{l.memberName}</div>
                        <div>{l.hours} sa</div>
                        <div className="right">${Number(l.cost).toLocaleString()}</div>
                        <div className="right">
                          <button className="icon-btn danger" onClick={() => handleRemoveLaborLog(l.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleSubSection>
              </div>

              {/* 3. General Expenses Section */}
              <div style={{ marginTop: '24px' }}>
                <CollapsibleSubSection title={`Ekstra Giderler ($${spent.toLocaleString()})`} defaultOpen={false}>
                  <div className="form-inline mt">
                    <div className="fi">
                      <div className="f-label">Kalem</div>
                      <input
                        className="input"
                        value={exLabel}
                        onChange={(e) => setExLabel(e.target.value)}
                      />
                    </div>
                    <div className="fi">
                      <div className="f-label">Tutar</div>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        value={exAmount}
                        onChange={(e) => setExAmount(e.target.value)}
                      />
                    </div>
                    <div className="fi">
                      <div className="f-label">Tarih</div>
                      <input
                        className="input"
                        type="date"
                        value={exDate}
                        onChange={(e) => setExDate(e.target.value)}
                      />
                    </div>
                    <button className="btn primary add-btn" onClick={handleAddExpense} style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center' }}>
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="table mt">
                    <div className="table-h">
                      <div>Kalem</div>
                      <div>Tarih</div>
                      <div className="right">Tutar</div>
                      <div></div>
                    </div>
                    {expenses.length === 0 && (
                      <div className="empty-sm">Henüz harcama girilmedi.</div>
                    )}
                    {expenses.map((e) => (
                      <div key={e.id} className="table-r">
                        <div>{e.label}</div>
                        <div>{new Date(e.date).toLocaleDateString()}</div>
                        <div className="right">{currency(e.amount)}</div>
                        <div className="right">
                          <button className="icon-btn danger" onClick={() => handleRemoveExpense(e.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleSubSection>
              </div>
            </Card>
          </aside>
        </div>
      </div>


    </>
  );
}

/** ----------------- Küçük yardımcı bileşenler ----------------- */



// ...


function Card({
  title,
  children,
  collapsible = false,
  defaultOpen = true
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // If not collapsible, always open
  const showContent = !collapsible || isOpen;

  return (
    <div className="pc">
      <div
        className="pc-h"
        onClick={() => collapsible && setIsOpen(!isOpen)}
        style={{
          cursor: collapsible ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div className="pc-title">
          <span>{title}</span>
        </div>
        {collapsible && (
          <div style={{ color: "var(--muted)" }}>
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        )}
      </div>
      {showContent && children}
    </div>
  );
}

function CollapsibleSubSection({
  title,
  children,
  defaultOpen = false
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div style={{ marginTop: 12 }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--muted)',
          marginBottom: 8,
          userSelect: 'none'
        }}
      >
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        <span>{title}</span>
      </div>
      {isOpen && children}
    </div>
  )
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
