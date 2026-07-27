import { Card } from "../ui/Card";

export function ChartCard({ theme, title, children }) {
  return (
    <Card theme={theme} className="p-4">
      <p style={{ color: theme.text }} className="font-bold text-[13.5px] mb-2">{title}</p>
      {children}
    </Card>
  );
}

/* ============================== WEIGHT ============================== */
