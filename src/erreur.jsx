import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence, Reorder, useReducedMotion } from "framer-motion";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import {
  Home, Dumbbell, History as HistoryIcon, TrendingUp, Scale, BarChart3,
  Plus, X, Check, ChevronRight, ChevronLeft, Play, Pause, Timer, Trash2,
  Edit2, GripVertical, Moon, Sun, Award, Search, Download, Upload, Copy,
  Flame, Calendar, Info, ChevronDown, RotateCcw, CheckCircle2, Circle,
  Target, ArrowUp, ArrowDown, Minus, Settings, FileDown, FileUp, Save,
} from "lucide-react";

export default function App() {

/* ============================== UTILITIES ============================== */

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const todayISO = () => new Date().toISOString().slice(0, 10);

const fmtDate = (iso, opts) => {
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  return d.toLocaleDateString("fr-FR", opts || { day: "numeric", month: "short" });
};

const fmtDateFull = (iso) =>
  new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

const fmtDuration = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h${String(m % 60).padStart(2, "0")}`;
  }
  return `${m}min ${s}s`;
};

const epley1RM = (weight, reps) => {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

const vibrate = (pattern) => {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
};

const QUOTES = [
  "La discipline surpasse la motivation.",
  "Chaque série compte, même la dernière.",
  "Le corps accomplit ce que l'esprit croit possible.",
  "La progression est lente, la régularité est reine.",
  "Aujourd'hui tu deviens plus fort qu'hier.",
  "Le seul mauvais entraînement est celui qu'on ne fait pas.",
  "La constance bat l'intensité sur la durée.",
  "Ton seul adversaire, c'est toi d'hier.",
  "Petit à petit, la charge devient légère.",
  "Transpire maintenant, brille plus tard.",
];

function quoteOfTheDay() {
  const d = new Date();
  const idx = (d.getFullYear() * 1000 + d.getMonth() * 31 + d.getDate()) % QUOTES.length;
  return QUOTES[idx];
}

function linRegSlope(points) {
  // points: [{x:number(days), y:number}]
  const n = points.length;
  if (n < 2) return null;
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumXX = points.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/* ============================== THEME ============================== */

function useTheme(isDark) {
  return useMemo(() => ({
    bg: isDark ? "#000000" : "#F2F2F7",
    bgAlt: isDark ? "#0A0A0B" : "#F2F2F7",
    card: isDark ? "#1C1C1E" : "#FFFFFF",
    card2: isDark ? "#242426" : "#FBFBFD",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(60,60,67,0.1)",
    text: isDark ? "#F5F5F7" : "#1C1C1E",
    textMuted: isDark ? "#8E8E93" : "#6E6E73",
    textFaint: isDark ? "#636366" : "#AEAEB2",
    accent: "#FF5A36",
    accent2: "#FF9F1C",
    good: "#30D5A6",
    bad: "#FF453A",
    tabBg: isDark ? "rgba(20,20,22,0.85)" : "rgba(255,255,255,0.85)",
  }), [isDark]);
}

/* ============================== STORAGE HOOK ============================== */

function usePersistentState(key, initial) {
  const [state, setState] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(key, false);
        if (res && res.value != null) setState(JSON.parse(res.value));
      } catch (e) { /* not found, keep initial */ }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try { await window.storage.set(key, JSON.stringify(state), false); }
      catch (e) { console.error("storage set failed", key, e); }
    })();
  }, [state, loaded, key]);
  return [state, setState, loaded];
}

/* ============================== DEFAULT DATA ============================== */

const DEFAULT_PROGRAMS = [
  {
    id: uid(), name: "Pecs", color: "#FF5A36",
    exercises: [
      { id: uid(), name: "Développé couché barre", series: 4, reps: 8, rest: 120, notes: "" },
      { id: uid(), name: "Développé incliné haltères", series: 3, reps: 10, rest: 90, notes: "" },
      { id: uid(), name: "Écarté poulie vis-à-vis", series: 3, reps: 12, rest: 60, notes: "" },
      { id: uid(), name: "Dips lestés", series: 3, reps: 10, rest: 90, notes: "" },
    ],
  },
  {
    id: uid(), name: "Épaules / Bras", color: "#FF9F1C",
    exercises: [
      { id: uid(), name: "Développé militaire", series: 4, reps: 8, rest: 120, notes: "" },
      { id: uid(), name: "Élévations latérales", series: 4, reps: 12, rest: 60, notes: "" },
      { id: uid(), name: "Curl barre EZ", series: 3, reps: 10, rest: 75, notes: "" },
      { id: uid(), name: "Extension triceps poulie", series: 3, reps: 12, rest: 60, notes: "" },
    ],
  },
  {
    id: uid(), name: "Dos", color: "#30D5A6",
    exercises: [
      { id: uid(), name: "Tractions lestées", series: 4, reps: 8, rest: 120, notes: "" },
      { id: uid(), name: "Rowing barre", series: 4, reps: 8, rest: 100, notes: "" },
      { id: uid(), name: "Tirage horizontal poulie", series: 3, reps: 12, rest: 75, notes: "" },
      { id: uid(), name: "Soulevé de terre", series: 3, reps: 6, rest: 150, notes: "" },
    ],
  },
  {
    id: uid(), name: "Jambes", color: "#5E5CE6",
    exercises: [
      { id: uid(), name: "Squat barre", series: 4, reps: 8, rest: 150, notes: "" },
      { id: uid(), name: "Presse à cuisses", series: 4, reps: 10, rest: 100, notes: "" },
      { id: uid(), name: "Leg curl", series: 3, reps: 12, rest: 60, notes: "" },
      { id: uid(), name: "Mollets debout", series: 4, reps: 15, rest: 45, notes: "" },
    ],
  },
];

/* ============================== SMALL UI PRIMITIVES ============================== */

function Card({ theme, children, className = "", style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-3xl ${className}`}
      style={{ background: theme.card, border: `1px solid ${theme.border}`, ...style }}
    >
      {children}
    </div>
  );
}

