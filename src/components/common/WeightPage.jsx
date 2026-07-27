import React, { useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  Scale, Plus, X, Target, ArrowUp, ArrowDown,
} from "lucide-react";
import { AddWeightSheet } from "./AddWeightSheet";
import { ChartCard } from "../statistics/ChartCard";
import { Card } from "../ui/Card";
import { EmptyState, SectionTitle } from "../ui/Feedback";
import { linRegSlope } from "../../utils/calculations";
import { fmtDate, fmtWeight, parseLocaleNumber } from "../../utils/formatters";

export function WeightPage({ theme, entries, setEntries, settings, setSettings }) {
  const [showAdd, setShowAdd] = useState(false);
  // Buffer texte séparé du nombre stocké : évite que la virgule tapée en cours de saisie
  // soit effacée à chaque frappe (le champ ne doit refléter que ce que l'utilisateur tape,
  // pas la valeur numérique déjà "committée" dans les réglages).
  const [goalDraft, setGoalDraft] = useState(() => (settings.goalWeight != null ? String(settings.goalWeight) : ""));
  const sorted = useMemo(() => [...entries].sort((a, b) => a.date.localeCompare(b.date)), [entries]);
  const latest = sorted[sorted.length - 1];
  const first = sorted[0];

  const weekAgo = Date.now() - 7 * 86400000;
  const monthAgo = Date.now() - 30 * 86400000;
  const weekEntries = sorted.filter((e) => new Date(e.date).getTime() >= weekAgo);
  const weeklyAvg = weekEntries.length ? weekEntries.reduce((a, e) => a + e.weight, 0) / weekEntries.length : null;
  const monthEntry = [...sorted].reverse().find((e) => new Date(e.date).getTime() <= monthAgo);
  const monthlyChange = monthEntry && latest ? latest.weight - monthEntry.weight : null;

  const maxW = sorted.length ? Math.max(...sorted.map((e) => e.weight)) : null;
  const minW = sorted.length ? Math.min(...sorted.map((e) => e.weight)) : null;

  const goalEstimate = useMemo(() => {
    if (!settings.goalWeight || sorted.length < 3) return null;
    const base = new Date(sorted[0].date).getTime();
    const pts = sorted.map((e) => ({ x: (new Date(e.date).getTime() - base) / 86400000, y: e.weight }));
    const reg = linRegSlope(pts);
    if (!reg || reg.slope === 0) return null;
    const targetX = (settings.goalWeight - reg.intercept) / reg.slope;
    const daysFromNow = targetX - pts[pts.length - 1].x;
    if (daysFromNow <= 0 || !isFinite(daysFromNow)) return null;
    const targetDate = new Date(Date.now() + daysFromNow * 86400000);
    return { date: targetDate, days: Math.round(daysFromNow), trending: reg.slope < 0 ? "down" : "up" };
  }, [sorted, settings.goalWeight]);

  const chartData = sorted.map((e) => ({ ...e, dateLabel: fmtDate(e.date) }));

  return (
    <div className="px-4 pt-2 space-y-5">
      <Card theme={theme} className="p-5">
        <div className="flex items-end justify-between">
          <div>
            <p style={{ color: theme.textMuted }} className="text-[12px] font-medium">Poids actuel</p>
            <p style={{ color: theme.text }} className="text-[34px] font-extrabold leading-none mt-1">{latest ? fmtWeight(latest.weight) : "—"}<span className="text-[16px] font-semibold" style={{ color: theme.textMuted }}> kg</span></p>
          </div>
          {first && latest && (
            <span className="flex items-center gap-1 font-bold text-[13px] mb-1" style={{ color: latest.weight <= first.weight ? theme.good : theme.bad }}>
              {latest.weight <= first.weight ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
              {fmtWeight(Math.abs(latest.weight - first.weight))} kg
            </span>
          )}
        </div>
      </Card>

      {sorted.length > 1 && (
        <ChartCard theme={theme} title="Évolution du poids">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs><linearGradient id="gradW" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={theme.good} stopOpacity={0.35} /><stop offset="100%" stopColor={theme.good} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} vertical={false} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: theme.textFaint }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: theme.textFaint }} axisLine={false} tickLine={false} width={30} domain={["dataMin - 2", "dataMax + 2"]} />
              <Tooltip contentStyle={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, fontSize: 12 }} labelStyle={{ color: theme.text }} />
              <Area type="monotone" dataKey="weight" stroke={theme.good} strokeWidth={2.5} fill="url(#gradW)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Moyenne 7j</p><p style={{ color: theme.text }} className="text-[17px] font-extrabold">{weeklyAvg ? fmtWeight(weeklyAvg) : "—"} kg</p></Card>
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Variation 30j</p><p style={{ color: theme.text }} className="text-[17px] font-extrabold">{monthlyChange != null ? `${monthlyChange > 0 ? "+" : ""}${fmtWeight(monthlyChange)}` : "—"} kg</p></Card>
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Poids max</p><p style={{ color: theme.text }} className="text-[17px] font-extrabold">{maxW ? fmtWeight(maxW) : "—"} kg</p></Card>
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Poids min</p><p style={{ color: theme.text }} className="text-[17px] font-extrabold">{minW ? fmtWeight(minW) : "—"} kg</p></Card>
      </div>

      <Card theme={theme} className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p style={{ color: theme.text }} className="font-bold text-[14px] flex items-center gap-1.5"><Target size={14} color={theme.accent} /> Objectif de poids</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            inputMode="decimal" placeholder="Ex: 75" value={goalDraft}
            onChange={(e) => {
              const raw = e.target.value;
              setGoalDraft(raw);
              if (raw.trim() === "") { setSettings((s) => ({ ...s, goalWeight: null })); return; }
              const parsed = parseLocaleNumber(raw);
              if (Number.isFinite(parsed) && parsed > 0) setSettings((s) => ({ ...s, goalWeight: parsed }));
              // Sinon (ex: "75," en cours de frappe, ou texte invalide) : on laisse le
              // buffer affiché tel quel sans toucher au réglage tant que ce n'est pas
              // un nombre valide, plutôt que d'écraser avec NaN.
            }}
            className="flex-1 rounded-xl px-3 py-2.5 text-[14.5px] font-semibold outline-none" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
          <span style={{ color: theme.textMuted }} className="text-[13px]">kg</span>
        </div>
        {goalEstimate ? (
          <p style={{ color: theme.textMuted }} className="text-[12.5px] mt-2.5 leading-snug">
            Selon ta tendance actuelle, objectif atteint vers le <span style={{ color: theme.text, fontWeight: 700 }}>{goalEstimate.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span> (~{goalEstimate.days} jours).
          </p>
        ) : settings.goalWeight ? (
          <p style={{ color: theme.textFaint }} className="text-[12px] mt-2.5">Ajoute plus de mesures pour estimer la date d'atteinte.</p>
        ) : null}
      </Card>

      <div>
        <SectionTitle theme={theme} right={<button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-[12.5px] font-bold" style={{ color: theme.accent }}><Plus size={13} /> Ajouter</button>}>Mesures</SectionTitle>
        {sorted.length === 0 ? <Card theme={theme}><EmptyState theme={theme} icon={Scale} title="Aucune mesure" subtitle="Ajoute ta première pesée." /></Card> : (
          <Card theme={theme}>
            {[...sorted].reverse().slice(0, 10).map((e, i) => (
              <div key={e.id} className="px-4 py-3 flex items-center justify-between" style={{ borderTop: i ? `1px solid ${theme.border}` : "none" }}>
                <div>
                  <p style={{ color: theme.text }} className="font-semibold text-[13.5px]">{fmtDate(e.date, { day: "numeric", month: "long" })}</p>
                  {(e.waist || e.bodyfat) && <p style={{ color: theme.textMuted }} className="text-[11.5px]">{e.waist ? `Taille ${e.waist}cm` : ""}{e.waist && e.bodyfat ? " · " : ""}{e.bodyfat ? `MG ${e.bodyfat}%` : ""}</p>}
                  {e.comment && <p style={{ color: theme.textFaint }} className="text-[11px] italic mt-0.5">{e.comment}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <p style={{ color: theme.text }} className="font-bold text-[15px]">{fmtWeight(e.weight)} kg</p>
                  <button onClick={() => setEntries((arr) => arr.filter((x) => x.id !== e.id))}><X size={14} color={theme.textFaint} /></button>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      <AnimatePresence>
        {showAdd && <AddWeightSheet theme={theme} onClose={() => setShowAdd(false)} onAdd={(entry) => { setEntries((arr) => [...arr, entry]); setShowAdd(false); }} />}
      </AnimatePresence>
    </div>
  );
}
