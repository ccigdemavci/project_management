import { useState } from "react";
import { MilestoneDTO } from "@/lib/api";
import { Flag, Trash2, Plus, Calendar, Check } from "lucide-react";

type Props = {
    items: MilestoneDTO[];
    onAdd: (title: string, date: string) => void;
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
};

export default function MilestoneTracker({ items, onAdd, onToggle, onDelete }: Props) {
    const [isAdding, setIsAdding] = useState(false);
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !date) return;
        onAdd(title, date);
        setTitle("");
        setDate("");
        setIsAdding(false);
    };

    return (
        <div className="pc">
            <div className="pc-h" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="pc-title">Kilometre Taşları</div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="btn ghost"
                    style={{ padding: '4px 8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <Plus size={14} />
                    <span>Ekle</span>
                </button>
            </div>

            <div style={{ padding: '0 16px 16px 16px' }}>
                {/* Dash line */}
                {items && items.length > 0 && (
                    <div className="absolute left-[11px] top-2 bottom-3 w-px border-l border-dashed border-slate-200" />
                )}

                {(items || []).map((m) => (
                    <div key={m.id} className="relative flex items-start gap-3 group">
                        {/* Checkbox/Status */}
                        <button
                            onClick={() => onToggle(m.id)}
                            className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-all ${m.is_completed
                                ? "bg-green-500 border-green-500 shadow-sm"
                                : "bg-white border-slate-300 hover:border-orange-400 shadow-sm"
                                }`}
                        >
                            {m.is_completed && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>

                        <div className="flex-1 min-w-0 pt-0.5">
                            <div
                                className={`text-sm font-medium leading-tight ${m.is_completed ? "text-slate-400 line-through decoration-slate-300" : "text-slate-700"
                                    }`}
                            >
                                {m.title}
                            </div>
                            <div
                                className={`flex items-center gap-1.5 text-xs mt-1 ${new Date(m.due_date) < new Date() && !m.is_completed ? "text-red-500 font-medium" : "text-slate-500"
                                    }`}
                            >
                                <Calendar className="w-3 h-3" />
                                {new Date(m.due_date).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long' })}

                                {new Date(m.due_date) < new Date() && !m.is_completed && (
                                    <span>(Gecikti)</span>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => onDelete(m.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
                {(!items || !items.length) && !isAdding && (
                    <div className="text-center py-6 px-4 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                        <div className="text-xs text-slate-400 font-medium">Henüz kilometre taşı eklenmedi.</div>
                        <p className="text-[10px] text-slate-400 mt-1">Önemli tarihleri ve teslimatları buradan takip edin.</p>
                    </div>
                )}
            </div>

            {isAdding && (
                <form
                    onSubmit={handleSubmit}
                    className="mt-3 p-4 bg-slate-50/50 rounded-lg border border-slate-200 text-sm animate-in fade-in zoom-in-95 duration-200"
                >
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Başlık</label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Örn: Müşteri Sunumu"
                                className="input w-full"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Tarih</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="input w-full"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="btn ghost"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                className="btn primary"
                            >
                                Kaydet
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}
