export function ActivityHeatmap({ theme, sessionDates }) {
  const weeks = 26;
  const days = [];
  const today = new Date();
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ iso, active: sessionDates.has(iso) });
  }
  const cols = [];
  for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));

  return (
    <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {cols.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-1">
          {col.map((d) => (
            <div key={d.iso} title={d.iso} style={{ width: 10, height: 10, borderRadius: 3, background: d.active ? theme.accent : theme.card2, border: `1px solid ${theme.border}` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