function Pill({ theme, children, active, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all active:scale-95"
      style={{
        background: active ? theme.text : theme.card2,
        color: active ? theme.bg : theme.textMuted,
        border: `1px solid ${active ? "transparent" : theme.border}`,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function IconButton({ theme, children, onClick, style = {}, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center rounded-full active:scale-90 transition-transform ${className}`}
      style={{ width: 38, height: 38, background: theme.card2, color: theme.text, border: `1px solid ${theme.border}`, ...style }}
    >
      {children}
    </button>
  );
}

function BigButton({ theme, children, onClick, gradient, style = {}, disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-2xl py-4 font-bold text-[16px] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
      style={{
        background: gradient ? `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})` : theme.card2,
        color: gradient ? "#fff" : theme.text,
        opacity: disabled ? 0.4 : 1,
        boxShadow: gradient ? `0 8px 24px -8px ${theme.accent}88` : "none",
        border: gradient ? "none" : `1px solid ${theme.border}`,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function SectionTitle({ theme, children, right }) {
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <h2 style={{ color: theme.text }} className="text-[13px] font-bold uppercase tracking-wide" >
        {children}
      </h2>
      {right}
    </div>
  );
}

function EffortRing({ theme, progress, size = 96, stroke = 11, label, value }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={theme.card2} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="url(#emberGrad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - pct * c }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="emberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.accent} />
            <stop offset="100%" stopColor={theme.accent2} />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: "absolute", inset: 0 }} className="flex flex-col items-center justify-center">
        <span style={{ color: theme.text }} className="text-[15px] font-extrabold leading-none">{value}</span>
        <span style={{ color: theme.textMuted }} className="text-[9px] mt-1">{label}</span>
      </div>
    </div>
  );
}

function EmptyState({ theme, icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="rounded-full flex items-center justify-center mb-4" style={{ width: 64, height: 64, background: theme.card2 }}>
        <Icon size={26} color={theme.textMuted} />
      </div>
      <p style={{ color: theme.text }} className="font-semibold text-[15px]">{title}</p>
      {subtitle && <p style={{ color: theme.textMuted }} className="text-[13px] mt-1 max-w-[240px]">{subtitle}</p>}
    </div>
  );
}

/* ============================== APP ROOT ============================== */

  const prefersReduced = useReducedMotion();
  const [isDark, setIsDark] = usePersistentState_simple("gt_dark", true);
  const theme = useTheme(isDark);

  const [programs, setPrograms, programsLoaded] = usePersistentState("gt_programs_v1", DEFAULT_PROGRAMS);
  const [sessions, setSessions, sessionsLoaded] = usePersistentState("gt_sessions_v1", []);
  const [weightEntries, setWeightEntries, weightLoaded] = usePersistentState("gt_weight_v1", []);
  const [settings, setSettings, settingsLoaded] = usePersistentState("gt_settings_v1", {
    goalWeight: null, lastProgramIndex: -1, restDefault: 90,
  });

  const [tab, setTab] = useState("dashboard");
  const [subview, setSubview] = useState(null); // {type, id}
  const [activeWorkout, setActiveWorkout] = useState(null);

  const dataLoaded = programsLoaded && sessionsLoaded && weightLoaded && settingsLoaded;

  const goTab = (t) => { setTab(t); setSubview(null); };

  if (!dataLoaded) {
    return (
      <div style={{ background: theme.bg, height: "100%" }} className="flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          style={{ width: 28, height: 28, borderRadius: 999, border: `3px solid ${theme.card2}`, borderTopColor: theme.accent }} />
      </div>
    );
  }

  return (
    <div
      style={{ background: theme.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif", minHeight: "100%", maxWidth: 480, margin: "0 auto", position: "relative" }}
      className="w-full flex flex-col"
    >
      <div className="flex-1 overflow-y-auto pb-28" style={{ WebkitOverflowScrolling: "touch" }}>
        <AnimatePresence mode="wait">
          {activeWorkout ? (
            <motion.div key="workout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WorkoutSession
                theme={theme} workout={activeWorkout} setWorkout={setActiveWorkout}
                sessions={sessions}
                onFinish={(session) => {
                  setSessions((s) => [session, ...s]);
                  setActiveWorkout(null);
                  setTab("dashboard");
                }}
                onCancel={() => setActiveWorkout(null)}
                restDefault={settings.restDefault}
              />
            </motion.div>
          ) : (
            <motion.div key={tab + (subview ? subview.type + subview.id : "")} initial={{ opacity: 0, x: prefersReduced ? 0 : 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <TopBar theme={theme} tab={tab} isDark={isDark} setIsDark={setIsDark} />
              {tab === "dashboard" && (
                <Dashboard
                  theme={theme} programs={programs} sessions={sessions} weightEntries={weightEntries}
                  settings={settings} setSettings={setSettings}
                  onStart={(program) => setActiveWorkout(makeWorkout(program))}
                />
              )}
              {tab === "programs" && !subview && (
                <ProgramsList
                  theme={theme} programs={programs} setPrograms={setPrograms}
                  onOpen={(id) => setSubview({ type: "program", id })}
                  onStart={(program) => setActiveWorkout(makeWorkout(program))}
                />
              )}
              {tab === "programs" && subview?.type === "program" && (
                <ProgramEditor
                  theme={theme} program={programs.find((p) => p.id === subview.id)}
                  setPrograms={setPrograms} onBack={() => setSubview(null)}
                  onStart={(program) => setActiveWorkout(makeWorkout(program))}
                />
              )}
              {tab === "history" && !subview && (
                <HistoryList theme={theme} sessions={sessions} onOpen={(id) => setSubview({ type: "session", id })} />
              )}
              {tab === "history" && subview?.type === "session" && (
                <SessionDetail
                  theme={theme} session={sessions.find((s) => s.id === subview.id)}
                  onBack={() => setSubview(null)}
                  onDelete={(id) => { setSessions((s) => s.filter((x) => x.id !== id)); setSubview(null); }}
                  onDuplicate={(session) => {
                    const prog = programs.find((p) => p.id === session.programId) || { id: session.programId, name: session.programName, exercises: session.exerciseLogs.map((el) => ({ id: el.exerciseId, name: el.name, series: el.sets.length, reps: 10, rest: 90, notes: "" })) };
                    setActiveWorkout(makeWorkout(prog));
                    setTab("dashboard"); setSubview(null);
                  }}
                />
              )}
              {tab === "progress" && (
                <ProgressPage theme={theme} sessions={sessions} programs={programs} />
              )}
              {tab === "weight" && (
                <WeightPage theme={theme} entries={weightEntries} setEntries={setWeightEntries} settings={settings} setSettings={setSettings} />
              )}
              {tab === "stats" && (
                <StatsPage theme={theme} sessions={sessions} programs={programs}
                  onExport={() => exportBackup(programs, sessions, weightEntries, settings)}
                  onImport={(data) => {
                    if (data.programs) setPrograms(data.programs);
                    if (data.sessions) setSessions(data.sessions);
                    if (data.weightEntries) setWeightEntries(data.weightEntries);
                    if (data.settings) setSettings(data.settings);
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {!activeWorkout && <BottomNav theme={theme} tab={tab} setTab={goTab} />}
    </div>
  );
}

function usePersistentState_simple(key, initial) {
  const [state, setState] = useState(initial);
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(key, false);
        if (res && res.value != null) setState(JSON.parse(res.value));
      } catch (e) {}
    })();
  }, [key]);
  const setAndSave = useCallback((v) => {
    setState((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      window.storage.set(key, JSON.stringify(next), false).catch(() => {});
      return next;
    });
  }, [key]);
  return [state, setAndSave];
}

function makeWorkout(program) {
  return {
    id: uid(),
    programId: program.id,
    programName: program.name,
    startedAt: Date.now(),
    exerciseLogs: program.exercises.map((ex) => ({
      exerciseId: ex.id,
      name: ex.name,
      restSec: ex.rest || 90,
      targetReps: ex.reps,
      notes: ex.notes,
      sets: Array.from({ length: ex.series || 3 }, () => ({ weight: "", reps: "", done: false })),
    })),
  };
}

function exportBackup(programs, sessions, weightEntries, settings) {
  const payload = { programs, sessions, weightEntries, settings, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `gymtrack-backup-${todayISO()}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================== TOP BAR & NAV ============================== */

const TAB_TITLES = {
  dashboard: "Aujourd'hui", programs: "Programmes", history: "Historique",
  progress: "Progression", weight: "Poids", stats: "Statistiques",
};

function TopBar({ theme, tab, isDark, setIsDark }) {
  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-2">
      <h1 style={{ color: theme.text }} className="text-[28px] font-extrabold tracking-tight">{TAB_TITLES[tab]}</h1>
      <button onClick={() => setIsDark((d) => !d)} className="active:scale-90 transition-transform rounded-full flex items-center justify-center" style={{ width: 38, height: 38, background: theme.card2, border: `1px solid ${theme.border}` }}>
        {isDark ? <Sun size={17} color={theme.text} /> : <Moon size={17} color={theme.text} />}
      </button>
    </div>
  );
}

function BottomNav({ theme, tab, setTab }) {
  const items = [
    { id: "dashboard", icon: Home, label: "Accueil" },
    { id: "programs", icon: Dumbbell, label: "Programmes" },
    { id: "history", icon: HistoryIcon, label: "Historique" },
    { id: "progress", icon: TrendingUp, label: "Progrès" },
    { id: "weight", icon: Scale, label: "Poids" },
    { id: "stats", icon: BarChart3, label: "Stats" },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none z-50">
      <div className="w-full pointer-events-auto" style={{ maxWidth: 480 }}>
        <div
          className="mx-3 mb-3 rounded-3xl flex items-stretch justify-between px-1 py-1.5 backdrop-blur-xl"
          style={{ background: theme.tabBg, border: `1px solid ${theme.border}`, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.3)" }}
        >
          {items.map((it) => {
            const active = tab === it.id;
            return (
              <button key={it.id} onClick={() => setTab(it.id)} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl transition-all active:scale-90" style={{ background: active ? "rgba(255,90,54,0.12)" : "transparent" }}>
                <it.icon size={19} color={active ? theme.accent : theme.textMuted} strokeWidth={active ? 2.4 : 2} />
                <span style={{ color: active ? theme.accent : theme.textMuted, fontSize: 9.5 }} className="font-semibold">{it.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================== DASHBOARD ============================== */

function computePRs(sessions) {
  const prs = {}; // name -> {maxWeight, maxWeightReps, est1RM, date}
  for (const s of sessions) {
    for (const el of s.exerciseLogs) {
      for (const set of el.sets) {
        if (!set.done || !set.weight || !set.reps) continue;
        const w = Number(set.weight), r = Number(set.reps);
        const est = epley1RM(w, r);
        const cur = prs[el.name];
        if (!cur || w > cur.maxWeight) {
          prs[el.name] = { ...(cur || {}), maxWeight: w, maxWeightReps: r, date: s.date || s.startedAtISO };
        }
        if (!prs[el.name].est1RM || est > prs[el.name].est1RM) {
          prs[el.name].est1RM = est;
        }
      }
    }
  }
  return prs;
}

function lastPerformanceFor(sessions, exerciseName) {
  for (const s of sessions) {
    const el = s.exerciseLogs.find((e) => e.name === exerciseName);
    if (el && el.sets.some((s2) => s2.done)) return { session: s, log: el };
  }
  return null;
}

function Dashboard({ theme, programs, sessions, weightEntries, settings, setSettings, onStart }) {
  const prs = useMemo(() => computePRs(sessions), [sessions]);
  const lastWeight = weightEntries.length ? [...weightEntries].sort((a, b) => b.date.localeCompare(a.date))[0] : null;
  const suggestedIndex = programs.length ? (settings.lastProgramIndex + 1) % programs.length : -1;
  const suggested = programs[suggestedIndex] || programs[0];

  const last7 = sessions.filter((s) => Date.now() - s.startedAt < 7 * 86400000);
  const tonnage7 = last7.reduce((a, s) => a + (s.tonnage || 0), 0);
  const avgTonnage = sessions.length ? sessions.slice(0, 6).reduce((a, s) => a + (s.tonnage || 0), 0) / Math.max(1, Math.min(6, sessions.length)) : 0;
  const ringProgress = avgTonnage ? Math.min(1, tonnage7 / (avgTonnage * 3)) : (last7.length ? 0.3 : 0);

  const recentSessions = sessions.slice(0, 3);
  const topPRs = Object.entries(prs).sort((a, b) => b[1].maxWeight - a[1].maxWeight).slice(0, 3);

  return (
    <div className="px-4 pt-2 space-y-5">
      <Card theme={theme} className="p-5 relative overflow-hidden">
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 999, background: `radial-gradient(circle, ${theme.accent}22, transparent 70%)` }} />
        <div className="flex items-center justify-between relative">
          <div>
            <p style={{ color: theme.textMuted }} className="text-[12px] font-medium">Programme suggéré</p>
            <p style={{ color: theme.text }} className="text-[22px] font-extrabold mt-0.5">{suggested ? suggested.name : "Aucun"}</p>
            {suggested && <p style={{ color: theme.textMuted }} className="text-[12px] mt-0.5">{suggested.exercises.length} exercices</p>}
          </div>
          <EffortRing theme={theme} progress={ringProgress} value={`${Math.round(tonnage7 / 1000) || 0}t`} label="7 jours" />
        </div>
        {suggested && (
          <button
            onClick={() => { setSettings((s) => ({ ...s, lastProgramIndex: suggestedIndex })); onStart(suggested); }}
            className="w-full mt-5 rounded-2xl py-4 font-bold text-[16px] text-white active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`, boxShadow: `0 8px 24px -8px ${theme.accent}88` }}
          >
            <Play size={18} fill="#fff" /> Commencer la séance
          </button>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card theme={theme} className="p-4">
          <div className="flex items-center gap-1.5 mb-1"><Scale size={13} color={theme.textMuted} /><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold">Poids actuel</p></div>
          <p style={{ color: theme.text }} className="text-[22px] font-extrabold">{lastWeight ? `${lastWeight.weight} kg` : "—"}</p>
          {lastWeight && <p style={{ color: theme.textFaint }} className="text-[11px] mt-0.5">{fmtDate(lastWeight.date)}</p>}
        </Card>
        <Card theme={theme} className="p-4">
          <div className="flex items-center gap-1.5 mb-1"><Flame size={13} color={theme.accent} /><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold">Séances (7j)</p></div>
          <p style={{ color: theme.text }} className="text-[22px] font-extrabold">{last7.length}</p>
          <p style={{ color: theme.textFaint }} className="text-[11px] mt-0.5">{Math.round(tonnage7).toLocaleString("fr-FR")} kg soulevés</p>
        </Card>
      </div>

      <div>
        <SectionTitle theme={theme}>Dernières performances</SectionTitle>
        {recentSessions.length === 0 ? (
          <Card theme={theme}><EmptyState theme={theme} icon={Dumbbell} title="Aucune séance enregistrée" subtitle="Lance ta première séance pour voir ton historique ici." /></Card>
        ) : (
          <Card theme={theme} className="divide-y" style={{ borderColor: theme.border }}>
            {recentSessions.map((s) => (
              <div key={s.id} className="px-4 py-3.5 flex items-center justify-between" style={{ borderTop: `1px solid ${theme.border}` }}>
                <div>
                  <p style={{ color: theme.text }} className="font-semibold text-[14px]">{s.programName}</p>
                  <p style={{ color: theme.textMuted }} className="text-[12px]">{fmtDate(s.date)} · {fmtDuration(s.durationSec || 0)}</p>
                </div>
                <p style={{ color: theme.accent }} className="text-[13px] font-bold">{Math.round(s.tonnage).toLocaleString("fr-FR")} kg</p>
              </div>
            ))}
          </Card>
        )}
      </div>

      <div>
        <SectionTitle theme={theme}>Records personnels</SectionTitle>
        {topPRs.length === 0 ? (
          <Card theme={theme}><EmptyState theme={theme} icon={Award} title="Pas encore de records" /></Card>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {topPRs.map(([name, pr]) => (
              <Card theme={theme} className="p-3" key={name}>
                <Award size={14} color={theme.accent2} className="mb-1.5" />
                <p style={{ color: theme.text }} className="text-[13px] font-bold leading-tight">{pr.maxWeight}kg</p>
                <p style={{ color: theme.textMuted }} className="text-[10.5px] leading-tight mt-0.5 line-clamp-2">{name}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card theme={theme} className="p-4 flex items-start gap-3" style={{ background: `linear-gradient(135deg, ${theme.accent}14, ${theme.accent2}0a)` }}>
        <Info size={16} color={theme.accent} className="mt-0.5 shrink-0" />
        <p style={{ color: theme.text }} className="text-[13px] italic leading-snug">{quoteOfTheDay()}</p>
      </Card>
    </div>
  );
}

/* ============================== PROGRAMS ============================== */

function ProgramsList({ theme, programs, setPrograms, onOpen, onStart }) {
  const addProgram = () => {
    const p = { id: uid(), name: "Nouveau programme", color: theme.accent, exercises: [] };
    setPrograms((ps) => [...ps, p]);
    onOpen(p.id);
  };
  return (
    <div className="px-4 pt-2 space-y-3">
      {programs.length === 0 && <Card theme={theme}><EmptyState theme={theme} icon={Dumbbell} title="Aucun programme" subtitle="Crée ton premier programme d'entraînement." /></Card>}
      {programs.map((p) => (
        <Card key={p.id} theme={theme} className="p-4">
          <div className="flex items-center justify-between">
            <button className="flex-1 text-left" onClick={() => onOpen(p.id)}>
              <div className="flex items-center gap-2.5">
                <div style={{ width: 10, height: 10, borderRadius: 999, background: p.color || theme.accent }} />
                <p style={{ color: theme.text }} className="font-bold text-[16px]">{p.name}</p>
              </div>
              <p style={{ color: theme.textMuted }} className="text-[12.5px] mt-1 ml-[18px]">{p.exercises.length} exercice{p.exercises.length !== 1 ? "s" : ""}</p>
            </button>
            <div className="flex items-center gap-2">
              <IconButton theme={theme} onClick={() => onStart(p)}><Play size={15} color={theme.accent} fill={theme.accent} /></IconButton>
              <IconButton theme={theme} onClick={() => onOpen(p.id)}><ChevronRight size={16} color={theme.textMuted} /></IconButton>
            </div>
          </div>
        </Card>
      ))}
      <button onClick={addProgram} className="w-full rounded-2xl py-4 font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform" style={{ background: theme.card2, color: theme.accent, border: `1.5px dashed ${theme.border}` }}>
        <Plus size={18} /> Nouveau programme
      </button>
    </div>
  );
}

function ProgramEditor({ theme, program, setPrograms, onBack, onStart }) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(program?.name || "");
  const [showAdd, setShowAdd] = useState(false);

  if (!program) return null;

  const updateProgram = (fn) => setPrograms((ps) => ps.map((p) => (p.id === program.id ? fn({ ...p }) : p)));
  const setExercises = (exercises) => updateProgram((p) => ({ ...p, exercises }));

  const removeExercise = (id) => setExercises(program.exercises.filter((e) => e.id !== id));
  const updateExercise = (id, patch) => setExercises(program.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const deleteProgram = () => {
    setPrograms((ps) => ps.filter((p) => p.id !== program.id));
    onBack();
  };

  return (
    <div className="px-4 pt-1 space-y-4">
      <div className="flex items-center gap-2 -ml-1">
        <IconButton theme={theme} onClick={onBack}><ChevronLeft size={18} color={theme.text} /></IconButton>
        {editingName ? (
          <input
            autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => { updateProgram((p) => ({ ...p, name: nameDraft || p.name })); setEditingName(false); }}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
            className="flex-1 text-[20px] font-extrabold bg-transparent outline-none"
            style={{ color: theme.text }}
          />
        ) : (
          <button onClick={() => setEditingName(true)} className="flex-1 text-left flex items-center gap-2">
            <h1 style={{ color: theme.text }} className="text-[20px] font-extrabold truncate">{program.name}</h1>
            <Edit2 size={13} color={theme.textFaint} />
          </button>
        )}
      </div>

      <BigButton theme={theme} gradient onClick={() => onStart(program)}>
        <Play size={17} fill="#fff" /> Commencer la séance
      </BigButton>

      <div>
        <SectionTitle theme={theme}>Exercices · glisser pour réordonner</SectionTitle>
        {program.exercises.length === 0 ? (
          <Card theme={theme}><EmptyState theme={theme} icon={Dumbbell} title="Aucun exercice" subtitle="Ajoute des exercices à ce programme." /></Card>
        ) : (
          <Reorder.Group axis="y" values={program.exercises} onReorder={setExercises} className="space-y-2.5">
            {program.exercises.map((ex) => (
              <Reorder.Item key={ex.id} value={ex}>
                <ExerciseRow theme={theme} exercise={ex} onUpdate={(patch) => updateExercise(ex.id, patch)} onRemove={() => removeExercise(ex.id)} />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>

      <button onClick={() => setShowAdd(true)} className="w-full rounded-2xl py-3.5 font-bold text-[14.5px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform" style={{ background: theme.card2, color: theme.accent, border: `1.5px dashed ${theme.border}` }}>
        <Plus size={17} /> Ajouter un exercice
      </button>

      <button onClick={deleteProgram} className="w-full rounded-2xl py-3 font-semibold text-[13.5px] flex items-center justify-center gap-2 mt-6" style={{ color: theme.bad }}>
        <Trash2 size={14} /> Supprimer le programme
      </button>

      <AnimatePresence>
        {showAdd && (
          <AddExerciseSheet theme={theme} onClose={() => setShowAdd(false)} onAdd={(ex) => { setExercises([...program.exercises, ex]); setShowAdd(false); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ExerciseRow({ theme, exercise, onUpdate, onRemove }) {
  const [open, setOpen] = useState(false);
  return (
    <Card theme={theme} className="overflow-hidden">
      <div className="flex items-center gap-2 p-3.5">
        <GripVertical size={16} color={theme.textFaint} className="cursor-grab shrink-0" />
        <button className="flex-1 text-left" onClick={() => setOpen((o) => !o)}>
          <p style={{ color: theme.text }} className="font-semibold text-[14.5px]">{exercise.name}</p>
          <p style={{ color: theme.textMuted }} className="text-[12px] mt-0.5">{exercise.series} × {exercise.reps} reps · repos {exercise.rest}s</p>
        </button>
        <ChevronDown size={16} color={theme.textFaint} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} onClick={() => setOpen((o) => !o)} />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3.5 pb-3.5 space-y-2.5" style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12 }}>
              <FieldRow theme={theme} label="Nom">
                <input value={exercise.name} onChange={(e) => onUpdate({ name: e.target.value })} className="bg-transparent outline-none text-right flex-1" style={{ color: theme.text }} />
              </FieldRow>
              <div className="grid grid-cols-3 gap-2">
                <MiniStepper theme={theme} label="Séries" value={exercise.series} onChange={(v) => onUpdate({ series: v })} />
                <MiniStepper theme={theme} label="Reps" value={exercise.reps} onChange={(v) => onUpdate({ reps: v })} />
                <MiniStepper theme={theme} label="Repos" value={exercise.rest} step={15} onChange={(v) => onUpdate({ rest: v })} suffix="s" />
              </div>
              <textarea placeholder="Notes (technique, variante...)" value={exercise.notes} onChange={(e) => onUpdate({ notes: e.target.value })}
                className="w-full rounded-xl p-2.5 text-[13px] outline-none resize-none" rows={2}
                style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
              <button onClick={onRemove} className="text-[12.5px] font-semibold flex items-center gap-1.5" style={{ color: theme.bad }}>
                <Trash2 size={12} /> Retirer cet exercice
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function FieldRow({ theme, label, children }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span style={{ color: theme.textMuted }} className="text-[12.5px] font-medium shrink-0">{label}</span>
      {children}
    </div>
  );
}

function MiniStepper({ theme, label, value, onChange, step = 1, suffix = "" }) {
  return (
    <div className="rounded-xl p-2 flex flex-col items-center" style={{ background: theme.card2, border: `1px solid ${theme.border}` }}>
      <span style={{ color: theme.textFaint }} className="text-[9.5px] font-semibold uppercase mb-1">{label}</span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onChange(Math.max(0, value - step))} className="w-5 h-5 rounded-md flex items-center justify-center active:scale-90" style={{ background: theme.bg }}>
          <Minus size={10} color={theme.text} />
        </button>
        <span style={{ color: theme.text }} className="text-[13px] font-bold w-8 text-center">{value}{suffix}</span>
        <button onClick={() => onChange(value + step)} className="w-5 h-5 rounded-md flex items-center justify-center active:scale-90" style={{ background: theme.bg }}>
          <Plus size={10} color={theme.text} />
        </button>
      </div>
    </div>
  );
}

const COMMON_EXERCISES = [
  "Développé couché barre", "Développé incliné haltères", "Squat barre", "Soulevé de terre",
  "Tractions", "Rowing barre", "Développé militaire", "Curl biceps", "Extension triceps",
  "Élévations latérales", "Presse à cuisses", "Fentes", "Dips", "Gainage", "Hip thrust",
];

function AddExerciseSheet({ theme, onClose, onAdd }) {
  const [name, setName] = useState("");
  const [series, setSeries] = useState(4);
  const [reps, setReps] = useState(10);
  const [rest, setRest] = useState(90);
  const filtered = name ? COMMON_EXERCISES.filter((e) => e.toLowerCase().includes(name.toLowerCase())) : COMMON_EXERCISES.slice(0, 5);

  return (
    <motion.div className="fixed inset-0 z-[100] flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl p-5 pb-8" style={{ maxWidth: 480, background: theme.card, borderTop: `1px solid ${theme.border}` }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: theme.border }} />
        <h3 style={{ color: theme.text }} className="text-[17px] font-bold mb-4">Ajouter un exercice</h3>
        <div className="relative mb-2">
          <Search size={14} color={theme.textFaint} className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input autoFocus placeholder="Nom de l'exercice" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl pl-9 pr-3 py-3 text-[14.5px] outline-none" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
        </div>
        {filtered.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {filtered.map((e) => (
              <button key={e} onClick={() => setName(e)} className="px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ background: theme.card2, color: theme.textMuted, border: `1px solid ${theme.border}` }}>{e}</button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <MiniStepper theme={theme} label="Séries" value={series} onChange={setSeries} />
          <MiniStepper theme={theme} label="Reps" value={reps} onChange={setReps} />
          <MiniStepper theme={theme} label="Repos" value={rest} step={15} onChange={setRest} suffix="s" />
        </div>
        <BigButton theme={theme} gradient disabled={!name.trim()} onClick={() => onAdd({ id: uid(), name: name.trim(), series, reps, rest, notes: "" })}>
          <Plus size={17} /> Ajouter
        </BigButton>
      </motion.div>
    </motion.div>
  );
}

/* ============================== WORKOUT SESSION ============================== */

function WorkoutSession({ theme, workout, setWorkout, sessions, onFinish, onCancel, restDefault }) {
  const [elapsed, setElapsed] = useState(0);
  const [restTimer, setRestTimer] = useState(null); // {total, remaining, running}
  const [confirmEnd, setConfirmEnd] = useState(false);
  const restIntervalRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - workout.startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [workout.startedAt]);

  useEffect(() => {
    if (!restTimer || !restTimer.running) { clearInterval(restIntervalRef.current); return; }
    restIntervalRef.current = setInterval(() => {
      setRestTimer((rt) => {
        if (!rt) return rt;
        if (rt.remaining <= 1) { vibrate([300, 100, 300]); clearInterval(restIntervalRef.current); return null; }
        return { ...rt, remaining: rt.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(restIntervalRef.current);
  }, [restTimer?.running]);

  const tonnage = workout.exerciseLogs.reduce((a, el) => a + el.sets.reduce((b, s) => b + (s.done ? (Number(s.weight) || 0) * (Number(s.reps) || 0) : 0), 0), 0);
  const totalSets = workout.exerciseLogs.reduce((a, el) => a + el.sets.filter((s) => s.done).length, 0);

  const updateExerciseLog = (exerciseId, fn) => {
    setWorkout((w) => ({ ...w, exerciseLogs: w.exerciseLogs.map((el) => (el.exerciseId === exerciseId ? fn({ ...el }) : el)) }));
  };

  const startRest = (sec) => setRestTimer({ total: sec, remaining: sec, running: true });

  const finishWorkout = () => {
    const durationSec = Math.floor((Date.now() - workout.startedAt) / 1000);
    const session = {
      id: workout.id, programId: workout.programId, programName: workout.programName,
      date: todayISO(), startedAt: workout.startedAt, durationSec, tonnage, totalSets,
      exerciseLogs: workout.exerciseLogs.map((el) => ({ ...el, sets: el.sets.filter((s) => s.done || s.weight || s.reps) })),
    };
    onFinish(session);
  };

  return (
    <div className="px-4 pt-2 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="text-[13px] font-semibold" style={{ color: theme.textMuted }}>Annuler</button>
        <div className="text-center">
          <p style={{ color: theme.text }} className="text-[15px] font-extrabold">{workout.programName}</p>
          <p style={{ color: theme.textMuted }} className="text-[11.5px]">{fmtDuration(elapsed)}</p>
        </div>
        <button onClick={() => setConfirmEnd(true)} className="text-[13px] font-bold" style={{ color: theme.accent }}>Terminer</button>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Card theme={theme} className="p-3 text-center">
          <p style={{ color: theme.text }} className="text-[16px] font-extrabold">{Math.round(tonnage).toLocaleString("fr-FR")}</p>
          <p style={{ color: theme.textFaint }} className="text-[10px]">kg tonnage</p>
        </Card>
        <Card theme={theme} className="p-3 text-center">
          <p style={{ color: theme.text }} className="text-[16px] font-extrabold">{totalSets}</p>
          <p style={{ color: theme.textFaint }} className="text-[10px]">séries faites</p>
        </Card>
        <Card theme={theme} className="p-3 text-center">
          <p style={{ color: theme.text }} className="text-[16px] font-extrabold">{fmtDuration(elapsed)}</p>
          <p style={{ color: theme.textFaint }} className="text-[10px]">durée</p>
        </Card>
      </div>

      <div className="space-y-3">
        {workout.exerciseLogs.map((el) => (
          <ExerciseLogCard key={el.exerciseId} theme={theme} log={el} sessions={sessions}
            onChange={(fn) => updateExerciseLog(el.exerciseId, fn)}
            onSetDone={() => startRest(el.restSec || restDefault)} />
        ))}
      </div>

      <AnimatePresence>
        {restTimer && <RestTimerBar theme={theme} restTimer={restTimer} setRestTimer={setRestTimer} />}
      </AnimatePresence>

      <AnimatePresence>
        {confirmEnd && (
          <ConfirmSheet theme={theme} title="Terminer la séance ?" subtitle={`${totalSets} séries · ${Math.round(tonnage).toLocaleString("fr-FR")} kg de tonnage`}
            confirmLabel="Terminer" onConfirm={finishWorkout} onCancel={() => setConfirmEnd(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ExerciseLogCard({ theme, log, sessions, onChange, onSetDone }) {
  const last = useMemo(() => lastPerformanceFor(sessions, log.name), [sessions, log.name]);
  const pr = useMemo(() => {
    let best = null;
    for (const s of sessions) {
      const el = s.exerciseLogs.find((e) => e.name === log.name);
      if (!el) continue;
      for (const set of el.sets) {
        if (set.done && set.weight && (!best || Number(set.weight) > best)) best = Number(set.weight);
      }
    }
    return best;
  }, [sessions, log.name]);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(log.name);
  useEffect(() => { setNameDraft(log.name); }, [log.name]);

  const setSet = (idx, patch) => onChange((l) => { const sets = [...l.sets]; sets[idx] = { ...sets[idx], ...patch }; return { ...l, sets }; });
  const addSet = () => onChange((l) => ({ ...l, sets: [...l.sets, { weight: "", reps: "", done: false }] }));
  const removeSet = (idx) => onChange((l) => ({ ...l, sets: l.sets.filter((_, i) => i !== idx) }));
  const renameExercise = () => { const n = nameDraft.trim() || log.name; onChange((l) => ({ ...l, name: n })); setNameDraft(n); setEditingName(false); };

  return (
    <Card theme={theme} className="p-4">
      <div className="flex items-center justify-between mb-1 gap-2">
        {editingName ? (
          <input
            autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
            onBlur={renameExercise} onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
            className="flex-1 font-bold text-[15px] bg-transparent outline-none border-b"
            style={{ color: theme.text, borderColor: theme.accent }}
          />
        ) : (
          <button onClick={() => setEditingName(true)} className="flex-1 flex items-center gap-1.5 text-left">
            <p style={{ color: theme.text }} className="font-bold text-[15px]">{log.name}</p>
            <Edit2 size={12} color={theme.textFaint} className="shrink-0" />
          </button>
        )}
        <span style={{ color: theme.textFaint }} className="text-[11px] shrink-0">{log.targetReps} reps cible</span>
      </div>
      <div className="flex items-center gap-3 mb-3">
        {last && <p style={{ color: theme.textMuted }} className="text-[11.5px]">Dernière: {last.log.sets.filter((s) => s.done).map((s) => `${s.weight}×${s.reps}`).join(", ") || "—"}</p>}
        {pr && <span className="flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: theme.accent2 }}><Award size={11} /> PR {pr}kg</span>}
      </div>
      <div className="space-y-1.5">
        <div className="grid items-center gap-2 px-1" style={{ gridTemplateColumns: "22px 1fr 1fr 34px 22px" }}>
          <span />
          <span style={{ color: theme.textFaint }} className="text-[10.5px] font-semibold">POIDS (KG)</span>
          <span style={{ color: theme.textFaint }} className="text-[10.5px] font-semibold">REPS</span>
          <span />
          <span />
        </div>
        {log.sets.map((s, idx) => (
          <div key={idx} className="grid items-center gap-2" style={{ gridTemplateColumns: "22px 1fr 1fr 34px 22px" }}>
            <span style={{ color: theme.textFaint }} className="text-[12px] font-bold text-center">{idx + 1}</span>
            <input inputMode="decimal" placeholder="0" value={s.weight} onChange={(e) => setSet(idx, { weight: e.target.value })}
              className="rounded-xl px-2.5 py-2.5 text-[15px] font-semibold outline-none text-center" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
            <input inputMode="numeric" placeholder="0" value={s.reps} onChange={(e) => setSet(idx, { reps: e.target.value })}
              className="rounded-xl px-2.5 py-2.5 text-[15px] font-semibold outline-none text-center" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
            <button
              onClick={() => { const nowDone = !s.done; setSet(idx, { done: nowDone }); if (nowDone) onSetDone(); }}
              className="rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              style={{ width: 34, height: 40, background: s.done ? theme.good : theme.card2, border: `1px solid ${s.done ? theme.good : theme.border}` }}>
              <Check size={16} color={s.done ? "#fff" : theme.textFaint} strokeWidth={3} />
            </button>
            <button onClick={() => removeSet(idx)} className="flex items-center justify-center active:scale-90 transition-transform" style={{ width: 22, height: 40 }}>
              <X size={14} color={theme.textFaint} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={addSet} className="mt-2.5 text-[12.5px] font-semibold flex items-center gap-1" style={{ color: theme.accent }}>
        <Plus size={13} /> Ajouter une série
      </button>
    </Card>
  );
}

function RestTimerBar({ theme, restTimer, setRestTimer }) {
  const pct = restTimer.remaining / restTimer.total;
  return (
    <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
      className="fixed left-0 right-0 bottom-24 flex justify-center z-40 px-4" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="w-full rounded-2xl p-3.5 flex items-center gap-3 backdrop-blur-xl" style={{ maxWidth: 448, background: theme.tabBg, border: `1px solid ${theme.border}`, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.4)" }}>
        <div style={{ position: "relative", width: 40, height: 40 }}>
          <svg width={40} height={40} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={20} cy={20} r={16} fill="none" stroke={theme.card2} strokeWidth={4} />
            <circle cx={20} cy={20} r={16} fill="none" stroke={theme.accent} strokeWidth={4} strokeLinecap="round" strokeDasharray={2 * Math.PI * 16} strokeDashoffset={2 * Math.PI * 16 * (1 - pct)} />
          </svg>
          <Timer size={14} color={theme.accent} style={{ position: "absolute", inset: 0, margin: "auto" }} />
        </div>
        <div className="flex-1">
          <p style={{ color: theme.text }} className="font-bold text-[16px] tabular-nums">{Math.floor(restTimer.remaining / 60)}:{String(restTimer.remaining % 60).padStart(2, "0")}</p>
          <p style={{ color: theme.textMuted }} className="text-[11px]">Repos en cours</p>
        </div>
        <button onClick={() => setRestTimer((rt) => ({ ...rt, running: !rt.running }))} className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90" style={{ background: theme.card2 }}>
          {restTimer.running ? <Pause size={14} color={theme.text} /> : <Play size={14} color={theme.text} />}
        </button>
        <button onClick={() => setRestTimer((rt) => ({ ...rt, remaining: rt.remaining + 15, total: rt.total + 15 }))} className="text-[11px] font-bold px-2" style={{ color: theme.textMuted }}>+15s</button>
        <button onClick={() => setRestTimer(null)} className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90" style={{ background: theme.card2 }}>
          <X size={14} color={theme.text} />
        </button>
      </div>
    </motion.div>
  );
}

function ConfirmSheet({ theme, title, subtitle, confirmLabel, onConfirm, onCancel, danger }) {
  return (
    <motion.div className="fixed inset-0 z-[100] flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onCancel} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl p-5 pb-8 text-center" style={{ maxWidth: 480, background: theme.card, borderTop: `1px solid ${theme.border}` }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: theme.border }} />
        <h3 style={{ color: theme.text }} className="text-[17px] font-bold mb-1">{title}</h3>
        {subtitle && <p style={{ color: theme.textMuted }} className="text-[13px] mb-5">{subtitle}</p>}
        <div className="space-y-2">
          <BigButton theme={theme} gradient={!danger} onClick={onConfirm} style={danger ? { background: theme.bad, color: "#fff" } : {}}>{confirmLabel}</BigButton>
          <BigButton theme={theme} onClick={onCancel}>Annuler</BigButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ============================== HISTORY ============================== */

function HistoryList({ theme, sessions, onOpen }) {
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
              <button key={s.id} onClick={() => onOpen(s.id)} className="w-full px-4 py-3.5 flex items-center justify-between text-left" style={{ borderTop: i ? `1px solid ${theme.border}` : "none" }}>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ width: 44, height: 44, background: theme.card2 }}>
                    <span style={{ color: theme.text }} className="text-[13px] font-extrabold leading-none">{fmtDate(s.date, { day: "numeric" })}</span>
                    <span style={{ color: theme.textFaint }} className="text-[8.5px] font-semibold uppercase">{fmtDate(s.date, { month: "short" })}</span>
                  </div>
                  <div>
                    <p style={{ color: theme.text }} className="font-semibold text-[14.5px]">{s.programName}</p>
                    <p style={{ color: theme.textMuted }} className="text-[12px]">{fmtDuration(s.durationSec || 0)} · {s.totalSets} séries</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-1.5">
                  <p style={{ color: theme.accent }} className="text-[13px] font-bold">{Math.round(s.tonnage).toLocaleString("fr-FR")}kg</p>
                  <ChevronRight size={14} color={theme.textFaint} />
                </div>
              </button>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}

function SessionDetail({ theme, session, onBack, onDelete, onDuplicate }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!session) return null;
  return (
    <div className="px-4 pt-1 space-y-4">
      <div className="flex items-center gap-2 -ml-1">
        <IconButton theme={theme} onClick={onBack}><ChevronLeft size={18} color={theme.text} /></IconButton>
        <div>
          <h1 style={{ color: theme.text }} className="text-[19px] font-extrabold">{session.programName}</h1>
          <p style={{ color: theme.textMuted }} className="text-[12.5px] capitalize">{fmtDateFull(session.date)}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <Card theme={theme} className="p-3 text-center"><p style={{ color: theme.text }} className="text-[16px] font-extrabold">{Math.round(session.tonnage).toLocaleString("fr-FR")}</p><p style={{ color: theme.textFaint }} className="text-[10px]">kg tonnage</p></Card>
        <Card theme={theme} className="p-3 text-center"><p style={{ color: theme.text }} className="text-[16px] font-extrabold">{session.totalSets}</p><p style={{ color: theme.textFaint }} className="text-[10px]">séries</p></Card>
        <Card theme={theme} className="p-3 text-center"><p style={{ color: theme.text }} className="text-[16px] font-extrabold">{fmtDuration(session.durationSec || 0)}</p><p style={{ color: theme.textFaint }} className="text-[10px]">durée</p></Card>
      </div>
      <div className="space-y-2.5">
        {session.exerciseLogs.map((el) => (
          <Card theme={theme} className="p-4" key={el.exerciseId}>
            <p style={{ color: theme.text }} className="font-bold text-[14.5px] mb-2">{el.name}</p>
            <div className="space-y-1">
              {el.sets.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-[13px]" style={{ color: s.done ? theme.text : theme.textFaint }}>
                  <span>Série {i + 1}</span>
                  <span className="font-semibold">{s.weight || 0} kg × {s.reps || 0}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5 pt-2">
        <BigButton theme={theme} onClick={() => onDuplicate(session)}><Copy size={15} /> Dupliquer</BigButton>
        <BigButton theme={theme} onClick={() => setConfirmDelete(true)} style={{ color: theme.bad }}><Trash2 size={15} /> Supprimer</BigButton>
      </div>
      <AnimatePresence>
        {confirmDelete && <ConfirmSheet theme={theme} danger title="Supprimer cette séance ?" subtitle="Cette action est irréversible." confirmLabel="Supprimer" onConfirm={() => onDelete(session.id)} onCancel={() => setConfirmDelete(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* ============================== PROGRESS ============================== */

const PERIODS = [
  { id: "1w", label: "1 sem.", days: 7 }, { id: "1m", label: "1 mois", days: 30 },
  { id: "3m", label: "3 mois", days: 90 }, { id: "6m", label: "6 mois", days: 180 },
  { id: "1y", label: "1 an", days: 365 }, { id: "all", label: "Tout", days: null },
];

function ProgressPage({ theme, sessions, programs }) {
  const allExercises = useMemo(() => {
    const names = new Set();
    programs.forEach((p) => p.exercises.forEach((e) => names.add(e.name)));
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

function ChartCard({ theme, title, children }) {
  return (
    <Card theme={theme} className="p-4">
      <p style={{ color: theme.text }} className="font-bold text-[13.5px] mb-2">{title}</p>
      {children}
    </Card>
  );
}

/* ============================== WEIGHT ============================== */

function WeightPage({ theme, entries, setEntries, settings, setSettings }) {
  const [showAdd, setShowAdd] = useState(false);
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
            <p style={{ color: theme.text }} className="text-[34px] font-extrabold leading-none mt-1">{latest ? latest.weight : "—"}<span className="text-[16px] font-semibold" style={{ color: theme.textMuted }}> kg</span></p>
          </div>
          {first && latest && (
            <span className="flex items-center gap-1 font-bold text-[13px] mb-1" style={{ color: latest.weight <= first.weight ? theme.good : theme.bad }}>
              {latest.weight <= first.weight ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
              {Math.abs(latest.weight - first.weight).toFixed(1)} kg
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
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Moyenne 7j</p><p style={{ color: theme.text }} className="text-[17px] font-extrabold">{weeklyAvg ? weeklyAvg.toFixed(1) : "—"} kg</p></Card>
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Variation 30j</p><p style={{ color: theme.text }} className="text-[17px] font-extrabold">{monthlyChange != null ? `${monthlyChange > 0 ? "+" : ""}${monthlyChange.toFixed(1)}` : "—"} kg</p></Card>
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Poids max</p><p style={{ color: theme.text }} className="text-[17px] font-extrabold">{maxW || "—"} kg</p></Card>
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Poids min</p><p style={{ color: theme.text }} className="text-[17px] font-extrabold">{minW || "—"} kg</p></Card>
      </div>

      <Card theme={theme} className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p style={{ color: theme.text }} className="font-bold text-[14px] flex items-center gap-1.5"><Target size={14} color={theme.accent} /> Objectif de poids</p>
        </div>
        <div className="flex items-center gap-2">
          <input inputMode="decimal" placeholder="Ex: 75" value={settings.goalWeight ?? ""} onChange={(e) => setSettings((s) => ({ ...s, goalWeight: e.target.value ? Number(e.target.value) : null }))}
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
                  <p style={{ color: theme.text }} className="font-bold text-[15px]">{e.weight} kg</p>
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

function AddWeightSheet({ theme, onClose, onAdd }) {
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [bodyfat, setBodyfat] = useState("");
  const [comment, setComment] = useState("");
  return (
    <motion.div className="fixed inset-0 z-[100] flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl p-5 pb-8" style={{ maxWidth: 480, background: theme.card, borderTop: `1px solid ${theme.border}` }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: theme.border }} />
        <h3 style={{ color: theme.text }} className="text-[17px] font-bold mb-4">Ajouter une pesée</h3>
        <div className="space-y-2.5">
          <FieldRow theme={theme} label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent outline-none text-right" style={{ color: theme.text }} /></FieldRow>
          <FieldRow theme={theme} label="Poids (kg)"><input autoFocus inputMode="decimal" placeholder="0" value={weight} onChange={(e) => setWeight(e.target.value)} className="bg-transparent outline-none text-right w-24 font-bold text-[16px]" style={{ color: theme.text }} /></FieldRow>
          <FieldRow theme={theme} label="Tour de taille (cm)"><input inputMode="decimal" placeholder="optionnel" value={waist} onChange={(e) => setWaist(e.target.value)} className="bg-transparent outline-none text-right w-24" style={{ color: theme.text }} /></FieldRow>
          <FieldRow theme={theme} label="Masse grasse (%)"><input inputMode="decimal" placeholder="optionnel" value={bodyfat} onChange={(e) => setBodyfat(e.target.value)} className="bg-transparent outline-none text-right w-24" style={{ color: theme.text }} /></FieldRow>
          <textarea placeholder="Commentaire (optionnel)" value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
            className="w-full rounded-xl p-2.5 text-[13px] outline-none resize-none" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
        </div>
        <div className="mt-5">
          <BigButton theme={theme} gradient disabled={!weight} onClick={() => onAdd({ id: uid(), date, weight: Number(weight), waist: waist ? Number(waist) : null, bodyfat: bodyfat ? Number(bodyfat) : null, comment })}>
            <Save size={16} /> Enregistrer
          </BigButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ============================== STATS ============================== */

function StatsPage({ theme, sessions, programs, onExport, onImport }) {
  const fileInputRef = useRef(null);
  const totalSessions = sessions.length;
  const totalHours = sessions.reduce((a, s) => a + (s.durationSec || 0), 0) / 3600;
  const totalTonnage = sessions.reduce((a, s) => a + (s.tonnage || 0), 0);
  const totalReps = sessions.reduce((a, s) => a + s.exerciseLogs.reduce((b, el) => b + el.sets.reduce((c, s2) => c + (s2.done ? Number(s2.reps) || 0 : 0), 0), 0), 0);

  const heaviestSet = useMemo(() => {
    let best = null;
    sessions.forEach((s) => s.exerciseLogs.forEach((el) => el.sets.forEach((set) => {
      if (set.done && set.weight && (!best || Number(set.weight) > best.weight)) best = { weight: Number(set.weight), reps: set.reps, name: el.name, date: s.date };
    })));
    return best;
  }, [sessions]);

  const favoriteExercise = useMemo(() => {
    const counts = {};
    sessions.forEach((s) => s.exerciseLogs.forEach((el) => { counts[el.name] = (counts[el.name] || 0) + 1; }));
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries[0]?.[0] || null;
  }, [sessions]);

  const frequency = totalSessions >= 2 ? (() => {
    const dates = sessions.map((s) => new Date(s.date).getTime()).sort((a, b) => a - b);
    const spanDays = (dates[dates.length - 1] - dates[0]) / 86400000 || 1;
    return (totalSessions / (spanDays / 7)).toFixed(1);
  })() : null;

  const sessionDates = useMemo(() => new Set(sessions.map((s) => s.date)), [sessions]);

  return (
    <div className="px-4 pt-2 space-y-5">
      <div className="grid grid-cols-2 gap-2.5">
        <StatBox theme={theme} icon={Dumbbell} label="Séances totales" value={totalSessions} />
        <StatBox theme={theme} icon={Timer} label="Heures d'entraînement" value={totalHours.toFixed(1) + "h"} />
        <StatBox theme={theme} icon={Flame} label="Tonnage total" value={Math.round(totalTonnage).toLocaleString("fr-FR") + " kg"} />
        <StatBox theme={theme} icon={BarChart3} label="Répétitions totales" value={totalReps.toLocaleString("fr-FR")} />
        <StatBox theme={theme} icon={Calendar} label="Fréquence" value={frequency ? `${frequency}/sem` : "—"} />
        <StatBox theme={theme} icon={Award} label="Série la plus lourde" value={heaviestSet ? `${heaviestSet.weight}kg` : "—"} />
      </div>

      {favoriteExercise && (
        <Card theme={theme} className="p-4 flex items-center gap-3">
          <div className="rounded-2xl flex items-center justify-center shrink-0" style={{ width: 44, height: 44, background: `${theme.accent}18` }}><Dumbbell size={18} color={theme.accent} /></div>
          <div><p style={{ color: theme.textMuted }} className="text-[11.5px] font-semibold">Exercice favori</p><p style={{ color: theme.text }} className="font-bold text-[15px]">{favoriteExercise}</p></div>
        </Card>
      )}

      <div>
        <SectionTitle theme={theme}>Activité annuelle</SectionTitle>
        <Card theme={theme} className="p-4">
          <ActivityHeatmap theme={theme} sessionDates={sessionDates} />
        </Card>
      </div>

      <div>
        <SectionTitle theme={theme}>Sauvegarde & données</SectionTitle>
        <Card theme={theme} className="p-4 space-y-2.5">
          <p style={{ color: theme.textMuted }} className="text-[12.5px] leading-snug">Tes données sont stockées localement sur cet appareil et fonctionnent hors connexion. Exporte régulièrement une sauvegarde.</p>
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <BigButton theme={theme} onClick={onExport}><FileDown size={15} /> Exporter</BigButton>
            <BigButton theme={theme} onClick={() => fileInputRef.current?.click()}><FileUp size={15} /> Importer</BigButton>
          </div>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = () => { try { const data = JSON.parse(reader.result); onImport(data); } catch (err) { alert("Fichier invalide"); } };
            reader.readAsText(file);
            e.target.value = "";
          }} />
        </Card>
      </div>

      <Card theme={theme} className="p-4 flex items-start gap-3" style={{ background: `${theme.textMuted}0d` }}>
        <Info size={15} color={theme.textMuted} className="mt-0.5 shrink-0" />
        <p style={{ color: theme.textMuted }} className="text-[12px] leading-snug">Installe cette app sur ton écran d'accueil iPhone via Safari (icône Partager → « Sur l'écran d'accueil ») pour un accès en plein écran, hors connexion, comme une app native.</p>
      </Card>
    </div>
  );
}

function StatBox({ theme, icon: Icon, label, value }) {
  return (
    <Card theme={theme} className="p-3.5">
      <Icon size={14} color={theme.accent} className="mb-1.5" />
      <p style={{ color: theme.text }} className="text-[16px] font-extrabold leading-tight">{value}</p>
      <p style={{ color: theme.textMuted }} className="text-[10.5px] mt-0.5">{label}</p>
    </Card>
  );
}

function ActivityHeatmap({ theme, sessionDates }) {
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
