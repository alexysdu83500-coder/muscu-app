import React from "react";
import {
  Trophy,
} from "lucide-react";
import { Card } from "../ui/Card";
import { EmptyState, IconBadge } from "../ui/Feedback";
import { useStatistics } from "../../hooks/useStatistics";
import { fmtDate } from "../../utils/formatters";

export function RecordsPage({ theme, sessions }) {
  const { topRecords: list } = useStatistics(sessions);
  return (
    <div className="px-4 pt-2 space-y-2.5">
      {list.length === 0 ? (
        <Card theme={theme}><EmptyState theme={theme} icon={Trophy} title="Pas encore de records" subtitle="Termine des séries pendant une séance pour voir apparaître tes records ici." /></Card>
      ) : (
        <Card theme={theme}>
          {list.map(([name, pr], i) => (
            <div key={name} className="px-4 py-3.5 flex items-center justify-between" style={{ borderTop: i ? `1px solid ${theme.border}` : "none" }}>
              <div className="flex items-center gap-3 min-w-0">
                <IconBadge theme={theme} icon={Trophy} size={36} iconSize={16} filled />
                <div className="min-w-0">
                  <p style={{ color: theme.text }} className="font-semibold text-[14px] truncate">{name}</p>
                  <p style={{ color: theme.textMuted }} className="text-[11.5px]">{fmtDate(pr.date)}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p style={{ color: theme.accent }} className="font-bold text-[15px]">{pr.maxWeight}kg</p>
                <p style={{ color: theme.textFaint }} className="text-[10.5px]">1RM est. {pr.est1RM}kg</p>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
