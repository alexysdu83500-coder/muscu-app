import React, { useState, useMemo } from "react";
import {
  HistoryIcon, ChevronRight, Edit2, Search,
} from "lucide-react";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/Feedback";
import { fmtDate, fmtDuration } from "../../utils/formatters";

export function HistoryList({ theme, sessions, onOpen, onEdit }) {
  const [query, setQuery] = useState("");
  const filtered = sessions.filter((s) => s.programName.toLowerCase().includes(query.toLowerCase()));
  const grouped = useMemo(() => {
    const byMonth = {};
    for (const s of filtered) {
      const key = fmtDate(s.date, { month: "long", year: "numeric" });
      byMonth[key] = byMonth[key] || [];
      byMonth[key].push(s);
    }
    return byMonth;
  }, [filtered]);

  return (
    <div className="px-4 pt-2 space-y-4">
      <div className="relative">
        <Search size={14} color={theme.textFaint} className="absolute left-3 top-1/2 -translate-y-1/2" />
        <input placeholder="Rechercher une séance" value={query} onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl pl-9 pr-3 py-2.5 text-[14px] outline-none" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
      </div>
      {sessions.length === 0 && <Card theme={theme}><EmptyState theme={theme} icon={HistoryIcon} title="Aucune séance" subtitle="Ton historique de séances apparaîtra ici." /></Card>}
      {Object.entries(grouped).map(([month, list]) => (
        <div key={month}>
          <p style={{ color: theme.textMuted }} className="text-[12px] font-bold uppercase tracking-wide mb-2 px-1 capitalize">{month}</p>
          <Card theme={theme}>
            {list.map((s, i) => (
              <div key={s.id} className="w-full px-4 py-3.5 flex items-center gap-2" style={{ borderTop: i ? `1px solid ${theme.border}` : "none" }}>
                <button onClick={() => onOpen(s.id)} className="flex-1 flex items-center justify-between text-left min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ width: 44, height: 44, background: theme.card2 }}>
                      <span style={{ color: theme.text }} className="text-[13px] font-extrabold leading-none">{fmtDate(s.date, { day: "numeric" })}</span>
                      <span style={{ color: theme.textFaint }} className="text-[8.5px] font-semibold uppercase">{fmtDate(s.date, { month: "short" })}</span>
                    </div>
                    <div className="min-w-0">
                      <p style={{ color: theme.text }} className="font-semibold text-[14.5px] truncate">{s.programName}</p>
                      <p style={{ color: theme.textMuted }} className="text-[12px]">{fmtDuration(s.durationSec || 0)} · {s.totalSets} séries</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-1.5 shrink-0 pl-2">
                    <p style={{ color: theme.accent }} className="text-[13px] font-bold">{Math.round(s.tonnage).toLocaleString("fr-FR")}kg</p>
                    <ChevronRight size={14} color={theme.textFaint} />
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(s.id); }}
                  className="shrink-0 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ width: 34, height: 34, background: theme.card2, border: `1px solid ${theme.border}` }}
                  aria-label="Modifier la séance"
                >
                  <Edit2 size={14} color={theme.textMuted} />
                </button>
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}
