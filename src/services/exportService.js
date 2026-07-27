import { todayISO } from "../utils/formatters";

export function exportBackup(programs, sessions, weightEntries, settings) {
  const payload = { programs, sessions, weightEntries, settings, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `gymtrack-backup-${todayISO()}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================== TOP BAR & NAV ============================== */
