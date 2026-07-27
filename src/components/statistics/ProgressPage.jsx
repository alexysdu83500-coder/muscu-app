import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  TrendingUp, Plus, ChevronDown, ArrowUp,
} from "lucide-react";
import { ChartCard } from "./ChartCard";
import { Card, Pill } from "../ui/Card";
import { EmptyState, SectionTitle } from "../ui/Feedback";
import { computePRs } from "../../services/statisticsService";
import { epley1RM, flattenExercises } from "../../utils/calculations";
import { PERIODS } from "../../utils/constants";
import { fmtDate } from "../../utils/formatters";

export function ProgressPage({ theme, sessions, programs }) {
  const allExercises = useMemo(() => {
    const names = new Set();
    programs.forEach((p) => flattenExercises(p.blocks).forEach((e) => names.add(e.name)));
    sessions.forEach((s) => s.exerciseLogs.forEach((e) => names.add(e.name)));
    return Array.from(names).sort();
  }, [programs, sessions]);

  const [selected, setSelected] = useState(allExercises[0] || "");
  const [period, setPeriod] = useState("3m");
  useEffect(() => { if (!selected && allExercises.length) setSelected(allExercises[0]); }, [allExercises, selected]);

  const periodDays = PERIODS.find((p) => p.id === period)?.days;
  const cutoff = periodDays ? Date.now() - periodDays * 86400000 : 0;

  const dataPoints = useMemo(() => {
    const pts = [];
    for (const s of [...sessions].reverse()) {
      if (s.startedAt < cutoff) continue;
      const el = s.exerciseLogs.find((e) => e.name === selected);
      if (!el) continue;
      const doneSets = el.sets.filter((x) => x.done && x.weight && x.reps);
      if (!doneSets.length) continue;
      const maxWeight = Math.max(...doneSets.map((x) => Number(x.weight)));
      const volume = doneSets.reduce((a, x) => a + Number(x.weight) * Number(x.reps), 0);
      const totalReps = doneSets.reduce((a, x) => a + Number(x.reps), 0);
      const est1RM = Math.max(...doneSets.map((x) => epley1RM(Number(x.weight), Number(x.reps))));
      pts.push({ date: s.date, dateLabel: fmtDate(s.date), maxWeight, volume, totalReps, est1RM });
    }
    return pts;
  }, [sessions, selected, cutoff]);

  const prs = useMemo(() => computePRs(sessions), [sessions]);

  const exerciseFrequency = useMemo(() => {
    const counts = {};
    sessions.forEach((s) => s.exerciseLogs.forEach((el) => { counts[el.name] = (counts[el.name] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [sessions]);

  const biggestProgress = useMemo(() => {
    const byExercise = {};
    sessions.forEach((s) => s.exerciseLogs.forEach((el) => {
      const doneSets = el.sets.filter((x) => x.done && x.weight);
      if (!doneSets.length) return;
      const max = Math.max(...doneSets.map((x) => Number(x.weight)));
      byExercise[el.name] = byExercise[el.name] || [];
      byExercise[el.name].push({ date: s.date, max });
    }));
    const results = [];
    for (const [name, arr] of Object.entries(byExercise)) {
      if (arr.length < 2) continue;
      arr.sort((a, b) => a.date.localeCompare(b.date));
      const first = arr[0].max, last = arr[arr.length - 1].max;
      const pct = first ? ((last - first) / first) * 100 : 0;
      if (pct > 0) results.push({ name, pct, first, last });
    }
    return results.sort((a, b) => b.pct - a.pct).slice(0, 3);
  }, [sessions]);

  const currentPR = prs[selected];

  return (
    <div className="px-4 pt-2 space-y-5">
      <div className="relative">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-2xl px-4 py-3.5 text-[15px] font-bold outline-none appearance-none" style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }}>
          {allExercises.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <ChevronDown size={16} color={theme.textFaint} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {PERIODS.map((p) => <Pill key={p.id} theme={theme} active={period === p.id} onClick={() => setPeriod(p.id)}>{p.label}</Pill>)}
      </div>

      {dataPoints.length === 0 ? (
        <Card theme={theme}><EmptyState theme={theme} icon={TrendingUp} title="Pas assez de données" subtitle="Enregistre des séances avec cet exercice pour voir ta progression." /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Charge max</p><p style={{ color: theme.text }} className="text-[19px] font-extrabold">{currentPR?.maxWeight || 0} kg</p></Card>
            <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">1RM estimé</p><p style={{ color: theme.text }} className="text-[19px] font-extrabold">{currentPR?.est1RM || 0} kg</p></Card>
          </div>

          <ChartCard theme={theme} title="Évolution du poids maximal">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={dataPoints} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs><linearGradient id="gradWeight" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={theme.accent} stopOpacity={0.35} /><stop offset="100%" stopColor={theme.accent} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.border} vertical={false} />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: theme.textFaint }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: theme.textFaint }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, fontSize: 12 }} labelStyle={{ color: theme.text }} />
                <Area type="monotone" dataKey="maxWeight" stroke={theme.accent} strokeWidth={2.5} fill="url(#gradWeight)" name="Poids max (kg)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard theme={theme} title="Volume par séance (kg)">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dataPoints} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.border} vertical={false} />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: theme.textFaint }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: theme.textFaint }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, fontSize: 12 }} labelStyle={{ color: theme.text }} />
                <Bar dataKey="volume" fill={theme.good} radius={[6, 6, 0, 0]} name="Volume" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard theme={theme} title="1RM estimé (formule Epley)">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={dataPoints} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.border} vertical={false} />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: theme.textFaint }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: theme.textFaint }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, fontSize: 12 }} labelStyle={{ color: theme.text }} />
                <Line type="monotone" dataKey="est1RM" stroke={theme.accent2} strokeWidth={2.5} dot={{ r: 3 }} name="1RM estimé" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      <div>
        <SectionTitle theme={theme}>Plus fortes progressions</SectionTitle>
        {biggestProgress.length === 0 ? <Card theme={theme}><EmptyState theme={theme} icon={TrendingUp} title="Pas encore de tendance" /></Card> : (
          <Card theme={theme}>
            {biggestProgress.map((b, i) => (
              <div key={b.name} className="px-4 py-3 flex items-center justify-between" style={{ borderTop: i ? `1px solid ${theme.border}` : "none" }}>
                <div><p style={{ color: theme.text }} className="font-semibold text-[13.5px]">{b.name}</p><p style={{ color: theme.textMuted }} className="text-[11.5px]">{b.first}kg → {b.last}kg</p></div>
                <span className="flex items-center gap-1 font-bold text-[13px]" style={{ color: theme.good }}><ArrowUp size={13} /> {b.pct.toFixed(0)}%</span>
              </div>
            ))}
          </Card>
        )}
      </div>

      <div>
        <SectionTitle theme={theme}>Exercices les plus pratiqués</SectionTitle>
        <Card theme={theme}>
          {exerciseFrequency.map(([name, count], i) => (
            <div key={name} className="px-4 py-3 flex items-center justify-between" style={{ borderTop: i ? `1px solid ${theme.border}` : "none" }}>
              <p style={{ color: theme.text }} className="font-semibold text-[13.5px]">{name}</p>
              <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold">{count}×</p>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
