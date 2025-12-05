import { useState, useEffect, useRef } from "react";
import { Plus, X, Trash2, Calendar, CheckCircle2, Edit2, ChevronRight, ChevronDown, Folder, CheckSquare } from "lucide-react";

export type PhaseItem = {
    id: string;
    title: string;
    completed: boolean;
    item_type?: string; // "task" | "sub_phase"
    children?: PhaseItem[];
};

export type ExtendedPhase = {
    id: string;
    name: string;
    start: string;
    end: string;
    cls?: string;
    status?: string;
    items: PhaseItem[];
};

type Props = {
    phases: ExtendedPhase[];
    onAddPhase: () => void;
    onUpdatePhase: (id: string, updates: Partial<ExtendedPhase>) => void;
    onDeletePhase: (id: string) => void;
    onAddItem: (phaseId: string, title: string, parentId?: string, type?: string) => void;
    onUpdateItem: (itemId: string, updates: Partial<PhaseItem>) => void;
    onDeleteItem: (itemId: string) => void;
};

// Recursive Item Component
function PhaseItemNode({
    item,
    level = 0,
    onUpdate,
    onDelete,
    onAddSubItem
}: {
    item: PhaseItem;
    level?: number;
    onUpdate: (id: string, updates: Partial<PhaseItem>) => void;
    onDelete: (id: string) => void;
    onAddSubItem: (parentId: string, title: string, type: string) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newItemText, setNewItemText] = useState("");
    const [newItemType, setNewItemType] = useState("task"); // "task" or "sub_phase"

    const isFolder = item.item_type === "sub_phase";
    const hasChildren = item.children && item.children.length > 0;

    function handleAdd() {
        if (!newItemText.trim()) return;
        onAddSubItem(item.id, newItemText.trim(), newItemType);
        setNewItemText("");
        setIsAdding(false);
    }

    return (
        <div className="pe-node" style={{ marginLeft: level * 20 }}>
            <div className="pe-node-row">
                {isFolder && (
                    <button
                        className="icon-btn ghost xs"
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{ marginRight: 4 }}
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                )}

                {isFolder ? (
                    <div className="pe-node-folder">
                        <Folder size={14} className="text-muted" />
                        <span className="pe-node-title">{item.title}</span>
                    </div>
                ) : (
                    <label className="pe-checkbox">
                        <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => onUpdate(item.id, { completed: !item.completed })}
                        />
                        <span className={item.completed ? "done" : ""}>{item.title}</span>
                    </label>
                )}

                <div className="pe-node-actions">
                    {isFolder && (
                        <button
                            className="icon-btn ghost xs"
                            onClick={() => setIsAdding(!isAdding)}
                            title="Alt öğe ekle"
                        >
                            <Plus size={14} />
                        </button>
                    )}
                    <button className="icon-btn ghost xs" onClick={() => onDelete(item.id)}>
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Children */}
            {isExpanded && hasChildren && (
                <div className="pe-node-children">
                    {item.children!.map(child => (
                        <PhaseItemNode
                            key={child.id}
                            item={child}
                            level={0} // Indentation handled by recursive nesting or CSS? Let's use margin-left prop above
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            onAddSubItem={onAddSubItem}
                        />
                    ))}
                </div>
            )}

            {/* Add Sub-item Form */}
            {isExpanded && isAdding && (
                <div className="pe-add-sub" style={{ marginLeft: 24, marginTop: 4 }}>
                    <div className="pe-add-sub-row">
                        <select
                            className="input xs"
                            value={newItemType}
                            onChange={e => setNewItemType(e.target.value)}
                            style={{ width: 80 }}
                        >
                            <option value="task">Görev</option>
                            <option value="sub_phase">Alt Faz</option>
                        </select>
                        <input
                            className="input xs"
                            placeholder="Başlık..."
                            value={newItemText}
                            onChange={e => setNewItemText(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleAdd()}
                            autoFocus
                        />
                        <button className="btn ghost xs icon-only" onClick={handleAdd}>
                            <Plus size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PhaseEditor({
    phases,
    onAddPhase,
    onUpdatePhase,
    onDeletePhase,
    onAddItem,
    onUpdateItem,
    onDeleteItem
}: Props) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const prevPhaseCount = useRef(phases.length);

    // Auto-select new phase when added
    useEffect(() => {
        if (phases.length > prevPhaseCount.current) {
            const last = phases[phases.length - 1];
            if (last) setSelectedId(last.id);
        }
        prevPhaseCount.current = phases.length;
    }, [phases.length]);

    // Select first phase by default if none selected
    useEffect(() => {
        if (!selectedId && phases.length > 0) {
            setSelectedId(phases[0].id);
        }
    }, [phases.length, selectedId]);

    const selectedPhase = phases.find(p => p.id === selectedId);

    // --- Actions ---

    function handleAddPhase() {
        onAddPhase();
    }

    function handleRemovePhase(id: string) {
        if (!confirm("Bu aşamayı silmek istediğinize emin misiniz?")) return;
        onDeletePhase(id);
        if (selectedId === id) {
            const remaining = phases.filter(p => p.id !== id);
            setSelectedId(remaining[0]?.id || null);
        }
    }

    // --- Item Actions ---

    const [newItemText, setNewItemText] = useState("");
    const [newItemType, setNewItemType] = useState("task");

    function handleAddItem() {
        if (!selectedId || !newItemText.trim()) return;
        onAddItem(selectedId, newItemText.trim(), undefined, newItemType);
        setNewItemText("");
    }

    function handleAddSubItem(parentId: string, title: string, type: string) {
        if (!selectedId) return;
        onAddItem(selectedId, title, parentId, type);
    }

    // Recursive progress calculation
    function getProgress(p: ExtendedPhase) {
        if (!p.items || p.items.length === 0) return 0;

        let total = 0;
        let completed = 0;

        function traverse(items: PhaseItem[]) {
            for (const item of items) {
                if (item.item_type === "task" || !item.item_type) {
                    total++;
                    if (item.completed) completed++;
                }
                if (item.children) {
                    traverse(item.children);
                }
            }
        }

        traverse(p.items);
        if (total === 0) return 0;
        return Math.round((completed / total) * 100);
    }

    return (
        <div className="phase-editor-container">

            {/* 1. Horizontal Stepper (Navigation) */}
            <div className="pe-stepper-scroll">
                <div className="pe-stepper">
                    {phases.map((p, i) => {
                        const isSelected = selectedId === p.id;
                        const progress = getProgress(p);
                        return (
                            <div
                                key={p.id}
                                className={`pe-step ${isSelected ? "selected" : ""} ${p.cls || ""}`}
                                onClick={() => setSelectedId(p.id)}
                            >
                                <div className="pe-step-dot">
                                    {isSelected && <div className="pe-step-dot-inner" />}
                                </div>
                                <div className="pe-step-content">
                                    <div className="pe-step-label">{p.name}</div>
                                    <div className="pe-step-progress-bg">
                                        <div className="pe-step-progress-bar" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                                {i < phases.length - 1 && <div className="pe-step-line" />}
                            </div>
                        );
                    })}

                    {/* Add Button at the end */}
                    <button className="pe-add-btn" onClick={handleAddPhase} title="Yeni Aşama Ekle">
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            {/* 2. Detail Editor for Selected Phase */}
            {selectedPhase ? (
                <div className="pe-detail-card">
                    <div className="pe-detail-header">
                        <div className="pe-dh-main">
                            {/* Title Row */}
                            <div className="pe-dh-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div className="pe-title-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                    <input
                                        className="pe-title-input"
                                        value={selectedPhase.name}
                                        onChange={e => onUpdatePhase(selectedPhase.id, { name: e.target.value })}
                                        placeholder="Aşama Adı"
                                        style={{ fontSize: 18, fontWeight: 600, border: 'none', background: 'transparent', width: '100%', maxWidth: 300 }}
                                    />
                                    <Edit2 size={14} className="pe-edit-icon" style={{ opacity: 0.5 }} />
                                </div>
                                <div className="pe-dh-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {/* Status Controls */}
                                    <div className="pe-status-controls" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {selectedPhase.status === "in_progress" ? (
                                            <span className="badge active">Aktif Aşama</span>
                                        ) : (
                                            <button
                                                className="btn xs secondary"
                                                onClick={() => onUpdatePhase(selectedPhase.id, { status: "in_progress" })}
                                            >
                                                Aktif Yap
                                            </button>
                                        )}

                                        {selectedPhase.status === "done" ? (
                                            <span className="badge success">Tamamlandı</span>
                                        ) : (
                                            <button
                                                className="btn xs ghost icon-only"
                                                onClick={() => onUpdatePhase(selectedPhase.id, { status: "done" })}
                                                title="Tamamlandı olarak işaretle"
                                            >
                                                <CheckCircle2 size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="v-divider" style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

                                    <button
                                        className="icon-btn danger"
                                        onClick={() => handleRemovePhase(selectedPhase.id)}
                                        title="Aşamayı Sil"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Meta Row (Dates & Progress) */}
                            <div className="pe-dh-meta-row">
                                <div className="pe-dates">
                                    <Calendar size={14} />
                                    <input
                                        type="date"
                                        value={selectedPhase.start.slice(0, 10)}
                                        onChange={e => onUpdatePhase(selectedPhase.id, { start: e.target.value })}
                                    />
                                    <span>—</span>
                                    <input
                                        type="date"
                                        value={selectedPhase.end.slice(0, 10)}
                                        onChange={e => onUpdatePhase(selectedPhase.id, { end: e.target.value })}
                                    />
                                </div>

                                <div className="pe-phase-progress">
                                    <div className="pe-pp-label">
                                        <span>İlerleme</span>
                                        <span>{getProgress(selectedPhase)}%</span>
                                    </div>
                                    <div className="pe-pp-bg">
                                        <div
                                            className="pe-pp-bar"
                                            style={{ width: `${getProgress(selectedPhase)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pe-detail-body">
                        <div className="pe-section-title">Görevler / Alt Başlıklar</div>
                        <div className="pe-items-list">
                            {selectedPhase.items.map(item => (
                                <PhaseItemNode
                                    key={item.id}
                                    item={item}
                                    onUpdate={onUpdateItem}
                                    onDelete={onDeleteItem}
                                    onAddSubItem={handleAddSubItem}
                                />
                            ))}
                        </div>

                        <div className="pe-add-row">
                            <select
                                className="input sm"
                                value={newItemType}
                                onChange={e => setNewItemType(e.target.value)}
                                style={{ width: 100 }}
                            >
                                <option value="task">Görev</option>
                                <option value="sub_phase">Alt Faz</option>
                            </select>
                            <input
                                className="input sm"
                                placeholder="Yeni öğe ekle..."
                                value={newItemText}
                                onChange={e => setNewItemText(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleAddItem()}
                            />
                            <button className="btn ghost sm icon-only" onClick={handleAddItem}>
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="pe-empty-state">
                    Düzenlemek için yukarıdan bir aşama seçin veya yeni ekleyin.
                </div>
            )}
        </div>
    );
}
