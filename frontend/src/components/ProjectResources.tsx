import { useState } from "react";
import { ResourceDTO } from "@/lib/api";
import { ExternalLink, Trash2, Plus, Github, Figma, Link as LinkIcon, HardDrive } from "lucide-react";

// Lucide ikonlarını dinamik olarak çağırabilmek için
const ICONS: Record<string, any> = {
    github: Github,
    figma: Figma,
    drive: HardDrive,
    link: LinkIcon
};

type Props = {
    items: ResourceDTO[];
    onAdd: (label: string, url: string, type: string) => void;
    onDelete: (id: number) => void;
};

export default function ProjectResources({ items, onAdd, onDelete }: Props) {
    const [isAdding, setIsAdding] = useState(false);
    const [label, setLabel] = useState("");
    const [url, setUrl] = useState("");
    const [type, setType] = useState("link");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!label.trim() || !url.trim()) return;
        onAdd(label, url, type);
        setLabel("");
        setUrl("");
        setIsAdding(false);
    };

    return (
        <div className="pc">
            <div className="pc-h" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="pc-title">Hızlı Bağlantılar</div>
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
                {(!items || items.length === 0) && !isAdding && (
                    <div className="text-center py-6 px-4 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                        <div className="text-xs text-slate-400 font-medium">Henüz bağlantı eklenmedi.</div>
                        <p className="text-[10px] text-slate-400 mt-1">Proje dosyalarına, Figma, GitHub vb. linklere buradan hızlıca erişin.</p>
                    </div>
                )}
                {(items || []).map((res) => {
                    const Icon = ICONS[res.resource_type] || LinkIcon;
                    return (
                        <div
                            key={res.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 group transition-all"
                        >
                            <a
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 text-sm text-slate-700 hover:text-blue-600 truncate flex-1"
                            >
                                <div className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-slate-200 shadow-sm shrink-0">
                                    <Icon className="w-4 h-4 text-slate-600" />
                                </div>
                                <div className="truncate flex flex-col">
                                    <span className="font-medium truncate leading-tight">{res.label}</span>
                                    <span className="text-[10px] text-slate-400 truncate mt-px">{res.url}</span>
                                </div>
                            </a>
                            <button
                                onClick={() => onDelete(res.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    );
                })}
            </div>

            {isAdding && (
                <form
                    onSubmit={handleSubmit}
                    className="mt-3 p-4 bg-slate-50/50 rounded-lg border border-slate-200 text-sm animate-in fade-in zoom-in-95 duration-200"
                >
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Etiket</label>
                            <input
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="Örn: Figma Tasarımı"
                                className="input w-full"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1.5 block">URL</label>
                            <input
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://..."
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Tür</label>
                            <div className="relative">
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="input w-full appearance-none bg-white"
                                >
                                    <option value="link">Genel Link</option>
                                    <option value="github">GitHub</option>
                                    <option value="figma">Figma</option>
                                    <option value="drive">Google Drive</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
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
                                Ekle
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}
