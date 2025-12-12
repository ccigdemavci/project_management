import { ActivityDTO } from "@/lib/api";

function getActionColor(action: string) {
    const lower = action.toLowerCase();
    if (lower.includes("silin") || lower.includes("delete") || lower.includes("remove")) return "bg-red-500";
    if (lower.includes("eklen") || lower.includes("create") || lower.includes("add")) return "bg-green-500";
    if (lower.includes("güncel") || lower.includes("update") || lower.includes("edit")) return "bg-blue-500";
    return "bg-slate-400";
}

export default function AuditLog({ items }: { items: ActivityDTO[] }) {
    if (!items || !items.length) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                <div className="text-xs text-slate-400 font-medium">Henüz aktivite kaydı yok.</div>
                <div className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Projede yapılan değişiklikler burada listelenecek.</div>
            </div>
        );
    }
    return (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {items.map((act) => {
                const dotColor = getActionColor(act.action);
                return (
                    <div key={act.id} className="flex gap-3 text-sm group relative">
                        {/* Connecting Line (faint) */}
                        <div className="absolute left-[3px] top-3 bottom-[-16px] w-[2px] bg-slate-100 group-last:hidden" />

                        <div className={`w-2 h-2 mt-1.5 rounded-full ${dotColor} shrink-0 ring-4 ring-white z-10 transition-transform group-hover:scale-125`} />
                        <div className="flex-1 pb-1">
                            <div className="text-slate-900 font-medium leading-tight">
                                {act.action}
                            </div>
                            {act.details && (
                                <div className="text-slate-600 text-xs mt-0.5 bg-slate-50 px-2 py-1 rounded border border-slate-100 inline-block">
                                    {act.details}
                                </div>
                            )}
                            <div className="text-[10px] text-slate-400 mt-1 flex gap-2 items-center">
                                <span>{new Date(act.created_at).toLocaleString("tr-TR", { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                                {act.user_id && <span className="w-1 h-1 rounded-full bg-slate-300" />}
                                {act.user_id && <span>Kullanıcı #{act.user_id}</span>}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
