import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Search, Layout, Plus, X, ChevronRight, ChevronLeft, ChevronDown, Filter, MessageSquare, Send, CheckCircle2, Check } from "lucide-react";
import { getProfileName } from "@/lib/auth";
import {
    apiGet,
    BackendPhase,
    BackendPhaseDetail,
    getPhaseDetails,
    updatePhaseDetail,
    createPhaseDetail,
    deletePhaseDetail,
    getPhaseDetailNotes,
    createPhaseDetailNote,
    BackendPhaseDetailNote
} from "@/lib/api";

// --- Types ---

type PlanItem = {
    id: string;
    action: string;
    phase: string;
    scope: string;
    reference: string;
    responsible: string;
    effort: number;
    unit: string;
    start_date: string | null;
    end_date: string | null;
    priority: string;
    category: string;
    original: BackendPhaseDetail;
    parentId?: string;
    completed_at: string | null;
};

type PhaseWithDetails = BackendPhase & {
    details: BackendPhaseDetail[];
};

// --- Utils ---

const getDaysArray = (start: Date, days: number) => {
    return Array.from({ length: days }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
    });
};

const formatDay = (d: Date) => d.getDate();
const formatMonth = (d: Date) => d.toLocaleString('tr-TR', { month: 'short' }).toUpperCase();

// --- Styles ---
const styles = {
    container: {
        height: "100vh",
        backgroundColor: "var(--bg)",
        color: "var(--text)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        display: "flex",
        flexDirection: "column" as const,
        overflow: "hidden",
    },
    sidebar: {
        width: "260px",
        backgroundColor: "var(--card)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column" as const,
        zIndex: 20,
    },
    sidebarHeader: {
        padding: "16px",
        borderBottom: "1px solid var(--border)",
    },
    sidebarTitle: {
        fontSize: "18px",
        fontWeight: "bold",
        color: "var(--text)",
        margin: "0 0 4px 0",
    },
    sidebarSubtitle: {
        fontSize: "12px",
        color: "var(--muted)",
        margin: 0,
    },
    navButton: {
        width: "100%",
        textAlign: "left" as const,
        padding: "10px 12px",
        borderRadius: "6px",
        fontSize: "14px",
        fontWeight: 500,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2px",
        cursor: "pointer",
        border: "1px solid transparent",
        backgroundColor: "transparent",
        color: "var(--muted)",
    },
    navButtonActive: {
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        color: "var(--primary)",
        borderColor: "rgba(34, 197, 94, 0.2)",
    },
    subNavButton: {
        width: "100%",
        textAlign: "left" as const,
        padding: "8px 12px 8px 32px", // Indented
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: 400,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1px",
        cursor: "pointer",
        border: "1px solid transparent",
        backgroundColor: "transparent",
        color: "var(--muted)",
    },
    subNavButtonActive: {
        backgroundColor: "rgba(34, 197, 94, 0.05)",
        color: "var(--primary)",
    },
    main: {
        flex: 1,
        display: "flex",
        flexDirection: "column" as const,
        overflow: "hidden",
        backgroundColor: "var(--bg)",
        position: "relative" as const,
    },
    header: {
        height: "64px",
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--card)",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
    },
    splitView: {
        flex: 1,
        display: "flex",
        overflow: "hidden",
    },
    tableContainer: {
        width: "900px",
        display: "flex",
        flexDirection: "column" as const,
        borderRight: "1px solid var(--border)",
        backgroundColor: "var(--bg)",
        flexShrink: 0,
    },
    tableHeader: {
        height: "48px",
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--card)",
        display: "flex",
        alignItems: "center",
        fontSize: "12px",
        fontWeight: 600,
        color: "var(--muted)",
        textTransform: "uppercase" as const,
        letterSpacing: "0.05em",
    },
    tableRow: {
        height: "40px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        fontSize: "13px",
        color: "var(--text)",
        cursor: "pointer",
    },
    cell: {
        padding: "0 12px",
        borderRight: "1px solid var(--border)",
        height: "100%",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        whiteSpace: "nowrap" as const,
        textOverflow: "ellipsis",
    },
    input: {
        width: "100%",
        backgroundColor: "var(--bg)",
        border: "1px solid var(--primary)",
        borderRadius: "4px",
        padding: "2px 6px",
        color: "var(--text)",
        fontSize: "13px",
        outline: "none",
    },
    select: {
        width: "100%",
        backgroundColor: "var(--bg)",
        border: "1px solid var(--primary)",
        borderRadius: "4px",
        padding: "2px 6px",
        color: "var(--text)",
        fontSize: "13px",
        outline: "none",
    },
    timelineContainer: {
        flex: 1,
        display: "flex",
        flexDirection: "column" as const,
        overflow: "hidden",
        backgroundColor: "var(--bg)",
    },
    timelineHeader: {
        height: "48px",
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--card)",
        display: "flex",
        overflow: "hidden",
    },
    timelineBody: {
        flex: 1,
        overflow: "auto",
    },
    ganttBar: {
        position: "absolute" as const,
        top: "8px",
        height: "24px",
        borderRadius: "4px",
        backgroundColor: "var(--primary)",
        border: "1px solid var(--primary-600)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        padding: "0 8px",
        fontSize: "11px",
        color: "#ffffff",
        fontWeight: 500,
        whiteSpace: "nowrap" as const,
        overflow: "hidden",
    },
    btnPrimary: {
        backgroundColor: "var(--primary)",
        color: "#ffffff",
        border: "none",
        borderRadius: "6px",
        padding: "6px 12px",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
    },
    btnSoft: {
        backgroundColor: "transparent",
        color: "var(--muted)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        padding: "4px 8px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    searchContainer: {
        position: "relative" as const,
        display: "flex",
        alignItems: "center",
    },
    searchInput: {
        backgroundColor: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        padding: "6px 12px 6px 32px",
        color: "var(--text)",
        fontSize: "13px",
        outline: "none",
        width: "240px",
    },
    priorityBadge: {
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: 600,
        display: "inline-block",
    },
    filterContainer: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginRight: "12px",
    },
    filterSelect: {
        backgroundColor: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        padding: "6px 8px",
        color: "var(--text)",
        fontSize: "12px",
        outline: "none",
        cursor: "pointer",
    },
    notesPopover: {
        position: "fixed" as const,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "400px",
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column" as const,
        maxHeight: "500px",
    },
    notesHeader: {
        padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontWeight: "bold" as const,
    },
    notesBody: {
        flex: 1,
        overflowY: "auto" as const,
        padding: "16px",
        display: "flex",
        flexDirection: "column" as const,
        gap: "12px",
    },
    noteItem: {
        backgroundColor: "var(--bg)",
        padding: "8px 12px",
        borderRadius: "6px",
        border: "1px solid var(--border)",
    },
    noteMeta: {
        fontSize: "11px",
        color: "var(--muted)",
        marginBottom: "4px",
        display: "flex",
        justifyContent: "space-between",
    },
    notesFooter: {
        padding: "12px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        gap: "8px",
    }
};

