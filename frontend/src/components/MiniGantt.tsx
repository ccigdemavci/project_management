import React, { useState } from 'react';
import { ChevronRight, ChevronDown, ChevronsUpDown } from 'lucide-react';

export type PhaseItem = {
  id: string;
  title: string;
  completed: boolean;
};

export type Phase = {
  id?: string; // Add optional ID
  name: string;
  start: string; // ISO
  end: string;   // ISO
  cls?: string;  // renk sınıfı
  status?: string; // "done" | "active" | ...
  items?: PhaseItem[];
};

type Props = {
  phases: Phase[];
};

export default function MiniGantt({ phases }: Props) {
  if (!phases?.length) return null;

  // Global expand/collapse for the whole list
  // Default to false (collapsed) as per user request "takes too much space"
  const [isOpen, setIsOpen] = useState(false);

  // Track expanded phases (sub-items) by index
  const [expanded, setExpanded] = useState<number[]>([]);

  const toggleExpand = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent ensuring list toggle trigger
    setExpanded(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  // Sort by start date
  const sorted = [...phases].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return (
    <div className="gant-wrapper">
      {/* Toggle Button for the whole list */}
      <button
        className="gant-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="gt-icon">
          <ChevronsUpDown size={16} />
        </span>
        <span className="gt-text">
          {isOpen ? "Zaman Çizelgesini Gizle" : "Zaman Çizelgesini Görüntüle"}
        </span>
      </button>

      {isOpen && (
        <div className="timeline-list open">
          {sorted.map((p, i) => {
            const startDate = new Date(p.start);
            const endDate = new Date(p.end);
            const isDone = p.status === "done";
            const isExpanded = expanded.includes(i);
            const hasItems = p.items && p.items.length > 0;

            // Format: "12 Kas" or "12 Kas - 14 Ara"
            const startStr = startDate.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
            const endStr = endDate.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
            const dateRange = startStr === endStr ? startStr : `${startStr} – ${endStr}`;

            // Status color class
            const colorClass = p.cls || "ph-design";

            return (
              <div
                key={i}
                className={`timeline-item ${isDone ? "done" : ""} ${hasItems ? "clickable" : ""}`}
                onClick={(e) => hasItems && toggleExpand(i, e)}
              >
                <div className="tl-marker">
                  <div className={`tl-dot ${colorClass}`}></div>
                  {i < sorted.length - 1 && <div className="tl-line"></div>}
                </div>
                <div className="tl-content">
                  <div className="tl-row main-row">
                    <div className="tl-info">
                      <span className="tl-name">{p.name}</span>
                      {hasItems && (
                        <span className="tl-toggle-icon">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      )}
                    </div>
                    <span className="tl-date">{dateRange}</span>
                  </div>

                  {/* Sub Items */}
                  {isExpanded && hasItems && (
                    <div className="tl-sub-items">
                      {p.items!.map((item) => (
                        <div key={item.id} className="tl-sub-item">
                          <div className={`si-dot ${item.completed ? 'completed' : ''}`}></div>
                          <span className={`si-text ${item.completed ? 'completed' : ''}`}>
                            {item.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}