import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import TeamSection from "@/components/TeamSection";
import StatusPill, { ProjectStatus } from "@/components/StatusPill";
import MiniGantt from "@/components/MiniGantt";
import PhaseEditor, { ExtendedPhase } from "@/components/PhaseEditor";
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
  CheckCircle,
  RotateCcw,
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
} from "@/lib/api";
import { updateProject } from "@/lib/projects"; // Import updateProject
import { getProfileName } from "@/lib/auth";

/** ---- UI tipleri ---- */
export type Member = { id: string; name: string; role: string };
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
};

type BackendFile = {
  id: number;
  filename?: string;
  size_bytes?: number | null;
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
  }));

  const filesUi: Doc[] = files.map((f) => ({
    id: String(f.id),
    name: f.filename ?? "Dosya",
    sizeKB: Math.max(
      1,
      Math.round(((f.size_bytes ?? 0) as number) / 1024) || 1,
    ),
  }));

  const expensesUi: Expense[] = expenses.map((e) => ({
    id: String(e.id),
    label: e.note ?? "Harcama",
    amount: Number(e.amount ?? 0),
    date: (e.created_at ?? new Date().toISOString()).slice(0, 10),
  }));

  const planned = Number(budget?.total_budget ?? 0);
  const spent = Number(budget?.spent_amount ?? 0);

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
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n);
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
      } catch (err: any) {
        console.error("Proje fetch hata:", err);

        const fallback = MOCK.find((p) => p.id === (id || "p1")) ?? MOCK[0];

        if (!active) return;

        setProject(fallback);
        setNotes(fallback.notes);
        setFiles(fallback.files);
        setExpenses(fallback.initExpenses ?? []);
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
  const planned = project?.budget.planned ?? 0;
  const spent = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const remaining = Math.max(planned - spent, 0);
  const usedPct = planned > 0 ? Math.min(Math.round((spent / planned) * 100), 100) : 0;

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
            <FolderKanban size={22} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <h1>{project.name}</h1>
                <button
                  className="btn-soft"
                  style={{
                    fontSize: "12px",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    backgroundColor:
                      project.priority === "High" ? "rgba(239, 68, 68, 0.1)" :
                        project.priority === "Medium" ? "rgba(245, 158, 11, 0.1)" :
                          "rgba(34, 197, 94, 0.1)",
                    color:
                      project.priority === "High" ? "#ef4444" :
                        project.priority === "Medium" ? "#f59e0b" :
                          "#22c55e",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                  onClick={async () => {
                    const next =
                      project.priority === "High" ? "Normal" :
                        project.priority === "Medium" ? "High" :
                          "Medium";

                    try {
                      await updateProject(project.id, { priority: next });
                      setProject(prev => prev ? { ...prev, priority: next } : prev);
                    } catch (err) {
                      console.error("Failed to update priority", err);
                    }
                  }}
                  title="Önceliği değiştirmek için tıklayın"
                >
                  {project.priority === "High" ? "🔥 Önemli" :
                    project.priority === "Medium" ? "⚡ Orta" :
                      "🟢 Normal"}
                </button>
              </div>
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
            <StatusPill status={project.status} />
            <Link to="/" className="btn ghost">
              ← Projelere Dön
            </Link>
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
            className="btn primary"
            style={{ width: "100%", justifyContent: "center", height: 48, fontSize: 16, fontWeight: 600 }}
            onClick={() => navigate(`/project/${project.id}/plan`)}
          >
            <FileText size={20} style={{ marginRight: 8 }} />
            Detaylı Planı Görüntüle
          </button>
        </div>

        {/* KPI’lar */}
        <section className="pd-kpis kpis-wide">
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

        {/* 12 kolon layout */}
        <div className="pd-layout">
          {/* Sol ana */}
          <div className="pd-main">
            <Card title="Zaman Çizelgesi">
              <MiniGantt phases={project.phases} />
              <div className="pd-progress">
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${project.progress}%` }} />
                </div>
                <div className="progress-text">{project.progress}%</div>
              </div>
            </Card>

            {/* Notlar + Dosyalar yan yana */}
            <div className="pd-board">
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

              <Card title="Dosyalar">
                <label className="upload">
                  <Upload size={16} />
                  <span>Dosya ekle</span>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => addFiles(e.currentTarget.files)}
                  />
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
            </div>

          </div>

          {/* Sağ aside: Bütçe + Ekip */}
          <aside className="pd-aside sticky">
            <TeamSection
              owner={project.owner}
              team={project.team}
              onAddMember={(email) => addMember(email)}
              loading={addingMember}
            />

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

              <div className="progress mt" data-pct={usedPct}>
                <div className="progress-bar gradient" style={{ width: `${usedPct}%` }} />
              </div>

              <div className="form-inline mt">
                <div className="fi">
                  <div className="f-label">Kalem</div>
                  <input
                    className="input"
                    placeholder="örn. Veri etiketleme"
                    value={exLabel}
                    onChange={(e) => setExLabel(e.target.value)}
                  />
                </div>
                <div className="fi">
                  <div className="f-label">Tutar (₺)</div>
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
                {expenses.length === 0 && (
                  <div className="empty">Henüz harcama girilmedi.</div>
                )}
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
          </aside>
        </div>
      </div>
    </>
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