const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
        case 'önemli':
        case 'high':
            return { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }; // Red
        case 'orta':
        case 'medium':
            return { bg: 'rgba(234, 179, 8, 0.2)', color: '#eab308' }; // Yellow
        default:
            return { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }; // Blue/Normal
    }
};

export default function ProjectFullPlan() {
    const { id } = useParams();
    const navigate = useNavigate();
    const username = getProfileName();

    const [phases, setPhases] = useState<PhaseWithDetails[]>([]);
    const [activePhaseId, setActivePhaseId] = useState<number | null>(null);
    const [activeSubPhaseId, setActiveSubPhaseId] = useState<number | null>(null);
    const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());

    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    // Filter State
    const [filterPriority, setFilterPriority] = useState<string>("all");
    const [filterDeadline, setFilterDeadline] = useState<string>("all");
    const [filterAssignee, setFilterAssignee] = useState<string>("all"); // New Assignee Filter

    // Timeline State
    const [timelineStart, setTimelineStart] = useState(new Date());
    const [timelineDays, setTimelineDays] = useState(30);

    // Editing State
    const [editingCell, setEditingCell] = useState<{ itemId: string, field: string } | null>(null);
    const [editValue, setEditValue] = useState("");
    const [editUnit, setEditUnit] = useState("Saat");

    // Notes State
    const [activeNoteItem, setActiveNoteItem] = useState<PlanItem | null>(null);
    const [notes, setNotes] = useState<BackendPhaseDetailNote[]>([]);
    const [newNote, setNewNote] = useState("");

    // Refs for Scroll Sync
    const tableBodyRef = useRef<HTMLDivElement>(null);
    const timelineHeaderRef = useRef<HTMLDivElement>(null);
    const timelineBodyRef = useRef<HTMLDivElement>(null);
    const isScrolling = useRef<boolean>(false);

    // Fetch Data
    const fetchData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const phasesData = await apiGet<BackendPhase[]>(`/projects/${id}/phases`);
            const phasesWithDetails = await Promise.all(
                phasesData.map(async (p) => {
                    const details = await getPhaseDetails(String(p.id)).catch(() => []);
                    return { ...p, details };
                })
            );
            setPhases(phasesWithDetails);
            if (!activePhaseId && phasesWithDetails.length > 0) {
                setActivePhaseId(phasesWithDetails[0].id);
                setExpandedPhases(new Set([phasesWithDetails[0].id]));
                if (phasesWithDetails[0].start_date) {
                    setTimelineStart(new Date(phasesWithDetails[0].start_date));
                }
            }
        } catch (err) {
            console.error("Failed to fetch project plan:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    // Fetch notes when activeNoteItem changes
    useEffect(() => {
        if (activeNoteItem) {
            getPhaseDetailNotes(activeNoteItem.id).then(setNotes).catch(console.error);
        } else {
            setNotes([]);
        }
    }, [activeNoteItem]);

    const activePhase = phases.find(p => p.id === activePhaseId);

    // Flatten details
    const flattenDetails = (details: BackendPhaseDetail[], phaseName: string): PlanItem[] => {
        let flatList: PlanItem[] = [];
        const traverse = (items: BackendPhaseDetail[]) => {
            items.forEach(item => {
                flatList.push({
                    id: String(item.id),
                    action: item.title,
                    phase: "1.Faz",
                    scope: item.scope || "",
                    reference: item.reference || "",
                    responsible: item.responsible || "",
                    effort: item.effort || 0,
                    unit: item.unit || "Saat",
                    start_date: item.start_date || null,
                    end_date: item.end_date || null,
                    priority: item.priority || "Normal",
                    category: phaseName,
                    original: item,
                    parentId: item.parent_id ? String(item.parent_id) : undefined,
                    completed_at: item.completed_at || null
                });
                if (item.children && item.children.length > 0) traverse(item.children);
            });
        };
        traverse(details);
        return flatList;
    };

    const allItems = activePhase ? flattenDetails(activePhase.details, activePhase.name) : [];

    // Get unique assignees for filter
    const uniqueAssignees = Array.from(new Set(allItems.map(i => i.responsible).filter(Boolean)));

    const items = allItems.filter(i => {
        // 1. Search Filter
        const matchesSearch = i.action.toLowerCase().includes(searchTerm.toLowerCase());

        // 2. Sub-phase Filter
        let matchesSubPhase = true;
        if (activeSubPhaseId) {
            const isDirectChild = i.parentId === String(activeSubPhaseId);
            const isSelf = i.id === String(activeSubPhaseId);
            matchesSubPhase = isDirectChild || isSelf;
        }

        // 3. Priority Filter
        let matchesPriority = true;
        if (filterPriority !== "all") {
            matchesPriority = i.priority === filterPriority;
        }

        // 4. Deadline Filter
        let matchesDeadline = true;
        if (filterDeadline !== "all") {
            if (!i.end_date) {
                matchesDeadline = false;
            } else {
                const today = new Date();
                const endDate = new Date(i.end_date);
                const diffTime = endDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (filterDeadline === "upcoming") {
                    matchesDeadline = diffDays >= 0 && diffDays <= 7;
                } else if (filterDeadline === "overdue") {
                    matchesDeadline = diffDays < 0;
                }
            }
        }

        // 5. Assignee Filter
        let matchesAssignee = true;
        if (filterAssignee !== "all") {
            matchesAssignee = i.responsible === filterAssignee;
        }

        return matchesSearch && matchesSubPhase && matchesPriority && matchesDeadline && matchesAssignee;
    });

    const getSubPhases = (details: BackendPhaseDetail[]) => {
        return details.filter(d => d.item_type === 'sub_phase');
    };

    const togglePhaseExpand = (phaseId: number) => {
        const newSet = new Set(expandedPhases);
        if (newSet.has(phaseId)) {
            newSet.delete(phaseId);
        } else {
            newSet.add(phaseId);
        }
        setExpandedPhases(newSet);
    };

    // --- Scroll Sync ---
    const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (isScrolling.current) return;
        isScrolling.current = true;

        const { scrollLeft, scrollTop } = e.currentTarget;

        if (timelineHeaderRef.current) {
            timelineHeaderRef.current.scrollLeft = scrollLeft;
        }

        if (tableBodyRef.current) {
            tableBodyRef.current.scrollTop = scrollTop;
        }

        isScrolling.current = false;
    };

    const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (isScrolling.current) return;
        isScrolling.current = true;

        const { scrollTop } = e.currentTarget;

        if (timelineBodyRef.current) {
            timelineBodyRef.current.scrollTop = scrollTop;
        }

        isScrolling.current = false;
    };


    // --- Actions ---

    const handleCellClick = (item: PlanItem, field: string, value: any) => {
        if (editingCell?.itemId === item.id && editingCell.field === field) return;
        setEditingCell({ itemId: item.id, field });
        setEditValue(value === null ? "" : String(value));
        if (field === "effort") {
            setEditUnit(item.unit || "Saat");
        }
    };

    const handleToggleComplete = async (item: PlanItem) => {
        try {
            const newStatus = !item.original.is_completed;
            const updatedDetail = await updatePhaseDetail(item.id, { is_completed: newStatus });

            const updatedPhases = phases.map(p => {
                if (p.id === activePhaseId) {
                    return {
                        ...p,
                        details: updateItemInTree(p.details, item.id, updatedDetail)
                    };
                }
                return p;
            });
            setPhases(updatedPhases);
        } catch (err) {
            console.error("Failed to toggle complete:", err);
        }
    };

    const handleSave = async () => {
        if (!editingCell) return;
        const item = items.find(i => i.id === editingCell.itemId);
        if (!item) return;

        try {
            const updates: any = {};
            if (editingCell.field === "action") updates.title = editValue;
            else if (editingCell.field === "effort") {
                updates.effort = parseFloat(editValue) || 0;
                updates.unit = editUnit;
            }
            else updates[editingCell.field] = editValue === "" ? null : editValue;

            await updatePhaseDetail(item.id, updates);

            const updatedPhases = phases.map(p => {
                if (p.id === activePhaseId) {
                    return {
                        ...p,
                        details: updateItemInTree(p.details, item.id, updates)
                    };
                }
                return p;
            });
            setPhases(updatedPhases);

        } catch (err) {
            console.error("Failed to update item:", err);
        } finally {
            setEditingCell(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") setEditingCell(null);
    };

    const handleAddItem = async () => {
        if (!activePhaseId) return;
        try {
            const newItem = await createPhaseDetail({
                phase_id: activePhaseId,
                title: "Yeni Aksiyon",
                item_type: "task",
                scope: "Kapsam",
                reference: "",
                responsible: "trex",
                effort: 0,
                unit: "Saat",
                priority: "Normal",
                start_date: new Date().toISOString(),
                end_date: new Date().toISOString(),
                parent_id: activeSubPhaseId || null
            });
            fetchData();
        } catch (err) {
            console.error("Failed to create item:", err);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm("Bu maddeyi silmek istediğinize emin misiniz?")) return;
        try {
            await deletePhaseDetail(itemId);
            fetchData();
        } catch (err) {
            console.error("Failed to delete:", err);
        }
    };

    const handleAddNote = async () => {
        if (!activeNoteItem || !newNote.trim()) return;
        try {
            const note = await createPhaseDetailNote({
                detail_id: parseInt(activeNoteItem.id),
                user: username || "Unknown",
                note: newNote
            });
            setNotes([...notes, note]);
            setNewNote("");
        } catch (err) {
            console.error("Failed to add note:", err);
        }
    };

    function updateItemInTree(items: BackendPhaseDetail[], itemId: string, updates: any): BackendPhaseDetail[] {
        return items.map(item => {
            if (String(item.id) === itemId) {
                return { ...item, ...updates };
            }
            if (item.children) {
                return { ...item, children: updateItemInTree(item.children, itemId, updates) };
            }
            return item;
        });
    }

    // --- Gantt Logic ---
    const days = getDaysArray(timelineStart, timelineDays);
    const cellWidth = 40;

    const getBarPosition = (start: string | null, end: string | null) => {
        if (!start || !end) return null;
        const s = new Date(start);
        const e = new Date(end);
        const tlStart = new Date(timelineStart);

        const diffDays = Math.ceil((s.getTime() - tlStart.getTime()) / (1000 * 60 * 60 * 24));
        const duration = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        return {
            left: diffDays * cellWidth,
            width: duration * cellWidth
        };
    };

    return (
        <div style={styles.container}>
            <Navbar
                username={username}
                showFinished={false}
                onToggleFinished={() => { }}
                onAddProject={() => { }}
                showAddProject={false}
            />

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Sidebar */}
                <aside style={styles.sidebar}>
                    <div style={styles.sidebarHeader}>
                        <button
                            onClick={() => navigate(-1)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginBottom: '16px' }}
                        >
                            <ArrowLeft size={16} />
                            Projeye Dön
                        </button>
                        <h2 style={styles.sidebarTitle}>Proje Adımları</h2>
                        <p style={styles.sidebarSubtitle}>Master Aksiyon Planı</p>
                    </div>

                    <nav style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                        {loading && phases.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>Yükleniyor...</div>
                        ) : phases.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>Faz bulunamadı.</div>
                        ) : (
                            phases.map(phase => {
                                const count = phase.details.length;
                                const isActive = activePhaseId === phase.id;
                                const isExpanded = expandedPhases.has(phase.id);
                                const subPhases = getSubPhases(phase.details);

                                return (
                                    <div key={phase.id}>
                                        <button
                                            onClick={() => {
                                                setActivePhaseId(phase.id);
                                                setActiveSubPhaseId(null);
                                                togglePhaseExpand(phase.id);
                                            }}
                                            style={{ ...styles.navButton, ...(isActive && !activeSubPhaseId ? styles.navButtonActive : {}) }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                {subPhases.length > 0 && (
                                                    <ChevronDown size={12} style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
                                                )}
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{phase.name}</span>
                                            </div>
                                            {count > 0 && (
                                                <span style={{
                                                    fontSize: '11px',
                                                    padding: '2px 6px',
                                                    borderRadius: '10px',
                                                    backgroundColor: isActive && !activeSubPhaseId ? 'rgba(34, 197, 94, 0.2)' : 'var(--bg)',
                                                    color: isActive && !activeSubPhaseId ? 'var(--primary)' : 'var(--muted)'
                                                }}>
                                                    {count}
                                                </span>
                                            )}
                                        </button>

                                        {/* Sub Phases */}
                                        {isExpanded && subPhases.map(sub => (
                                            <button
                                                key={sub.id}
                                                onClick={() => {
                                                    setActivePhaseId(phase.id);
                                                    setActiveSubPhaseId(sub.id);
                                                }}
                                                style={{ ...styles.subNavButton, ...(activeSubPhaseId === sub.id ? styles.subNavButtonActive : {}) }}
                                            >
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                );
                            })
                        )}
                    </nav>
                </aside>

                {/* Main Content */}
                <main style={styles.main}>
                    {/* Top Bar */}
                    <header style={styles.header}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Layout size={20} color="var(--primary)" />
                                <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>
                                    {activePhase ? activePhase.name : "Yükleniyor..."}
                                    {activeSubPhaseId && items.length > 0 && (
                                        <span style={{ fontWeight: 'normal', color: 'var(--muted)' }}> / {items.find(i => i.id === String(activeSubPhaseId))?.action || "Alt Faz"}</span>
                                    )}
                                </h1>
                            </div>
                            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button style={styles.btnSoft} onClick={() => setTimelineStart(new Date(new Date(timelineStart).setDate(timelineStart.getDate() - 7)))}>
                                    <ChevronLeft size={14} />
                                </button>
                                <span style={{ fontSize: '14px', fontFamily: 'monospace', color: 'var(--muted)' }}>
                                    {timelineStart.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                                </span>
                                <button style={styles.btnSoft} onClick={() => setTimelineStart(new Date(new Date(timelineStart).setDate(timelineStart.getDate() + 7)))}>
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Filters */}
                            <div style={styles.filterContainer}>
                                <Filter size={14} color="var(--muted)" />
                                <select
                                    style={styles.filterSelect}
                                    value={filterPriority}
                                    onChange={(e) => setFilterPriority(e.target.value)}
                                >
                                    <option value="all">Tüm Öncelikler</option>
                                    <option value="Önemli">Önemli</option>
                                    <option value="Orta">Orta</option>
                                    <option value="Normal">Normal</option>
                                </select>

                                <select
                                    style={styles.filterSelect}
                                    value={filterDeadline}
                                    onChange={(e) => setFilterDeadline(e.target.value)}
                                >
                                    <option value="all">Tüm Zamanlar</option>
                                    <option value="upcoming">Yaklaşanlar (7 Gün)</option>
                                    <option value="overdue">Gecikenler</option>
                                </select>

                                {/* Assignee Filter */}
                                <select
                                    style={styles.filterSelect}
                                    value={filterAssignee}
                                    onChange={(e) => setFilterAssignee(e.target.value)}
                                >
                                    <option value="all">Tüm Sorumlular</option>
                                    {uniqueAssignees.map(u => (
                                        <option key={u} value={u}>{u}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)' }} />

                            <div style={styles.searchContainer}>
                                <Search size={14} color="var(--muted)" style={{ position: 'absolute', left: '10px' }} />
                                <input
                                    style={styles.searchInput}
                                    placeholder="Bu bölümde ara..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)' }} />
                            <button
                                onClick={handleAddItem}
                                style={{ ...styles.btnPrimary, opacity: !activePhaseId ? 0.5 : 1 }}
                                disabled={!activePhaseId}
                            >
                                <Plus size={14} />
                                <span>Yeni Aksiyon</span>
                            </button>
                        </div>
                    </header>

                    {/* Split View Container */}
                    <div style={styles.splitView}>

                        {/* LEFT: Table (Fixed Width) */}
                        <div style={styles.tableContainer}>
                            {/* Table Header */}
                            <div style={styles.tableHeader}>
                                <div style={{ ...styles.cell, width: '40px', justifyContent: 'center' }}>#</div>
                                <div style={{ ...styles.cell, width: '40px', justifyContent: 'center' }}>D</div>
                                <div style={{ ...styles.cell, flex: 1 }}>Aksiyon</div>
                                <div style={{ ...styles.cell, width: '100px', justifyContent: 'center' }}>Öncelik</div>
                                <div style={{ ...styles.cell, width: '120px' }}>Kapsam</div>
                                <div style={{ ...styles.cell, width: '100px' }}>Referans</div>
                                <div style={{ ...styles.cell, width: '120px' }}>Sorumlu</div>
                                <div style={{ ...styles.cell, width: '120px', justifyContent: 'center' }}>Efor</div>
                                <div style={{ ...styles.cell, width: '50px', justifyContent: 'center' }}>Not</div>
                                <div style={{ ...styles.cell, width: '50px', justifyContent: 'center', borderRight: 'none' }}>Sil</div>
                            </div>

                            {/* Table Body */}
                            <div
                                style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
                                ref={tableBodyRef}
                                onScroll={handleTableScroll}
                            >
                                {items.map((item, idx) => (
                                    <div
                                        key={item.id}
                                        style={{
                                            ...styles.tableRow,
                                            backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(128,128,128,0.03)',
                                            opacity: item.original.is_completed ? 0.5 : 1, // Dim completed items
                                        }}
                                    >
                                        <div style={{ ...styles.cell, width: '40px', justifyContent: 'center', color: 'var(--muted)', fontFamily: 'monospace' }}>{idx + 1}</div>

                                        {/* Checkbox & Status */}
                                        <div style={{ ...styles.cell, width: '40px', justifyContent: 'center', position: 'relative' }}>
                                            <button
                                                onClick={() => handleToggleComplete(item)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: 0
                                                }}
                                                title={(() => {
                                                    if (!item.original.is_completed) return "Tamamla";
                                                    if (!item.original.completed_at || !item.end_date) return "Tamamlandı";

                                                    const completed = new Date(item.original.completed_at);
                                                    const end = new Date(item.end_date);
                                                    const cDate = new Date(completed.getFullYear(), completed.getMonth(), completed.getDate());
                                                    const eDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                                                    if (cDate > eDate) return `Geç Tamamlandı (${completed.toLocaleDateString()})`;
                                                    if (cDate < eDate) return `Erken Tamamlandı (${completed.toLocaleDateString()})`;
                                                    return `Zamanında Tamamlandı (${completed.toLocaleDateString()})`;
                                                })()}
                                            >
                                                {item.original.is_completed ? (
                                                    <div style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        backgroundColor: (() => {
                                                            // If dates are missing, default to Green (Standard Done) instead of Gray/Blue
                                                            if (!item.original.completed_at || !item.end_date) return '#22c55e';

                                                            const completed = new Date(item.original.completed_at);
                                                            const end = new Date(item.end_date);
                                                            const cDate = new Date(completed.getFullYear(), completed.getMonth(), completed.getDate());
                                                            const eDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

                                                            if (cDate > eDate) return '#ef4444'; // Late -> Red
                                                            if (cDate < eDate) return '#8b5cf6'; // Early -> Purple
                                                            return '#22c55e'; // On Time -> Green
                                                        })()
                                                    }}>
                                                        <Check size={14} color="white" strokeWidth={3} />
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '50%',
                                                        border: '2px solid var(--muted)',
                                                        transition: 'all 0.2s'
                                                    }}
                                                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--muted)'}
                                                    />
                                                )}
                                            </button>
                                        </div>

                                        {/* Action Input */}
                                        <div style={{ ...styles.cell, flex: 1, cursor: 'pointer', fontWeight: 500, textDecoration: item.original.is_completed ? 'line-through' : 'none' }} onClick={() => handleCellClick(item, "action", item.action)}>
                                            {editingCell?.itemId === item.id && editingCell.field === "action" ? (
                                                <input
                                                    style={styles.input}
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={handleSave}
                                                    onKeyDown={handleKeyDown}
                                                    autoFocus
                                                />
                                            ) : item.action}
                                        </div>

                                        {/* Priority */}
                                        <div style={{ ...styles.cell, width: '100px', justifyContent: 'center', cursor: 'pointer' }} onClick={() => handleCellClick(item, "priority", item.priority)}>
                                            {editingCell?.itemId === item.id && editingCell.field === "priority" ? (
                                                <select
                                                    style={styles.select}
                                                    value={editValue}
                                                    onChange={e => {
                                                        setEditValue(e.target.value);
                                                        // Auto save on selection change
                                                        updatePhaseDetail(item.id, { priority: e.target.value }).then(() => {
                                                            setEditingCell(null);
                                                            fetchData();
                                                        });
                                                    }}
                                                    onBlur={() => setEditingCell(null)}
                                                    autoFocus
                                                >
                                                    <option value="Normal">Normal</option>
                                                    <option value="Orta">Orta</option>
                                                    <option value="Önemli">Önemli</option>
                                                </select>
                                            ) : (
                                                <span style={{
                                                    ...styles.priorityBadge,
                                                    backgroundColor: getPriorityColor(item.priority).bg,
                                                    color: getPriorityColor(item.priority).color
                                                }}>
                                                    {item.priority}
                                                </span>
                                            )}
                                        </div>

                                        {/* Scope */}
                                        <div style={{ ...styles.cell, width: '120px', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer' }} onClick={() => handleCellClick(item, "scope", item.scope)}>
                                            {editingCell?.itemId === item.id && editingCell.field === "scope" ? (
                                                <input
                                                    style={styles.input}
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={handleSave}
                                                    onKeyDown={handleKeyDown}
                                                    autoFocus
                                                />
                                            ) : item.scope || "-"}
                                        </div>

                                        {/* Reference */}
                                        <div style={{ ...styles.cell, width: '100px', color: 'var(--muted)', fontFamily: 'monospace', fontSize: '12px', cursor: 'pointer' }} onClick={() => handleCellClick(item, "reference", item.reference)}>
                                            {editingCell?.itemId === item.id && editingCell.field === "reference" ? (
                                                <input
                                                    style={styles.input}
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={handleSave}
                                                    onKeyDown={handleKeyDown}
                                                    autoFocus
                                                />
                                            ) : item.reference || "-"}
                                        </div>

                                        {/* Responsible */}
                                        <div style={{ ...styles.cell, width: '120px', fontSize: '12px', cursor: 'pointer' }} onClick={() => handleCellClick(item, "responsible", item.responsible)}>
                                            {editingCell?.itemId === item.id && editingCell.field === "responsible" ? (
                                                <input
                                                    style={styles.input}
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={handleSave}
                                                    onKeyDown={handleKeyDown}
                                                    autoFocus
                                                />
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {item.responsible.includes("trex") && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />}
                                                    {item.responsible.includes("Müşteri") && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#d29922' }} />}
                                                    <span style={{ color: 'var(--text)' }}>{item.responsible || "Seç..."}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Effort (Combined Input) */}
                                        <div style={{ ...styles.cell, width: '120px', justifyContent: 'center', fontFamily: 'monospace', fontSize: '12px', cursor: 'pointer' }} onClick={() => handleCellClick(item, "effort", item.effort)}>
                                            {editingCell?.itemId === item.id && editingCell.field === "effort" ? (
                                                <div
                                                    style={{ display: 'flex', gap: '4px', width: '100%' }}
                                                    onBlur={(e) => {
                                                        // Only save if focus moves outside the container
                                                        if (!e.currentTarget.contains(e.relatedTarget)) {
                                                            handleSave();
                                                        }
                                                    }}
                                                >
                                                    <input
                                                        style={{ ...styles.input, width: '50px', textAlign: 'center' }}
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        onKeyDown={handleKeyDown}
                                                        autoFocus
                                                        type="number"
                                                        placeholder="0"
                                                    />
                                                    <select
                                                        style={{ ...styles.select, width: '60px', padding: '0 4px', fontSize: '11px' }}
                                                        value={editUnit}
                                                        onChange={e => setEditUnit(e.target.value)}
                                                    // onBlur removed here, handled by parent div
                                                    >
                                                        <option value="Dakika">Dk</option>
                                                        <option value="Saat">Saat</option>
                                                        <option value="Gün">Gün</option>
                                                        <option value="Ay">Ay</option>
                                                    </select>
                                                </div>
                                            ) : (item.effort > 0 ? `${item.effort} ${item.unit}` : "-")}
                                        </div>

                                        {/* Notes */}
                                        <div style={{ ...styles.cell, width: '50px', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => setActiveNoteItem(item)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
                                                title="Notlar"
                                            >
                                                <MessageSquare size={14} />
                                            </button>
                                        </div>

                                        {/* Delete */}
                                        <div style={{ ...styles.cell, width: '50px', justifyContent: 'center', borderRight: 'none' }}>
                                            <button
                                                onClick={() => handleDeleteItem(item.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Sil"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT: Gantt Timeline (Scrollable) */}
                        <div style={styles.timelineContainer}>
                            {/* Timeline Header */}
                            <div style={styles.timelineHeader} ref={timelineHeaderRef}>
                                <div style={{ display: 'flex' }}>
                                    {days.map((d, i) => (
                                        <div key={i} style={{ width: cellWidth, minWidth: cellWidth, borderRight: '1px solid var(--border)', backgroundColor: 'var(--card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '9px', color: 'var(--muted)', fontWeight: 500, lineHeight: 1, marginBottom: '2px' }}>{formatMonth(d)}</span>
                                            <span style={{ fontSize: '12px', fontWeight: 'bold', lineHeight: 1, color: (d.getDay() === 0 || d.getDay() === 6) ? 'var(--danger)' : 'var(--text)' }}>{formatDay(d)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Timeline Body */}
                            <div
                                style={styles.timelineBody}
                                ref={timelineBodyRef}
                                onScroll={handleTimelineScroll}
                            >
                                {items.map((item, idx) => {
                                    const barPos = getBarPosition(item.start_date, item.end_date);
                                    return (
                                        <div key={item.id} style={{ height: '40px', borderBottom: '1px solid var(--border)', position: 'relative', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(128,128,128,0.03)' }}>
                                            {/* Grid Lines */}
                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
                                                {days.map((d, i) => (
                                                    <div key={i} style={{ width: cellWidth, minWidth: cellWidth, borderRight: '1px solid var(--border)', height: '100%', backgroundColor: (d.getDay() === 0 || d.getDay() === 6) ? 'rgba(128, 128, 128, 0.05)' : 'transparent' }} />
                                                ))}
                                            </div>

                                            {/* Gantt Bar */}
                                            {barPos && (
                                                <div
                                                    style={{
                                                        ...styles.ganttBar,
                                                        left: barPos.left,
                                                        width: barPos.width,
                                                        backgroundColor: getPriorityColor(item.priority).color, // Color code bar by priority
                                                        border: `1px solid ${getPriorityColor(item.priority).color}`,
                                                        opacity: item.original.is_completed ? 0.5 : 1, // Dim completed bars
                                                    }}
                                                    title={`${item.action} (${item.start_date?.slice(0, 10)} - ${item.end_date?.slice(0, 10)})`}
                                                    onClick={() => {
                                                        const newStart = prompt("Başlangıç Tarihi (YYYY-MM-DD):", item.start_date?.slice(0, 10));
                                                        if (newStart) {
                                                            const newEnd = prompt("Bitiş Tarihi (YYYY-MM-DD):", item.end_date?.slice(0, 10));
                                                            if (newEnd) {
                                                                handleCellClick(item, "start_date", newStart);
                                                                updatePhaseDetail(item.id, { start_date: newStart, end_date: newEnd }).then(fetchData);
                                                            }
                                                        }
                                                    }}
                                                >
                                                    {barPos.width > 60 && (
                                                        <span>{item.effort > 0 ? `${item.effort} ${item.unit}` : ""}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                </main>

                {/* Notes Popover */}
                {activeNoteItem && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99 }} onClick={() => setActiveNoteItem(null)}>
                        <div style={styles.notesPopover} onClick={e => e.stopPropagation()}>
                            <div style={styles.notesHeader}>
                                <span>Notlar: {activeNoteItem.action}</span>
                                <button onClick={() => setActiveNoteItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                            </div>
                            <div style={styles.notesBody}>
                                {notes.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', padding: '20px' }}>Henüz not yok.</div>
                                ) : (
                                    notes.map(note => (
                                        <div key={note.id} style={styles.noteItem}>
                                            <div style={styles.noteMeta}>
                                                <span style={{ fontWeight: 600 }}>{note.user}</span>
                                                <span>{new Date(note.created_at).toLocaleString('tr-TR')}</span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: 'var(--text)' }}>{note.note}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div style={styles.notesFooter}>
                                <input
                                    style={{ ...styles.input, flex: 1 }}
                                    placeholder="Not yaz..."
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                                />
                                <button onClick={handleAddNote} style={styles.btnPrimary}>
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
