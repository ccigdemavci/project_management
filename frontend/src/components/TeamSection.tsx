import { useState } from "react";
import { Plus, User, ShieldCheck, Trash2 } from "lucide-react";
import { Member } from "@/pages/ProjectDetail"; // We might need to export Member type or redefine it

// Redefine locally if not exported, or better, keep it simple
type TeamMember = { id: string; name: string; role: string };

type Props = {
    owner: string;
    team: TeamMember[];
    onAddMember: (email: string) => Promise<void>;
    loading?: boolean;
};

export default function TeamSection({ owner, team, onAddMember, loading }: Props) {
    const [email, setEmail] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    async function handleAdd() {
        if (!email.trim()) return;
        setIsAdding(true);
        try {
            await onAddMember(email);
            setEmail("");
        } catch (e) {
            console.error(e);
        } finally {
            setIsAdding(false);
        }
    }

    return (
        <div className="pc">
            <div className="pc-h">
                <div className="pc-title">
                    <span>Ekip</span>
                </div>
            </div>

            {/* Owner */}
            <div className="team-owner">
                <div className="avatar owner">
                    <ShieldCheck size={16} />
                </div>
                <div className="team-info">
                    <div className="team-name">{owner}</div>
                    <div className="team-role">Proje Sahibi</div>
                </div>
            </div>

            <div className="divider" />

            {/* Team List */}
            <ul className="team-list">
                {team.map((m) => (
                    <li key={m.id} className="team-item">
                        <div className="avatar">
                            {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="team-info">
                            <div className="team-name">{m.name}</div>
                            <div className="team-role">{m.role}</div>
                        </div>
                    </li>
                ))}
                {team.length === 0 && <div className="empty-sm">Henüz üye eklenmedi.</div>}
            </ul>

            {/* Add Member Form */}
            <div className="add-member-form mt">
                <div className="fi">
                    <input
                        className="input"
                        placeholder="E-posta adresi..."
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    />
                    <button
                        className="btn primary icon-only"
                        onClick={handleAdd}
                        disabled={isAdding || loading}
                    >
                        {isAdding ? <div className="spinner-sm" /> : <Plus size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
