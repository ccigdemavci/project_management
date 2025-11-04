export type Phase = {
  name: string;
  start: string; // ISO
  end: string;   // ISO
  cls?: string;  // renk sınıfı
};

type Props = {
  phases: Phase[];
};

// basit yüzde hesaplı ufak bir timeline
export default function MiniGantt({ phases }: Props) {
  if (!phases?.length) return null;

  const toNum = (d: string) => new Date(d).getTime();
  const min = Math.min(...phases.map(p => toNum(p.start)));
  const max = Math.max(...phases.map(p => toNum(p.end)));
  const span = Math.max(1, max - min);

  return (
    <div className="gant">
      {phases.map((p, i) => {
        const left = ((toNum(p.start) - min) / span) * 100;
        const width = ((toNum(p.end) - toNum(p.start)) / span) * 100;
        return (
          <div
            key={i}
            className={`gant-block ${p.cls ?? ""}`}
            style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
            title={`${p.name}`}
          >
            <span className="gant-label">{p.name}</span>
          </div>
        );
      })}
    </div>
  );
}