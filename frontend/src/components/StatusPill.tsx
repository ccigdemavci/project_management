type Props = { status: ProjectStatus };

export type ProjectStatus =
  | "planning"
  | "active"
  | "at-risk"
  | "on-hold"
  | "done";

const map: Record<ProjectStatus, { label: string; cls: string }> = {
  planning: { label: "Planlama", cls: "pill planning" },
  active: { label: "Aktif", cls: "pill active" },
  "at-risk": { label: "Risk", cls: "pill risk" },
  "on-hold": { label: "Askıda", cls: "pill hold" },
  done: { label: "Tamamlandı", cls: "pill done" },
};

export default function StatusPill({ status }: Props) {
  const { label, cls } = map[status];
  return <span className={cls}>{label}</span>;
}