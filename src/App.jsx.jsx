import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence, Reorder, useReducedMotion } from "framer-motion";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import {
  Home, Dumbbell, History as HistoryIcon, TrendingUp, Scale, BarChart3,
  Plus, X, Check, ChevronRight, ChevronLeft, Play, Pause, Timer, Trash2,
  Edit2, GripVertical, Moon, Sun, Search, Download, Upload, Copy,
  Flame, Calendar, Info, ChevronDown, RotateCcw, CheckCircle2, Circle,
  Target, ArrowUp, ArrowDown, Minus, Settings, FileDown, FileUp, Save,
  Link2, Unlink, Trophy, Sparkles, ArrowUpDown, User,
} from "lucide-react";

/* ============================== STOCKAGE (localStorage) ============================== */
// `window.storage` (get/set/delete/list) est une API fournie automatiquement par
// l'environnement d'aperçu de Claude.ai — elle N'EXISTE PAS une fois le site déployé
// ailleurs (GitHub Pages, Vercel, ton propre hébergement...). Ce petit bloc ne s'active
// QUE si `window.storage` n'existe pas déjà : dans l'aperçu Claude, rien ne change ; sur
// ton site déployé, il fournit une implémentation réelle basée sur `localStorage` (natif
// au navigateur, persiste réellement après un rafraîchissement de page).
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) {
      const value = window.localStorage.getItem(key);
      if (value == null) throw new Error(`gt-storage: clé "${key}" introuvable`);
      return { key, value };
    },
    async set(key, value) {
      window.localStorage.setItem(key, value);
      return { key, value };
    },
    async delete(key) {
      window.localStorage.removeItem(key);
      return { key, deleted: true };
    },
    async list(prefix) {
      const keys = Object.keys(window.localStorage).filter((k) => !prefix || k.startsWith(prefix));
      return { keys };
    },
  };
}

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

// Formate un nombre sans décimale inutile (80 au lieu de 80.0, mais 82.5 conservé).
const fmtNum = (n) => {
  const num = Number(n) || 0;
  return Number.isInteger(num) ? String(num) : String(Math.round(num * 10) / 10);
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

/* ============================== BLOCKS (single / superset / triset / circuit) ============================== */
// A program is made of `blocks`. Each block holds 1..N exercises.
// 1 exercise = normal exercise, 2 = superset (biset), 3 = triset, 4+ = circuit.
// The rest timer lives on the block, not on individual exercises: it only starts
// after the LAST exercise of the block finishes its set for that round.

const flattenExercises = (blocks) => (blocks || []).flatMap((b) => b.exercises);

function groupLabel(n) {
  if (n <= 1) return null;
  if (n === 2) return "Biset";
  if (n === 3) return "Triset";
  return "Circuit";
}

function computeGroupLetters(blocks) {
  const map = {};
  let counter = 0;
  (blocks || []).forEach((b) => {
    if (b.exercises.length > 1) { map[b.id] = String.fromCharCode(65 + counter); counter += 1; }
  });
  return map;
}

function normalizeProgram(p) {
  if (p.blocks) return p;
  const blocks = (p.exercises || []).map((ex) => ({
    id: uid(),
    restSec: ex.rest || 90,
    exercises: [{ id: ex.id, name: ex.name, series: ex.series, reps: ex.reps, notes: ex.notes }],
  }));
  return { id: p.id, name: p.name, color: p.color, blocks };
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

// Variante "debounced" : sauvegarde automatiquement à chaque changement, mais regroupe les
// écritures très rapprochées (ex: taper un poids caractère par caractère) en une seule,
// quelques centaines de ms après la dernière frappe — au lieu d'un appel réseau par
// caractère. `flushNow()` force une sauvegarde immédiate (utilisé avant fermeture de page).
function usePersistentStateDebounced(key, initial, delayMs = 500) {
  const [state, setState] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef(null);
  const latestRef = useRef(initial);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(key, false);
        if (res && res.value != null) { const v = JSON.parse(res.value); setState(v); latestRef.current = v; }
      } catch (e) { /* rien de sauvegardé, on garde la valeur initiale */ }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { latestRef.current = state; }, [state]);

  const flushNow = useCallback(() => {
    if (!loaded) return;
    clearTimeout(timerRef.current);
    window.storage.set(key, JSON.stringify(latestRef.current), false).catch(() => {});
  }, [key, loaded]);

  useEffect(() => {
    if (!loaded) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      window.storage.set(key, JSON.stringify(state), false).catch((e) => console.error("storage set failed", key, e));
    }, delayMs);
    return () => clearTimeout(timerRef.current);
  }, [state, loaded, key, delayMs]);

  return [state, setState, loaded, flushNow];
}

/* ============================== DEFAULT DATA ============================== */

const singleBlock = (name, series, reps, rest, notes = "") => ({
  id: uid(), restSec: rest, exercises: [{ id: uid(), name, series, reps, notes }],
});

const DEFAULT_PROGRAMS = [
  {
    id: uid(), name: "Pecs", color: "#FF5A36",
    blocks: [
      singleBlock("Développé couché barre", 4, 8, 120),
      {
        id: uid(), restSec: 90,
        exercises: [
          { id: uid(), name: "Développé incliné haltères", series: 3, reps: 10, notes: "" },
          { id: uid(), name: "Écarté poulie vis-à-vis", series: 3, reps: 12, notes: "" },
        ],
      },
      singleBlock("Dips lestés", 3, 10, 90),
    ],
  },
  {
    id: uid(), name: "Épaules / Bras", color: "#FF9F1C",
    blocks: [
      singleBlock("Développé militaire", 4, 8, 120),
      singleBlock("Élévations latérales", 4, 12, 60),
      {
        id: uid(), restSec: 75,
        exercises: [
          { id: uid(), name: "Curl barre EZ", series: 3, reps: 10, notes: "" },
          { id: uid(), name: "Extension triceps poulie", series: 3, reps: 12, notes: "" },
        ],
      },
    ],
  },
  {
    id: uid(), name: "Dos", color: "#30D5A6",
    blocks: [
      singleBlock("Tractions lestées", 4, 8, 120),
      singleBlock("Rowing barre", 4, 8, 100),
      singleBlock("Tirage horizontal poulie", 3, 12, 75),
      singleBlock("Soulevé de terre", 3, 6, 150),
    ],
  },
  {
    id: uid(), name: "Jambes", color: "#5E5CE6",
    blocks: [
      singleBlock("Squat barre", 4, 8, 150),
      singleBlock("Presse à cuisses", 4, 10, 100),
      singleBlock("Leg curl", 3, 12, 60),
      singleBlock("Mollets debout", 4, 15, 45),
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

// Badge circulaire coloré autour d'une icône : utilisé partout (nav, stats, en-têtes) pour
// donner une identité visuelle cohérente et plus énergique qu'une icône nue.
function IconBadge({ theme, icon: Icon, size = 34, iconSize = 16, tone = "accent", filled = false, className = "" }) {
  const colors = {
    accent: filled ? `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})` : `${theme.accent}1f`,
    good: filled ? theme.good : `${theme.good}22`,
    muted: theme.card2,
  };
  const iconColor = filled ? "#fff" : tone === "muted" ? theme.textMuted : tone === "good" ? theme.good : theme.accent;
  return (
    <div
      className={`flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size, borderRadius: size * 0.32, background: colors[tone] || colors.accent }}
    >
      <Icon size={iconSize} color={iconColor} strokeWidth={2.3} />
    </div>
  );
}

// Petit logo maison (éclair dans une flamme stylisée) : identité de marque réutilisable,
// pas une simple icône lucide — sert d'écran de chargement et de repère visuel de l'app.
function AppLogoMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF5A36" />
          <stop offset="100%" stopColor="#FF9F1C" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="12" fill="url(#logoGrad)" />
      <path d="M22 6 L11 22h7l-2 12 13-17h-8l1-11z" fill="#fff" />
    </svg>
  );
}

/* ============================== APP ROOT ============================== */

export default function App() {
  const prefersReduced = useReducedMotion();
  const [isDark, setIsDark] = usePersistentState_simple("gt_dark", true);
  const theme = useTheme(isDark);

  const [programs, setPrograms, programsLoaded] = usePersistentState("gt_programs_v1", DEFAULT_PROGRAMS);
  const [sessions, setSessions, sessionsLoaded] = usePersistentState("gt_sessions_v1", []);
  const [weightEntries, setWeightEntries, weightLoaded] = usePersistentState("gt_weight_v1", []);
  const [settings, setSettings, settingsLoaded] = usePersistentState("gt_settings_v1", {
    goalWeight: null, lastProgramIndex: -1, restDefault: 90,
  });
  // Profil personnel local à cet appareil — pas de compte, pas de mot de passe.
  // { name, age, height, goal, level }, toujours un objet (pas de flux "création de compte").
  const [userProfile, setUserProfile, profileLoaded] = usePersistentState("gt_profile_v1", {
    name: "", age: null, height: null, goal: "", level: "",
  });

  // Navigation : seulement 4 onglets. Le sous-détail (programme ouvert, séance ouverte...)
  // vit désormais localement DANS chaque écran concerné (ex: ProfileHub), plus au niveau App.
  const [tab, setTab] = useState("dashboard"); // 'dashboard' | 'workout' | 'progress' | 'profile'

  // Séance active : PERSISTÉE (avant, c'était un simple useState — perdu à chaque refresh).
  // `usePersistentStateDebounced` regroupe les sauvegardes pendant la saisie rapide (poids/
  // reps tapés caractère par caractère) au lieu d'écrire à chaque frappe, et `flushActiveWorkout`
  // force une sauvegarde immédiate juste avant que la page ne se ferme (voir l'effet plus bas).
  const [activeWorkout, setActiveWorkout, activeWorkoutLoaded, flushActiveWorkout] = usePersistentStateDebounced("gt_active_workout_v1", null, 400);

  // "État global de séance" (léger) : un instantané en lecture seule de ce qui se passe
  // dans la séance en cours (exercice, chrono, phase, repos restant), mis à jour par
  // WorkoutSession via `onStatusChange`. Sert à afficher la bannière persistante et le
  // badge orange dans la nav quand l'utilisateur est sur un AUTRE onglet — WorkoutSession
  // reste lui-même toujours monté (voir plus bas), ce n'est donc qu'un aperçu, pas la
  // source de vérité (qui reste dans WorkoutSession/activeWorkout).
  const [sessionStatus, setSessionStatus] = useState(null);

  const dataLoaded = programsLoaded && sessionsLoaded && weightLoaded && settingsLoaded && profileLoaded && activeWorkoutLoaded;

  // Sécurité : force une sauvegarde immédiate de la séance active juste avant que
  // l'utilisateur ne quitte/ferme/rafraîchisse la page, plutôt que d'attendre le debounce.
  useEffect(() => {
    const flush = () => flushActiveWorkout();
    const onVisibility = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [flushActiveWorkout]);

  useEffect(() => {
    if (!programsLoaded) return;
    setPrograms((ps) => (ps.some((p) => !p.blocks) ? ps.map(normalizeProgram) : ps));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programsLoaded]);

  // Démarre une séance ET bascule vers l'onglet "Séance en cours" pour la voir tout de suite.
  const startWorkout = (program) => { setActiveWorkout(makeWorkout(program)); setTab("workout"); };
  const endWorkout = () => { setActiveWorkout(null); setSessionStatus(null); };

  // Efface toutes les données locales (programmes, historique, poids, réglages, profil) —
  // voir <SettingsPage/>, "Zone de danger". Irréversible.
  const resetData = () => {
    endWorkout();
    setUserProfile({ name: "", age: null, height: null, goal: "", level: "" });
    setPrograms(DEFAULT_PROGRAMS);
    setSessions([]);
    setWeightEntries([]);
    setSettings({ goalWeight: null, lastProgramIndex: -1, restDefault: 90 });
    setTab("dashboard");
  };


  if (!dataLoaded) {
    return (
      <div style={{ background: theme.bg }} className="flex flex-col items-center justify-center gap-5 gt-app-shell">
        <style>{`.gt-app-shell { height: 100vh; height: 100dvh; }`}</style>
        <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}>
          <AppLogoMark size={52} />
        </motion.div>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          style={{ width: 24, height: 24, borderRadius: 999, border: `3px solid ${theme.card2}`, borderTopColor: theme.accent }} />
      </div>
    );
  }

  // Le contenu "normal" des onglets est masqué (pas détruit) uniquement pendant qu'on
  // regarde l'onglet Séance ET qu'une séance est active — sinon il reste affiché normalement.
  const showingActiveWorkout = !!(activeWorkout && tab === "workout");

  return (
    <div
      style={{ background: theme.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif", maxWidth: 480, margin: "0 auto", position: "relative" }}
      className="w-full flex flex-col gt-app-shell"
    >
      {/* `height: 100dvh` (avec repli 100vh) ancre l'app à la vraie hauteur d'écran, voir
          l'historique de cette conversation pour le détail du bug que ça corrige. */}
      <style>{`.gt-app-shell { height: 100vh; height: 100dvh; }`}</style>
      <div className="flex-1 overflow-y-auto pb-28" style={{ WebkitOverflowScrolling: "touch" }}>
        {/* La séance en cours reste TOUJOURS montée tant qu'elle existe (jamais démontée en
            changeant d'onglet) : seule sa visibilité CSS change. Ses timers (chrono de
            séance, minuteur de repos) continuent donc de tourner normalement même quand
            on navigue vers Accueil / Progression / Profil. */}
        {activeWorkout && (
          <div style={{ display: showingActiveWorkout ? "block" : "none" }}>
            <WorkoutSession
              workout={activeWorkout} setWorkout={setActiveWorkout}
              sessions={sessions}
              onFinish={(session) => { setSessions((s) => [session, ...s]); endWorkout(); setTab("dashboard"); }}
              onCancel={endWorkout}
              restDefault={settings.restDefault}
              onStatusChange={setSessionStatus}
            />
          </div>
        )}

        {!showingActiveWorkout && (
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, x: prefersReduced ? 0 : 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              {tab !== "profile" && <TopBar theme={theme} tab={tab} isDark={isDark} setIsDark={setIsDark} />}
              {tab === "dashboard" && (
                <Dashboard
                  theme={theme} programs={programs} sessions={sessions} weightEntries={weightEntries}
                  settings={settings} setSettings={setSettings} onStart={startWorkout}
                />
              )}
              {tab === "workout" && !activeWorkout && (
                <WorkoutStartScreen theme={theme} onGoToDashboard={() => setTab("dashboard")} />
              )}
              {tab === "profile" && (
                <ProfileHub
                  theme={theme} isDark={isDark} setIsDark={setIsDark}
                  programs={programs} setPrograms={setPrograms}
                  sessions={sessions} setSessions={setSessions}
                  weightEntries={weightEntries} setWeightEntries={setWeightEntries}
                  settings={settings} setSettings={setSettings}
                  userProfile={userProfile} setUserProfile={setUserProfile} onResetData={resetData}
                  onStartProgram={startWorkout}
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
          </AnimatePresence>
        )}
      </div>

      {/* Bannière persistante : visible sur n'importe quel autre onglet tant qu'une séance
          tourne, avec le nom de l'exercice en cours et le chrono en direct. */}
      <AnimatePresence>
        {activeWorkout && !showingActiveWorkout && (
          <ActiveSessionBanner theme={theme} status={sessionStatus} onTap={() => setTab("workout")} />
        )}
      </AnimatePresence>

      <BottomNav theme={theme} tab={tab} setTab={setTab} activeWorkout={!!activeWorkout} />
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
    blocks: (program.blocks || []).map((block) => ({
      id: uid(),
      restSec: block.restSec || 90,
      exerciseLogs: block.exercises.map((ex) => ({
        exerciseId: ex.id,
        name: ex.name,
        targetReps: ex.reps,
        notes: ex.notes,
        sets: Array.from({ length: ex.series || 3 }, () => ({ weight: "", reps: "", done: false })),
      })),
    })),
  };
}

function programFromSession(session) {
  if (session.blocks && session.blocks.length) {
    return {
      id: session.programId, name: session.programName,
      blocks: session.blocks.map((b) => ({
        id: uid(), restSec: b.restSec || 90,
        exercises: b.exerciseIds.map((exId) => {
          const el = session.exerciseLogs.find((e) => e.exerciseId === exId) || {};
          return { id: exId, name: el.name || "Exercice", series: (el.sets || []).length || 3, reps: el.targetReps || 10, notes: el.notes || "" };
        }),
      })),
    };
  }
  return {
    id: session.programId, name: session.programName,
    blocks: session.exerciseLogs.map((el) => ({
      id: uid(), restSec: 90,
      exercises: [{ id: el.exerciseId, name: el.name, series: el.sets.length || 3, reps: el.targetReps || 10, notes: "" }],
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
  dashboard: "Aujourd'hui", workout: "Séance en cours",
};

const TAB_ICONS = {
  dashboard: Home, workout: Flame,
};

function TopBar({ theme, tab, isDark, setIsDark }) {
  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-2">
      <div className="flex items-center gap-2.5">
        <IconBadge theme={theme} icon={TAB_ICONS[tab]} size={34} iconSize={16} filled />
        <h1 style={{ color: theme.text }} className="text-[26px] font-extrabold tracking-tight">{TAB_TITLES[tab]}</h1>
      </div>
      <button onClick={() => setIsDark((d) => !d)} className="active:scale-90 transition-transform rounded-full flex items-center justify-center" style={{ width: 38, height: 38, background: theme.card2, border: `1px solid ${theme.border}` }}>
        {isDark ? <Sun size={17} color={theme.text} /> : <Moon size={17} color={theme.text} />}
      </button>
    </div>
  );
}

// Seulement 3 onglets, comme demandé. "Séance" reste en orange tant qu'une séance est
// active, même si un autre onglet est sélectionné (petit point qui pulse en plus du badge).
function BottomNav({ theme, tab, setTab, activeWorkout }) {
  const items = [
    { id: "dashboard", icon: Home, label: "Accueil" },
    { id: "workout", icon: Flame, label: "Séance" },
    { id: "profile", icon: User, label: "Profil" },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none z-50">
      <div className="w-full pointer-events-auto" style={{ maxWidth: 480 }}>
        <div
          className="mx-3 mb-3 rounded-3xl flex items-stretch justify-between px-1 py-1.5 backdrop-blur-xl"
          style={{ background: theme.tabBg, border: `1px solid ${theme.border}`, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.3)" }}
        >
          {items.map((it) => {
            const selected = tab === it.id;
            const isWorkoutBtn = it.id === "workout";
            const highlighted = selected || (isWorkoutBtn && activeWorkout);
            return (
              <button key={it.id} onClick={() => setTab(it.id)} className="relative flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl transition-all active:scale-90">
                {highlighted ? (
                  <IconBadge theme={theme} icon={it.icon} size={26} iconSize={14} filled />
                ) : (
                  <it.icon size={19} color={theme.textMuted} strokeWidth={2} />
                )}
                {isWorkoutBtn && activeWorkout && !selected && (
                  <motion.span
                    animate={{ opacity: [1, 0.35, 1] }} transition={{ repeat: Infinity, duration: 1.3 }}
                    className="absolute rounded-full" style={{ top: 2, right: "26%", width: 7, height: 7, background: theme.accent, boxShadow: `0 0 0 2px ${theme.tabBg}` }}
                  />
                )}
                <span style={{ color: highlighted ? theme.accent : theme.textMuted, fontSize: 9.5 }} className="font-semibold">{it.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Bannière persistante affichée sur les AUTRES onglets tant qu'une séance est active :
// nom de l'exercice en cours + chrono en direct, tap pour revenir directement dessus.
function ActiveSessionBanner({ theme, status, onTap }) {
  return (
    <motion.button
      onClick={onTap}
      initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
      transition={{ type: "spring", damping: 26, stiffness: 300 }}
      className="fixed left-0 right-0 z-40 flex justify-center px-3 pointer-events-auto"
      style={{ maxWidth: 480, margin: "0 auto", bottom: 92 }}
    >
      <div
        className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 active:scale-[0.98] transition-transform"
        style={{ maxWidth: 448, background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`, boxShadow: `0 10px 30px -10px ${theme.accent}aa` }}
      >
        <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.3 }} className="text-[17px] shrink-0">🔥</motion.span>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-white font-bold text-[13px] truncate">
            Séance en cours{status?.exerciseName ? ` · ${status.exerciseName}` : ""}
          </p>
          <p className="text-white/85 text-[11px] tabular-nums">
            {fmtClock(status?.elapsedSec || 0)}
            {status?.phase === "rest" && status?.restRemaining != null ? ` · repos ${fmtClock(status.restRemaining)}` : ""}
          </p>
        </div>
        <ChevronRight size={17} color="#fff" className="shrink-0" />
      </div>
    </motion.button>
  );
}

// Écran affiché sur l'onglet "Séance" quand aucune séance n'est active : choisir un
// programme pour démarrer immédiatement (la gestion des programmes vit dans Profil).
// Onglet "Séance" quand AUCUNE séance n'est active : ne montre jamais de liste de
// programmes ici (ça, c'est le rôle d'Accueil). Juste un état vide qui renvoie choisir
// une séance sur Accueil.
function WorkoutStartScreen({ theme, onGoToDashboard }) {
  return (
    <div className="px-4 pt-10">
      <Card theme={theme} className="p-8 flex flex-col items-center text-center">
        <div className="rounded-full flex items-center justify-center mb-4" style={{ width: 72, height: 72, background: theme.card2 }}>
          <Flame size={30} color={theme.textFaint} />
        </div>
        <p style={{ color: theme.text }} className="font-bold text-[16px] mb-1.5">Aucune séance en cours</p>
        <p style={{ color: theme.textMuted }} className="text-[13px] mb-6 max-w-[260px]">Choisis une séance sur l'écran d'accueil pour commencer à t'entraîner.</p>
        <BigButton theme={theme} gradient onClick={onGoToDashboard}>
          <Home size={17} /> Choisir une séance
        </BigButton>
      </Card>
    </div>
  );
}

// Petit en-tête réutilisé par les sous-pages de Profil (celles qui n'ont pas déjà leur
// propre en-tête intégré comme ProgramEditor ou SessionDetail).
function SubPageHeader({ theme, title, onBack }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-4 pb-2 -ml-1">
      <IconButton theme={theme} onClick={onBack}><ChevronLeft size={18} color={theme.text} /></IconButton>
      <h1 style={{ color: theme.text }} className="text-[20px] font-extrabold truncate">{title}</h1>
    </div>
  );
}

const PROFILE_MENU_ITEMS = [
  { id: "myprofile", view: "myprofile", icon: User, label: "Mon profil", desc: "Aperçu rapide de ton activité" },
  { id: "progress", view: "progress", icon: TrendingUp, label: "Progression", desc: "Graphiques, charges, évolution des performances" },
  { id: "history", view: "history", icon: HistoryIcon, label: "Historique séances", desc: "Revoir toutes tes séances passées" },
  { id: "weight", view: "weight", icon: Scale, label: "Évolution du poids", desc: "Suivi, moyenne, tendance" },
  { id: "records", view: "records", icon: Trophy, label: "Records", desc: "Tes meilleures charges par exercice" },
  { id: "goals", view: "weight", icon: Target, label: "Objectifs", desc: "Objectif de poids et estimation" },
  { id: "stats", view: "stats", icon: BarChart3, label: "Statistiques détaillées", desc: "Totaux, fréquence, heatmap, sauvegarde" },
  { id: "programs", view: "programs", icon: Dumbbell, label: "Mes programmes", desc: "Créer, modifier, organiser tes séances" },
  { id: "settings", view: "settings", icon: Settings, label: "Paramètres", desc: "Thème, repos par défaut" },
];

const GOALS = [
  { id: "hypertrophy", label: "Prise de muscle" },
  { id: "weightloss", label: "Perte de poids" },
  { id: "performance", label: "Performance" },
  { id: "hyrox", label: "Hyrox" },
  { id: "strength", label: "Force" },
];
const LEVELS = [
  { id: "beginner", label: "Débutant" },
  { id: "intermediate", label: "Intermédiaire" },
  { id: "advanced", label: "Avancé" },
];

function LabeledInput({ theme, label, value, onChange, placeholder = "", secure = false, keyboard }) {
  return (
    <div>
      <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold mb-1.5 px-1">{label}</p>
      <input
        type={secure ? "password" : "text"} inputMode={keyboard === "email" ? "email" : "text"}
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl px-3.5 py-3 text-[14.5px] outline-none"
        style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }}
      />
    </div>
  );
}

// En-tête affiché tout en haut du menu Profil : avatar + nom si renseigné, sinon un
// avatar neutre — tape dessus pour aller renseigner tes infos dans "Mon profil".
function ProfileAccountHeader({ theme, userProfile, onOpenProfile }) {
  const initials = (userProfile?.name || "").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <button onClick={onOpenProfile} className="w-full text-left active:scale-[0.98] transition-transform mb-1">
      <Card theme={theme} className="p-4 flex items-center gap-3">
        <div className="rounded-full flex items-center justify-center shrink-0 text-white font-extrabold" style={{ width: 48, height: 48, background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`, fontSize: 16 }}>
          {initials || <User size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ color: theme.text }} className="font-bold text-[15px] truncate">{userProfile?.name || "Mon profil"}</p>
          <p style={{ color: theme.textMuted }} className="text-[12px] truncate">{userProfile?.goal ? (GOALS.find((g) => g.id === userProfile.goal)?.label || "") : "Renseigne tes infos personnelles"}</p>
        </div>
        <ChevronRight size={16} color={theme.textFaint} className="shrink-0" />
      </Card>
    </button>
  );
}

function ProfileMenu({ theme, userProfile, onSelect, onOpenProfile }) {
  return (
    <div className="px-4 pt-2 space-y-2.5">
      <ProfileAccountHeader theme={theme} userProfile={userProfile} onOpenProfile={onOpenProfile} />
      {PROFILE_MENU_ITEMS.map((it) => (
        <button key={it.id} onClick={() => onSelect(it.view)} className="w-full text-left active:scale-[0.98] transition-transform">
          <Card theme={theme} className="p-4 flex items-center gap-3">
            <IconBadge theme={theme} icon={it.icon} size={40} iconSize={18} filled />
            <div className="flex-1 min-w-0">
              <p style={{ color: theme.text }} className="font-bold text-[15px]">{it.label}</p>
              <p style={{ color: theme.textMuted }} className="text-[12px] mt-0.5">{it.desc}</p>
            </div>
            <ChevronRight size={16} color={theme.textFaint} className="shrink-0" />
          </Card>
        </button>
      ))}
    </div>
  );
}

// --- "Mon profil" : identité modifiable + aperçu rapide de l'activité ------------------
// Profil local à cet appareil (pas de compte, pas de mot de passe, pas de connexion —
// simplement tes infos personnelles pour personnaliser l'app).
function MyProfileView({ theme, userProfile, setUserProfile, sessions, weightEntries, programs }) {
  const update = (patch) => setUserProfile((p) => ({ ...p, ...patch }));
  const totalTonnage = sessions.reduce((a, s) => a + (s.tonnage || 0), 0);
  const lastWeight = weightEntries.length ? [...weightEntries].sort((a, b) => b.date.localeCompare(a.date))[0] : null;
  const last30 = sessions.filter((s) => Date.now() - s.startedAt < 30 * 86400000).length;
  const initials = (userProfile.name || "").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <div className="px-4 pt-2 space-y-4">
      <Card theme={theme} className="p-5 flex items-center gap-4">
        <div className="rounded-full flex items-center justify-center shrink-0 text-white font-extrabold" style={{ width: 60, height: 60, background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`, fontSize: 20 }}>
          {initials || <User size={22} />}
        </div>
        <div className="min-w-0">
          <p style={{ color: theme.text }} className="text-[18px] font-extrabold truncate">{userProfile.name || "Mon profil"}</p>
          <p style={{ color: theme.textMuted }} className="text-[12.5px]">Profil enregistré sur cet appareil</p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2.5">
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Séances (30j)</p><p style={{ color: theme.text }} className="text-[19px] font-extrabold">{last30}</p></Card>
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Tonnage total</p><p style={{ color: theme.text }} className="text-[19px] font-extrabold">{Math.round(totalTonnage / 1000)}t</p></Card>
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Poids actuel</p><p style={{ color: theme.text }} className="text-[19px] font-extrabold">{lastWeight ? `${lastWeight.weight}kg` : "—"}</p></Card>
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Programmes</p><p style={{ color: theme.text }} className="text-[19px] font-extrabold">{programs.length}</p></Card>
      </div>

      <Card theme={theme} className="p-4 space-y-3">
        <p style={{ color: theme.text }} className="font-bold text-[14px]">Informations personnelles</p>
        <LabeledInput theme={theme} label="Nom / pseudo" value={userProfile.name} onChange={(v) => update({ name: v })} placeholder="Ex : Alex" />
        <div className="grid grid-cols-2 gap-2.5">
          <LabeledInput theme={theme} label="Âge" value={userProfile.age ?? ""} onChange={(v) => update({ age: v ? Number(v) : null })} placeholder="optionnel" />
          <LabeledInput theme={theme} label="Taille (cm)" value={userProfile.height ?? ""} onChange={(v) => update({ height: v ? Number(v) : null })} placeholder="optionnel" />
        </div>
      </Card>

      <Card theme={theme} className="p-4">
        <p style={{ color: theme.text }} className="font-bold text-[14px] mb-2.5">Objectif sportif</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {GOALS.map((g) => <Pill key={g.id} theme={theme} active={userProfile.goal === g.id} onClick={() => update({ goal: g.id })}>{g.label}</Pill>)}
        </div>
        <p style={{ color: theme.text }} className="font-bold text-[14px] mb-2.5">Niveau d'entraînement</p>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => <Pill key={l.id} theme={theme} active={userProfile.level === l.id} onClick={() => update({ level: l.id })}>{l.label}</Pill>)}
        </div>
      </Card>
    </div>
  );
}

// Réglages : ce qui n'avait pas encore de vrai réglage dans l'app (le repos par défaut
// existait déjà en state mais n'était modifiable nulle part) + rappel du thème.
function SettingsPage({ theme, isDark, setIsDark, settings, setSettings, onResetData }) {
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div className="px-4 pt-2 space-y-3">
      <Card theme={theme} className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <IconBadge theme={theme} icon={isDark ? Moon : Sun} size={36} iconSize={16} filled />
          <div>
            <p style={{ color: theme.text }} className="font-semibold text-[14.5px]">Thème</p>
            <p style={{ color: theme.textMuted }} className="text-[12px]">{isDark ? "Sombre" : "Clair"}</p>
          </div>
        </div>
        <button onClick={() => setIsDark((d) => !d)} className="px-3.5 py-2 rounded-xl font-bold text-[12.5px] active:scale-95 transition-transform" style={{ background: theme.card2, color: theme.accent, border: `1px solid ${theme.border}` }}>
          Changer
        </button>
      </Card>
      <Card theme={theme} className="p-4">
        <div className="flex items-center gap-2.5 mb-3.5">
          <IconBadge theme={theme} icon={Timer} size={36} iconSize={16} filled />
          <div>
            <p style={{ color: theme.text }} className="font-semibold text-[14.5px]">Repos par défaut</p>
            <p style={{ color: theme.textMuted }} className="text-[12px]">Utilisé quand un exercice n'a pas de repos défini</p>
          </div>
        </div>
        <MiniStepper theme={theme} label="Secondes" value={settings.restDefault} step={15} onChange={(v) => setSettings((s) => ({ ...s, restDefault: v }))} suffix="s" />
      </Card>
      <Card theme={theme} className="p-4">
        <p style={{ color: theme.text }} className="font-semibold text-[14.5px] mb-1">Zone de danger</p>
        <p style={{ color: theme.textMuted }} className="text-[12px] mb-3">Efface définitivement toutes les données sur cet appareil (programmes, historique, poids, profil).</p>
        <button onClick={() => setConfirmReset(true)} className="w-full rounded-xl py-3 font-bold text-[13px] flex items-center justify-center gap-2" style={{ background: `${theme.bad}18`, color: theme.bad }}>
          <Trash2 size={14} /> Réinitialiser mes données
        </button>
      </Card>
      <AnimatePresence>
        {confirmReset && (
          <ConfirmSheet theme={theme} danger title="Réinitialiser les données ?" subtitle="Toutes tes données sur cet appareil seront définitivement effacées. Cette action est irréversible."
            confirmLabel="Réinitialiser" onConfirm={onResetData} onCancel={() => setConfirmReset(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Centre de gestion "Profil" : regroupe tout ce qui n'est pas la navigation quotidienne
// (Accueil / Séance / Progression). Reprend telles quelles les pages déjà existantes
// (ProgramsList, ProgramEditor, HistoryList, SessionDetail, WeightPage, StatsPage) —
// seule leur navigation change : elle est maintenant locale à Profil au lieu de vivre
// au niveau App.
function ProfileHub({
  theme, isDark, setIsDark, programs, setPrograms, sessions, setSessions,
  weightEntries, setWeightEntries, settings, setSettings, onStartProgram, onExport, onImport,
  userProfile, setUserProfile, onResetData,
}) {
  const [view, setView] = useState(null); // null = menu racine
  const [programId, setProgramId] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  if (!view) {
    return (
      <div>
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2.5">
            <IconBadge theme={theme} icon={User} size={34} iconSize={16} filled />
            <h1 style={{ color: theme.text }} className="text-[26px] font-extrabold tracking-tight">Profil</h1>
          </div>
          <button onClick={() => setIsDark((d) => !d)} className="active:scale-90 transition-transform rounded-full flex items-center justify-center" style={{ width: 38, height: 38, background: theme.card2, border: `1px solid ${theme.border}` }}>
            {isDark ? <Sun size={17} color={theme.text} /> : <Moon size={17} color={theme.text} />}
          </button>
        </div>
        <ProfileMenu theme={theme} userProfile={userProfile} onSelect={setView} onOpenProfile={() => setView("myprofile")} />
      </div>
    );
  }

  if (view === "myprofile") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Mon profil" onBack={() => setView(null)} />
        <MyProfileView
          theme={theme} userProfile={userProfile} setUserProfile={setUserProfile}
          sessions={sessions} weightEntries={weightEntries} programs={programs}
        />
      </div>
    );
  }

  if (view === "programs") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Mes programmes" onBack={() => setView(null)} />
        <ProgramsList
          theme={theme} programs={programs} setPrograms={setPrograms}
          onOpen={(id) => { setProgramId(id); setView("programEditor"); }}
          onStart={onStartProgram}
        />
      </div>
    );
  }

  if (view === "programEditor") {
    return (
      <ProgramEditor
        theme={theme} program={programs.find((p) => p.id === programId)}
        setPrograms={setPrograms} onBack={() => setView("programs")} onStart={onStartProgram}
      />
    );
  }

  if (view === "history") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Historique séances" onBack={() => setView(null)} />
        <HistoryList theme={theme} sessions={sessions} onOpen={(id) => { setSessionId(id); setView("sessionDetail"); }} />
      </div>
    );
  }

  if (view === "sessionDetail") {
    return (
      <SessionDetail
        theme={theme} session={sessions.find((s) => s.id === sessionId)}
        onBack={() => setView("history")}
        onDelete={(id) => { setSessions((s) => s.filter((x) => x.id !== id)); setView("history"); }}
        onDuplicate={(session) => onStartProgram(programFromSession(session))}
      />
    );
  }

  if (view === "weight") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Évolution du poids" onBack={() => setView(null)} />
        <WeightPage theme={theme} entries={weightEntries} setEntries={setWeightEntries} settings={settings} setSettings={setSettings} />
      </div>
    );
  }

  if (view === "stats") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Statistiques détaillées" onBack={() => setView(null)} />
        <StatsPage theme={theme} sessions={sessions} programs={programs} onExport={onExport} onImport={onImport} />
      </div>
    );
  }

  if (view === "progress") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Progression" onBack={() => setView(null)} />
        <ProgressPage theme={theme} sessions={sessions} programs={programs} />
      </div>
    );
  }

  if (view === "records") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Records" onBack={() => setView(null)} />
        <RecordsPage theme={theme} sessions={sessions} />
      </div>
    );
  }

  if (view === "settings") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Paramètres" onBack={() => setView(null)} />
        <SettingsPage theme={theme} isDark={isDark} setIsDark={setIsDark} settings={settings} setSettings={setSettings} onResetData={onResetData} />
      </div>
    );
  }

  return null;
}

// --- "Records" : tous les records personnels, triés par charge --------------------------
function RecordsPage({ theme, sessions }) {
  const prs = useMemo(() => computePRs(sessions), [sessions]);
  const list = useMemo(() => Object.entries(prs).sort((a, b) => b[1].maxWeight - a[1].maxWeight), [prs]);
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

// --- "Mon profil" : identité + aperçu rapide de l'activité (voir MyProfileView) --------

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

// Carte de sélection d'une séance disponible (Accueil). Ceci ne fait que choisir QUEL
// programme sera démarré au prochain tap sur "Commencer la séance" — aucune séance n'est
// active tant que ce bouton n'a pas été pressé.
function ProgramSelectCard({ theme, program, selected, onSelect }) {
  const count = flattenExercises(program.blocks).length;
  return (
    <button onClick={onSelect} className="w-full text-left active:scale-[0.98] transition-transform">
      <Card
        theme={theme} className="p-4 flex items-center gap-3"
        style={{ border: `1.5px solid ${selected ? theme.accent : theme.border}`, background: selected ? `${theme.accent}14` : theme.card }}
      >
        <div style={{ width: 10, height: 10, borderRadius: 999, background: program.color || theme.accent }} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <p style={{ color: theme.text }} className="font-bold text-[15px] truncate">{program.name}</p>
          <p style={{ color: theme.textMuted }} className="text-[12px] mt-0.5">{count} exercice{count !== 1 ? "s" : ""}</p>
        </div>
        {selected ? (
          <IconBadge theme={theme} icon={Check} size={28} iconSize={14} filled />
        ) : (
          <div className="rounded-full shrink-0" style={{ width: 22, height: 22, border: `2px solid ${theme.border}` }} />
        )}
      </Card>
    </button>
  );
}

function Dashboard({ theme, programs, sessions, weightEntries, settings, setSettings, onStart }) {
  const prs = useMemo(() => computePRs(sessions), [sessions]);
  const lastWeight = weightEntries.length ? [...weightEntries].sort((a, b) => b.date.localeCompare(a.date))[0] : null;
  const suggestedIndex = programs.length ? (settings.lastProgramIndex + 1) % programs.length : -1;
  const suggested = programs[suggestedIndex] || programs[0] || null;

  // Séances disponibles (les programmes) vs. sélection en cours de constitution : ceci
  // n'est PAS la séance active, juste "quel programme l'utilisateur s'apprête à démarrer".
  // Tant qu'on n'a pas tapé "Commencer la séance", rien n'est démarré nulle part.
  const [selectedId, setSelectedId] = useState(null);
  const selectedProgram = programs.find((p) => p.id === selectedId) || suggested;

  const last7 = sessions.filter((s) => Date.now() - s.startedAt < 7 * 86400000);
  const tonnage7 = last7.reduce((a, s) => a + (s.tonnage || 0), 0);
  const avgTonnage = sessions.length ? sessions.slice(0, 6).reduce((a, s) => a + (s.tonnage || 0), 0) / Math.max(1, Math.min(6, sessions.length)) : 0;
  const ringProgress = avgTonnage ? Math.min(1, tonnage7 / (avgTonnage * 3)) : (last7.length ? 0.3 : 0);

  const recentSessions = sessions.slice(0, 3);
  const topPRs = Object.entries(prs).sort((a, b) => b[1].maxWeight - a[1].maxWeight).slice(0, 3);

  const handleStart = () => {
    if (!selectedProgram) return;
    const idx = programs.findIndex((p) => p.id === selectedProgram.id);
    if (idx !== -1) setSettings((s) => ({ ...s, lastProgramIndex: idx }));
    onStart(selectedProgram);
  };

  return (
    <div className="px-4 pt-2 space-y-5">
      <Card theme={theme} className="p-5 relative overflow-hidden">
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 999, background: `radial-gradient(circle, ${theme.accent}22, transparent 70%)` }} />
        <div className="flex items-center justify-between relative">
          <div>
            <p style={{ color: theme.textMuted }} className="text-[12px] font-medium">Activité de la semaine</p>
            <p style={{ color: theme.text }} className="text-[22px] font-extrabold mt-0.5">{last7.length} séance{last7.length !== 1 ? "s" : ""}</p>
            <p style={{ color: theme.textMuted }} className="text-[12px] mt-0.5">{Math.round(tonnage7).toLocaleString("fr-FR")} kg soulevés</p>
          </div>
          <EffortRing theme={theme} progress={ringProgress} value={`${Math.round(tonnage7 / 1000) || 0}t`} label="7 jours" />
        </div>
      </Card>

      <div>
        <SectionTitle theme={theme}>Mes séances</SectionTitle>
        {programs.length === 0 ? (
          <Card theme={theme}><EmptyState theme={theme} icon={Dumbbell} title="Aucun programme" subtitle="Crée un programme dans Profil pour pouvoir démarrer une séance." /></Card>
        ) : (
          <div className="space-y-2.5">
            {programs.map((p) => (
              <ProgramSelectCard key={p.id} theme={theme} program={p} selected={selectedProgram?.id === p.id} onSelect={() => setSelectedId(p.id)} />
            ))}
          </div>
        )}
      </div>

      {programs.length > 0 && (
        <BigButton theme={theme} gradient disabled={!selectedProgram} onClick={handleStart}>
          <Play size={18} fill="#fff" /> Commencer la séance
        </BigButton>
      )}

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
          <Card theme={theme}><EmptyState theme={theme} icon={Trophy} title="Pas encore de records" /></Card>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {topPRs.map(([name, pr]) => (
              <Card theme={theme} className="p-3" key={name}>
                <Trophy size={14} color={theme.accent2} className="mb-1.5" />
                <p style={{ color: theme.text }} className="text-[13px] font-bold leading-tight">{pr.maxWeight}kg</p>
                <p style={{ color: theme.textMuted }} className="text-[10.5px] leading-tight mt-0.5 line-clamp-2">{name}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card theme={theme} className="p-4 flex items-start gap-3" style={{ background: `linear-gradient(135deg, ${theme.accent}14, ${theme.accent2}0a)` }}>
        <Sparkles size={16} color={theme.accent} className="mt-0.5 shrink-0" />
        <p style={{ color: theme.text }} className="text-[13px] italic leading-snug">{quoteOfTheDay()}</p>
      </Card>
    </div>
  );
}

/* ============================== PROGRAMS ============================== */

function ProgramsList({ theme, programs, setPrograms, onOpen, onStart }) {
  const addProgram = () => {
    const p = { id: uid(), name: "Nouveau programme", color: theme.accent, blocks: [] };
    setPrograms((ps) => [...ps, p]);
    onOpen(p.id);
  };
  return (
    <div className="px-4 pt-2 space-y-3">
      {programs.length === 0 && <Card theme={theme}><EmptyState theme={theme} icon={Dumbbell} title="Aucun programme" subtitle="Crée ton premier programme d'entraînement." /></Card>}
      {programs.map((p) => {
        const count = flattenExercises(p.blocks).length;
        const groupCount = (p.blocks || []).filter((b) => b.exercises.length > 1).length;
        return (
          <Card key={p.id} theme={theme} className="p-4">
            <div className="flex items-center justify-between">
              <button className="flex-1 text-left" onClick={() => onOpen(p.id)}>
                <div className="flex items-center gap-2.5">
                  <div style={{ width: 10, height: 10, borderRadius: 999, background: p.color || theme.accent }} />
                  <p style={{ color: theme.text }} className="font-bold text-[16px]">{p.name}</p>
                </div>
                <p style={{ color: theme.textMuted }} className="text-[12.5px] mt-1 ml-[18px]">
                  {count} exercice{count !== 1 ? "s" : ""}{groupCount > 0 ? ` · ${groupCount} enchaînement${groupCount !== 1 ? "s" : ""}` : ""}
                </p>
              </button>
              <div className="flex items-center gap-2">
                <IconButton theme={theme} onClick={() => onStart(p)}><Play size={15} color={theme.accent} fill={theme.accent} /></IconButton>
                <IconButton theme={theme} onClick={() => onOpen(p.id)}><ChevronRight size={16} color={theme.textMuted} /></IconButton>
              </div>
            </div>
          </Card>
        );
      })}
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
  const [pairTarget, setPairTarget] = useState(null); // blockId currently pairing/extending

  if (!program) return null;

  const updateProgram = (fn) => setPrograms((ps) => ps.map((p) => (p.id === program.id ? fn({ ...p }) : p)));
  const setBlocks = (blocks) => updateProgram((p) => ({ ...p, blocks }));

  const updateExerciseInBlock = (blockId, exId, patch) =>
    setBlocks(program.blocks.map((b) => (b.id === blockId ? { ...b, exercises: b.exercises.map((e) => (e.id === exId ? { ...e, ...patch } : e)) } : b)));

  const updateBlockRest = (blockId, restSec) => setBlocks(program.blocks.map((b) => (b.id === blockId ? { ...b, restSec } : b)));

  const removeBlock = (blockId) => setBlocks(program.blocks.filter((b) => b.id !== blockId));

  const removeExerciseFromBlock = (blockId, exId) => {
    setBlocks(program.blocks.flatMap((b) => {
      if (b.id !== blockId) return [b];
      const remaining = b.exercises.filter((e) => e.id !== exId);
      if (remaining.length === 0) return [];
      return [{ ...b, exercises: remaining }];
    }));
  };

  const dissociateBlock = (blockId) => {
    setBlocks(program.blocks.flatMap((b) => {
      if (b.id !== blockId) return [b];
      return b.exercises.map((ex) => ({ id: uid(), restSec: b.restSec, exercises: [ex] }));
    }));
  };

  const addNewExercise = (ex) => setBlocks([...program.blocks, { id: uid(), restSec: ex.rest || 90, exercises: [{ id: ex.id, name: ex.name, series: ex.series, reps: ex.reps, notes: ex.notes }] }]);

  const attachExercise = (blockId, exDef) => {
    setBlocks(program.blocks
      .filter((b) => b.id !== exDef.__sourceBlockId)
      .map((b) => (b.id === blockId ? { ...b, exercises: [...b.exercises, { id: exDef.id, name: exDef.name, series: exDef.series, reps: exDef.reps, notes: exDef.notes || "" }] } : b)));
    setPairTarget(null);
  };

  const deleteProgram = () => {
    setPrograms((ps) => ps.filter((p) => p.id !== program.id));
    onBack();
  };

  const letters = computeGroupLetters(program.blocks);
  const pairTargetBlock = program.blocks.find((b) => b.id === pairTarget);
  const candidateExercises = program.blocks
    .filter((b) => b.id !== pairTarget && b.exercises.length === 1)
    .map((b) => ({ ...b.exercises[0], __sourceBlockId: b.id }));

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
        {program.blocks.length === 0 ? (
          <Card theme={theme}><EmptyState theme={theme} icon={Dumbbell} title="Aucun exercice" subtitle="Ajoute des exercices à ce programme." /></Card>
        ) : (
          <Reorder.Group axis="y" values={program.blocks} onReorder={setBlocks} className="space-y-2.5">
            {program.blocks.map((block) => (
              <Reorder.Item key={block.id} value={block}>
                {block.exercises.length === 1 ? (
                  <ExerciseRow
                    theme={theme} exercise={block.exercises[0]} restSec={block.restSec}
                    onUpdate={(patch) => updateExerciseInBlock(block.id, block.exercises[0].id, patch)}
                    onUpdateRest={(r) => updateBlockRest(block.id, r)}
                    onRemove={() => removeBlock(block.id)}
                    onCreateSuperset={() => setPairTarget(block.id)}
                  />
                ) : (
                  <GroupBlockCard
                    theme={theme} block={block} letter={letters[block.id]}
                    onUpdateExercise={(exId, patch) => updateExerciseInBlock(block.id, exId, patch)}
                    onUpdateRest={(r) => updateBlockRest(block.id, r)}
                    onRemoveExercise={(exId) => removeExerciseFromBlock(block.id, exId)}
                    onDissociate={() => dissociateBlock(block.id)}
                    onDeleteGroup={() => removeBlock(block.id)}
                    onAddToGroup={() => setPairTarget(block.id)}
                  />
                )}
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
          <AddExerciseSheet theme={theme} onClose={() => setShowAdd(false)} onAdd={(ex) => { addNewExercise(ex); setShowAdd(false); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pairTarget && (
          <PairExerciseSheet
            theme={theme}
            title={pairTargetBlock && pairTargetBlock.exercises.length > 1 ? "Ajouter au groupe" : "Créer un biset"}
            candidates={candidateExercises}
            onClose={() => setPairTarget(null)}
            onPickExisting={(exDef) => attachExercise(pairTarget, exDef)}
            onCreateNew={(exDef) => attachExercise(pairTarget, exDef)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ExerciseRow({ theme, exercise, restSec, onUpdate, onUpdateRest, onRemove, onCreateSuperset }) {
  const [open, setOpen] = useState(false);
  return (
    <Card theme={theme} className="overflow-hidden">
      <div className="flex items-center gap-2 p-3.5">
        <GripVertical size={16} color={theme.textFaint} className="cursor-grab shrink-0" />
        <button className="flex-1 text-left" onClick={() => setOpen((o) => !o)}>
          <p style={{ color: theme.text }} className="font-semibold text-[14.5px]">{exercise.name}</p>
          <p style={{ color: theme.textMuted }} className="text-[12px] mt-0.5">{exercise.series} × {exercise.reps} reps · repos {restSec}s</p>
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
                <MiniStepper theme={theme} label="Repos" value={restSec} step={15} onChange={onUpdateRest} suffix="s" />
              </div>
              <textarea placeholder="Notes (technique, variante...)" value={exercise.notes} onChange={(e) => onUpdate({ notes: e.target.value })}
                className="w-full rounded-xl p-2.5 text-[13px] outline-none resize-none" rows={2}
                style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
              <div className="flex items-center justify-between pt-1">
                <button onClick={onRemove} className="text-[12.5px] font-semibold flex items-center gap-1.5" style={{ color: theme.bad }}>
                  <Trash2 size={12} /> Retirer cet exercice
                </button>
                <button onClick={onCreateSuperset} className="text-[12.5px] font-bold flex items-center gap-1.5" style={{ color: theme.accent }}>
                  <Link2 size={12} /> Créer un biset
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function GroupBlockCard({ theme, block, letter, onUpdateExercise, onUpdateRest, onRemoveExercise, onDissociate, onDeleteGroup, onAddToGroup }) {
  const [openId, setOpenId] = useState(null);
  const label = groupLabel(block.exercises.length);
  return (
    <Card theme={theme} className="overflow-hidden" style={{ border: `1.5px solid ${theme.accent}55` }}>
      <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold" style={{ background: theme.accent, color: "#fff" }}>{label}</span>
          <span style={{ color: theme.textMuted }} className="text-[11.5px]">{block.exercises.length} exercices liés</span>
        </div>
        <GripVertical size={16} color={theme.textFaint} className="cursor-grab shrink-0" />
      </div>
      <div className="px-3.5 space-y-2">
        {block.exercises.map((ex, i) => {
          const open = openId === ex.id;
          return (
            <div key={ex.id} className="rounded-2xl overflow-hidden" style={{ background: theme.card2, border: `1px solid ${theme.border}` }}>
              <button className="w-full flex items-center gap-2.5 p-3 text-left" onClick={() => setOpenId(open ? null : ex.id)}>
                <span className="text-[11px] font-extrabold shrink-0" style={{ color: theme.accent }}>{letter}{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p style={{ color: theme.text }} className="font-semibold text-[13.5px] truncate">{ex.name}</p>
                  <p style={{ color: theme.textMuted }} className="text-[11.5px]">{ex.series} × {ex.reps} reps</p>
                </div>
                <ChevronDown size={14} color={theme.textFaint} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>
              <AnimatePresence>
                {open && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 space-y-2.5" style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 10 }}>
                      <FieldRow theme={theme} label="Nom">
                        <input value={ex.name} onChange={(e) => onUpdateExercise(ex.id, { name: e.target.value })} className="bg-transparent outline-none text-right flex-1" style={{ color: theme.text }} />
                      </FieldRow>
                      <div className="grid grid-cols-2 gap-2">
                        <MiniStepper theme={theme} label="Séries" value={ex.series} onChange={(v) => onUpdateExercise(ex.id, { series: v })} />
                        <MiniStepper theme={theme} label="Reps" value={ex.reps} onChange={(v) => onUpdateExercise(ex.id, { reps: v })} />
                      </div>
                      <textarea placeholder="Notes" value={ex.notes} onChange={(e) => onUpdateExercise(ex.id, { notes: e.target.value })}
                        className="w-full rounded-xl p-2.5 text-[12.5px] outline-none resize-none" rows={2}
                        style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }} />
                      {block.exercises.length > 2 && (
                        <button onClick={() => onRemoveExercise(ex.id)} className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: theme.bad }}>
                          <Trash2 size={11} /> Retirer du groupe
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <div className="px-3.5 pt-3 pb-1">
        <FieldRow theme={theme} label="Repos après la série complète">
          <MiniStepper theme={theme} label="Repos" value={block.restSec} step={15} onChange={onUpdateRest} suffix="s" />
        </FieldRow>
      </div>
      <div className="flex items-center justify-between px-3.5 py-3 mt-1" style={{ borderTop: `1px solid ${theme.border}` }}>
        <button onClick={onAddToGroup} className="text-[12px] font-bold flex items-center gap-1.5" style={{ color: theme.accent }}>
          <Plus size={12} /> Ajouter un exercice
        </button>
        <div className="flex items-center gap-3">
          <button onClick={onDissociate} className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: theme.textMuted }}>
            <Unlink size={12} /> Dissocier
          </button>
          <button onClick={onDeleteGroup} className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: theme.bad }}>
            <Trash2 size={12} /> Supprimer
          </button>
        </div>
      </div>
    </Card>
  );
}

function PairExerciseSheet({ theme, title, candidates, onClose, onPickExisting, onCreateNew }) {
  const [mode, setMode] = useState(candidates.length ? "pick" : "new");
  const [name, setName] = useState("");
  const [series, setSeries] = useState(4);
  const [reps, setReps] = useState(10);

  return (
    <motion.div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 200 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl p-5 pb-8" style={{ maxWidth: 480, background: theme.card, borderTop: `1px solid ${theme.border}`, maxHeight: "85vh", overflowY: "auto" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: theme.border }} />
        <h3 style={{ color: theme.text }} className="text-[17px] font-bold mb-1 flex items-center gap-1.5"><Link2 size={16} color={theme.accent} /> {title}</h3>
        <p style={{ color: theme.textMuted }} className="text-[12.5px] mb-4">Choisis un exercice existant du programme ou crées-en un nouveau.</p>

        <div className="flex gap-2 mb-4">
          <Pill theme={theme} active={mode === "pick"} onClick={() => setMode("pick")}>Exercice existant</Pill>
          <Pill theme={theme} active={mode === "new"} onClick={() => setMode("new")}>Nouvel exercice</Pill>
        </div>

        {mode === "pick" ? (
          candidates.length === 0 ? (
            <p style={{ color: theme.textFaint }} className="text-[13px] text-center py-6">Aucun autre exercice disponible. Crée-en un nouveau.</p>
          ) : (
            <div className="space-y-2">
              {candidates.map((c) => (
                <button key={c.id} onClick={() => onPickExisting(c)} className="w-full flex items-center justify-between rounded-2xl p-3.5 text-left active:scale-[0.98] transition-transform"
                  style={{ background: theme.card2, border: `1px solid ${theme.border}` }}>
                  <div>
                    <p style={{ color: theme.text }} className="font-semibold text-[14px]">{c.name}</p>
                    <p style={{ color: theme.textMuted }} className="text-[11.5px]">{c.series} × {c.reps} reps</p>
                  </div>
                  <Link2 size={14} color={theme.accent} />
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-3">
            <input autoFocus placeholder="Nom de l'exercice" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl px-3 py-3 text-[14.5px] outline-none" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
            <div className="grid grid-cols-2 gap-2">
              <MiniStepper theme={theme} label="Séries" value={series} onChange={setSeries} />
              <MiniStepper theme={theme} label="Reps" value={reps} onChange={setReps} />
            </div>
            <BigButton theme={theme} gradient disabled={!name.trim()} onClick={() => onCreateNew({ id: uid(), name: name.trim(), series, reps, notes: "" })}>
              <Link2 size={16} /> Créer et associer
            </BigButton>
          </div>
        )}
      </motion.div>
    </motion.div>
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
    <motion.div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 200 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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

/* ============================== MODE ENTRAÎNEMENT (séance en temps réel) ============================== */
// Cette section gère le déroulé pas-à-pas d'une séance : un chrono global qui ne s'arrête
// jamais, un minuteur de récupération indépendant (pause/reprise), et une navigation
// automatique série par série / exercice par exercice.

// Formate un nombre de secondes en horloge "MM:SS" (ou "H:MM:SS" au-delà d'une heure).
// Utilisé à la fois pour le gros chrono de séance et pour le minuteur de récupération.
function fmtClock(sec) {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Construit la liste ORDONNÉE des étapes d'une séance à partir des blocks du programme.
// Une étape = une série précise d'un exercice précis, dans l'ordre exact d'exécution :
//   - Exercice seul            -> Série 1, Série 2, Série 3...
//   - Biset/Triset/Circuit     -> pour chaque tour : A1 puis A2 (puis A3...) AVANT le repos.
// `isLastOfRound` indique si cette étape est la dernière du tour : c'est UNIQUEMENT à ce
// moment-là que le minuteur de récupération doit se déclencher (jamais entre A1 et A2).
function buildSessionSteps(blocks) {
  const steps = [];
  blocks.forEach((block) => {
    const rounds = Math.max(1, ...block.exerciseLogs.map((el) => el.sets.length));
    for (let round = 0; round < rounds; round++) {
      block.exerciseLogs.forEach((el, exIndexInBlock) => {
        if (round < el.sets.length) {
          steps.push({
            blockId: block.id,
            exerciseId: el.exerciseId,
            round,
            exIndexInBlock,
            groupSize: block.exerciseLogs.length,
            isLastOfRound: exIndexInBlock === block.exerciseLogs.length - 1,
          });
        }
      });
    }
  });
  return steps;
}

// --- Timer #1 : chrono global de séance -------------------------------------------------
// Toujours actif dès le lancement de la séance. Calculé à partir d'un horodatage de départ
// fixe (startedAt), donc il continue de tourner pendant les pauses de récupération, les
// changements d'exercice, etc. Il ne s'arrête que lorsque le composant est démonté (fin
// de séance) ou lorsque la séance est enregistrée.
function useSessionClock(startedAt) {
  const [elapsedSec, setElapsedSec] = useState(() => Math.floor((Date.now() - startedAt) / 1000));
  useEffect(() => {
    const id = setInterval(() => setElapsedSec(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return elapsedSec;
}

// --- Timer #2 : minuteur de récupération ------------------------------------------------
// Totalement indépendant du chrono de séance. Peut être démarré, mis en pause, repris ou
// arrêté sans jamais affecter le chrono global (qui tourne dans un hook séparé ci-dessus).
//
// PERSISTANCE : au lieu de stocker uniquement "il reste 47 secondes" (une valeur qui se
// périme instantanément et ne veut plus rien dire après un refresh), on stocke l'horodatage
// AUQUEL le repos doit se terminer (`endsAt`). Le temps restant est recalculé à la volée à
// chaque rendu : `endsAt - Date.now()`. Résultat : après un rafraîchissement de page (même
// si l'utilisateur revient 10 secondes plus tard), le décompte reprend exactement à la bonne
// valeur, sans dérive — et on n'écrit dans le stockage qu'au démarrage/pause/reprise/arrêt,
// jamais à chaque tick de la seconde.
function useRestTimer(workoutId) {
  const [stored, setStored, loaded] = usePersistentState(`gt_rest_${workoutId}`, null);
  // { totalSec, paused, endsAt (ms, valable si !paused), pausedRemainingSec (valable si paused) } | null
  const [, forceTick] = useState(0);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!stored || stored.paused) return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000); // ne fait que forcer un re-rendu
    return () => clearInterval(id);
  }, [stored?.paused, stored?.endsAt]);

  const remainingSec = stored
    ? (stored.paused ? stored.pausedRemainingSec : Math.max(0, Math.round((stored.endsAt - Date.now()) / 1000)))
    : null;

  useEffect(() => {
    if (!stored || stored.paused) { firedRef.current = false; return; }
    if (remainingSec === 0 && !firedRef.current) { firedRef.current = true; vibrate([300, 100, 300]); }
  }, [remainingSec, stored?.paused]);

  return {
    rest: stored ? { totalSec: stored.totalSec, remainingSec, paused: stored.paused } : null,
    loaded,
    start: (sec) => setStored({ totalSec: sec, paused: false, endsAt: Date.now() + sec * 1000, pausedRemainingSec: null }),
    pause: () => setStored((r) => {
      if (!r || r.paused) return r;
      return { ...r, paused: true, pausedRemainingSec: Math.max(0, Math.round((r.endsAt - Date.now()) / 1000)) };
    }),
    resume: () => setStored((r) => {
      if (!r || !r.paused) return r;
      return { ...r, paused: false, endsAt: Date.now() + (r.pausedRemainingSec || 0) * 1000, pausedRemainingSec: null };
    }),
    stop: () => setStored(null),
  };
}

// --- En-tête fixe : chrono global toujours visible en haut de l'écran ------------------
function SessionHeader({ theme, programName, elapsedSec, stepNumber, totalSteps, onCancel, onEndClick }) {
  return (
    <div className="sticky top-0 z-30 px-4 pt-3 pb-3 backdrop-blur-xl" style={{ background: `${theme.bg}ee`, borderBottom: `1px solid ${theme.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={onCancel} className="text-[12.5px] font-semibold" style={{ color: theme.textMuted }}>Annuler</button>
        <div className="text-center">
          <p style={{ color: theme.text }} className="text-[13px] font-bold truncate max-w-[160px]">{programName}</p>
          <p style={{ color: theme.textFaint }} className="text-[10.5px] font-semibold">Série {stepNumber} / {totalSteps}</p>
        </div>
        <button onClick={onEndClick} className="text-[13px] font-bold" style={{ color: theme.accent }}>Terminer</button>
      </div>
      <p style={{ color: theme.text }} className="text-[46px] font-extrabold tabular-nums text-center leading-none tracking-tight">{fmtClock(elapsedSec)}</p>
      <p style={{ color: theme.textFaint }} className="text-[10px] text-center uppercase tracking-wide mt-1">Temps de séance</p>
    </div>
  );
}

// --- Minuteur de récupération circulaire ------------------------------------------------
// Le cercle se "vide" progressivement (stroke-dashoffset animé) pendant que le temps
// restant diminue. Pause / Reprise ne touchent qu'à ce minuteur, jamais au chrono global.
function RestTimerCircle({ theme, rest, onPauseResume, onSkip, size = 250 }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = rest.totalSec ? Math.max(0, rest.remainingSec) / rest.totalSec : 0;
  const finished = rest.remainingSec <= 0;

  return (
    <div className="flex flex-col items-center py-4">
      <div style={{ width: size, height: size, position: "relative" }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={theme.card2} strokeWidth={stroke} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={finished ? theme.good : "url(#restCircleGrad)"} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c}
            animate={{ strokeDashoffset: c - pct * c }}
            transition={{ duration: 0.9, ease: "linear" }}
          />
          <defs>
            <linearGradient id="restCircleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={theme.accent} />
              <stop offset="100%" stopColor={theme.accent2} />
            </linearGradient>
          </defs>
        </svg>
        <div style={{ position: "absolute", inset: 0 }} className="flex flex-col items-center justify-center">
          <Timer size={20} color={finished ? theme.good : theme.accent} className="mb-1.5" />
          <p style={{ color: theme.text }} className="text-[44px] font-extrabold tabular-nums leading-none">{fmtClock(rest.remainingSec)}</p>
          <motion.p
            animate={finished ? { opacity: [1, 0.4, 1] } : { opacity: 1 }}
            transition={finished ? { duration: 1.1, repeat: Infinity } : {}}
            style={{ color: finished ? theme.good : theme.textMuted }} className="text-[12.5px] font-bold mt-2"
          >
            {finished ? "C'est reparti !" : "Récupération en cours"}
          </motion.p>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-6 w-full">
        <button
          disabled={finished}
          onClick={onPauseResume}
          className="flex-1 rounded-2xl py-4 font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}`, opacity: finished ? 0.4 : 1 }}
        >
          {rest.paused ? <><Play size={16} fill={theme.text} /> Reprendre</> : <><Pause size={16} /> Pause</>}
        </button>
        <button
          onClick={onSkip}
          className="flex-1 rounded-2xl py-4 font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform text-white"
          style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`, boxShadow: `0 8px 24px -8px ${theme.accent}88` }}
        >
          <ChevronRight size={16} /> Série suivante
        </button>
      </div>
    </div>
  );
}

// --- Gros champ chiffré avec boutons +/- larges (adapté au tactile pendant l'effort) ---
// Stepper poids/reps utilisé pendant la séance. Les deux instances (Charge / Répétitions)
// sont posées côte à côte dans une grille 2 colonnes — voir la note plus bas sur la cause
// exacte du décalage que ce composant corrige.
function BigNumberStepper({ theme, label, value, onChange, step = 1 }) {
  const num = Number(value) || 0;
  return (
    <div className="rounded-2xl p-3 flex flex-col w-full" style={{ background: theme.card2, border: `1px solid ${theme.border}` }}>
      {/* Hauteur de ligne fixe (au lieu d'un simple margin-bottom) : garantit que le libellé
          occupe TOUJOURS la même hauteur, qu'il tienne sur une ligne ("Répétitions") ou
          risque de passer à la ligne sur un petit écran ("Charge (kg)"). Sans ça, la ligne
          -/valeur/+ ne démarre pas à la même hauteur d'une carte à l'autre : c'était la
          cause exacte du décalage entre le champ Poids et le champ Répétitions. */}
      <p
        style={{ color: theme.textFaint, height: 14, lineHeight: "14px" }}
        className="text-[10px] font-bold uppercase tracking-wide mb-2 text-center whitespace-nowrap overflow-hidden"
      >
        {label}
      </p>
      <div className="flex items-center justify-between gap-1.5 w-full">
        <button
          onClick={() => onChange(String(Math.max(0, num - step)))}
          className="rounded-xl flex items-center justify-center active:scale-90 transition-transform shrink-0"
          style={{ width: 42, height: 42, background: theme.bg }}
        >
          <Minus size={16} color={theme.text} />
        </button>
        {/* min-w-0 : par défaut, un <input> dans une rangée flex refuse de rétrécir sous sa
            largeur de contenu (min-width: auto). Sur un petit écran, ça pouvait pousser le
            bouton "+" hors de la carte ou faire chevaucher les chiffres. flex-1 + min-w-0
            laisse l'input occuper exactement l'espace restant, jamais plus. */}
        <input
          inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 text-center bg-transparent outline-none font-extrabold text-[22px]"
          style={{ color: theme.text }}
        />
        <button
          onClick={() => onChange(String(num + step))}
          className="rounded-xl flex items-center justify-center active:scale-90 transition-transform shrink-0"
          style={{ width: 42, height: 42, background: theme.bg }}
        >
          <Plus size={16} color={theme.text} />
        </button>
      </div>
    </div>
  );
}

// --- Carte "exercice en cours" : nom, infos (séries/reps/charge), consignes, saisie -----
// Compare la série en cours de saisie à la série équivalente (même numéro) de la dernière
// séance sur cet exercice. Ne renvoie une indication QUE en cas de progression ou d'égalité
// stricte — jamais d'indication négative/décourageante pendant l'entraînement.
function compareToLast(currentSet, lastSet) {
  if (!lastSet || !lastSet.weight || !lastSet.reps) return null;
  const curW = Number(currentSet.weight) || 0;
  const curR = Number(currentSet.reps) || 0;
  if (!curW && !curR) return null; // rien saisi pour l'instant
  const lastW = Number(lastSet.weight) || 0;
  const lastR = Number(lastSet.reps) || 0;

  if (curW > lastW) return { type: "up", label: `+${fmtNum(curW - lastW)} kg de progression` };
  if (curW === lastW && curR > lastR) return { type: "up", label: `+${curR - lastR} rép. de progression` };
  if (curW === lastW && curR === lastR) return { type: "same", label: "Même performance" };
  return null; // en dessous de la dernière fois : on reste discret, pas de message négatif
}

// --- Carte "Dernière séance" : récap complet de la dernière fois + comparaison live ----
// Affichée juste au-dessus de la zone de saisie poids/reps pendant l'entraînement.
function LastSessionCard({ theme, last, currentSet }) {
  if (!last) {
    return (
      <Card theme={theme} className="p-4 mb-4 flex items-center gap-2.5" style={{ background: `${theme.accent2}14`, border: `1px solid ${theme.accent2}33` }}>
        <span className="text-[18px]">💪</span>
        <p style={{ color: theme.text }} className="text-[13.5px] font-semibold">Première fois sur cet exercice</p>
      </Card>
    );
  }

  const doneSets = last.log.sets.filter((s) => s.done && (s.weight || s.reps));
  // La comparaison porte sur la série de même numéro que celle en cours de saisie.
  const lastSetSameRound = last.log.sets[currentSet.round];
  const comparison = compareToLast(currentSet, lastSetSameRound);

  return (
    <Card theme={theme} className="p-4 mb-4" style={{ background: theme.card2, border: `1px solid ${theme.border}` }}>
      <div className="flex items-center gap-1.5 mb-2.5">
        <span style={{ color: theme.textFaint }} className="text-[10.5px] font-bold uppercase tracking-wide">Dernière séance</span>
        <span style={{ color: theme.textMuted }} className="text-[11.5px]">📅 {fmtDate(last.session.date, { day: "numeric", month: "long", year: "numeric" })}</span>
      </div>
      <div className="space-y-1 mb-1">
        {doneSets.length === 0 ? (
          <p style={{ color: theme.textFaint }} className="text-[12.5px]">Aucune série enregistrée.</p>
        ) : (
          doneSets.map((s, i) => (
            <p key={i} style={{ color: theme.textMuted }} className="text-[13px]">
              Série {i + 1} : <span style={{ color: theme.text }} className="font-semibold">{s.reps || 0} reps à {fmtNum(s.weight)} kg</span>
            </p>
          ))
        )}
      </div>
      {comparison && (
        <div className="flex items-center gap-1.5 mt-2.5 pt-2.5" style={{ borderTop: `1px dashed ${theme.border}` }}>
          {comparison.type === "up" ? <ArrowUp size={13} color={theme.good} /> : <Minus size={13} color={theme.textMuted} />}
          <span className="text-[12.5px] font-bold" style={{ color: comparison.type === "up" ? theme.good : theme.textMuted }}>
            {comparison.label}
          </span>
        </div>
      )}
    </Card>
  );
}

// --- Carte "exercice verrouillé" : aperçu en lecture seule d'un exercice à venir --------
// Rien n'y est interactif : ni le poids, ni les reps, ni les séries, ni l'ordre. Un tap
// affiche un message explicatif au lieu d'ouvrir une édition.
function ExerciseCardLocked({ theme, name, groupSize, letter, exIndexInBlock, totalRounds, targetReps, onLockedTap }) {
  return (
    <button
      onClick={onLockedTap}
      className="w-full text-left rounded-3xl p-4 flex items-center gap-3 active:scale-[0.99] transition-transform"
      style={{ background: "rgba(20,20,22,0.7)", border: `1px solid ${theme.border}`, opacity: 0.6 }}
    >
      <span className="shrink-0 text-[17px]">🔒</span>
      <div className="flex-1 min-w-0">
        {groupSize > 1 && (
          <span className="text-[10px] font-extrabold mr-1.5" style={{ color: theme.textFaint }}>
            {groupLabel(groupSize)} · {letter}{exIndexInBlock + 1}
          </span>
        )}
        <p style={{ color: theme.textMuted }} className="font-bold text-[15px] truncate">{name}</p>
        <p style={{ color: theme.textFaint }} className="text-[12px] mt-0.5">{totalRounds} séries × {targetReps} reps</p>
      </div>
    </button>
  );
}

// --- Ligne réordonnable (mode réorganisation) : un biset/triset/circuit se déplace comme
// un seul bloc, jamais exercice par exercice, pour préserver son enchaînement A1/A2. -----
function ReorderableBlockRow({ theme, block, onStartNow }) {
  const names = block.exerciseLogs.map((el) => el.name);
  const isGroup = names.length > 1;
  return (
    <Reorder.Item value={block}>
      <Card theme={theme} className="p-3.5 flex items-center gap-3" style={{ background: theme.card2 }}>
        <GripVertical size={17} color={theme.textFaint} className="cursor-grab shrink-0" />
        <div className="flex-1 min-w-0">
          {isGroup && (
            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold inline-block mb-1" style={{ background: theme.accent, color: "#fff" }}>
              {groupLabel(names.length)}
            </span>
          )}
          <p style={{ color: theme.text }} className="font-semibold text-[13.5px] truncate">{names.join(" + ")}</p>
        </div>
        <button
          onClick={() => onStartNow(block.id)}
          className="shrink-0 px-3.5 py-2.5 rounded-xl text-[11.5px] font-bold text-white active:scale-95 transition-transform"
          style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})` }}
        >
          Commencer
        </button>
      </Card>
    </Reorder.Item>
  );
}

// --- Carte "exercice actif" : entièrement interactive (poids, reps, validation) ---------
function ExerciseCardActive({ theme, log, groupSize, letter, exIndexInBlock, round, sessions, onChangeSet, onValidate, onRename, onAddSet }) {
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
  const commitRename = () => { const n = nameDraft.trim() || log.name; onRename(n); setNameDraft(n); setEditingName(false); };

  const set = log.sets[round] || { weight: "", reps: "" };
  const totalRounds = log.sets.length;

  return (
    <Card theme={theme} className="p-5">
      {groupSize > 1 && (
        <span className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold inline-block mb-3" style={{ background: theme.accent, color: "#fff" }}>
          {groupLabel(groupSize)} · {letter}{exIndexInBlock + 1}
        </span>
      )}

      {editingName ? (
        <input
          autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitRename} onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
          className="w-full text-[23px] font-extrabold bg-transparent outline-none border-b mb-1"
          style={{ color: theme.text, borderColor: theme.accent }}
        />
      ) : (
        <button onClick={() => setEditingName(true)} className="flex items-center gap-2 text-left mb-1">
          <h2 style={{ color: theme.text }} className="text-[23px] font-extrabold leading-tight">{log.name}</h2>
          <Edit2 size={14} color={theme.textFaint} className="shrink-0" />
        </button>
      )}
      <p style={{ color: theme.accent }} className="text-[14px] font-bold mb-4">Série {round + 1} / {totalRounds}</p>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="px-3 py-1.5 rounded-full text-[12px] font-semibold" style={{ background: theme.card2, color: theme.textMuted }}>
          🎯 {log.targetReps} reps cible
        </span>
        {pr && (
          <span className="px-3 py-1.5 rounded-full text-[12px] font-bold flex items-center gap-1" style={{ background: `${theme.accent2}22`, color: theme.accent2 }}>
            <Trophy size={12} /> Record {pr}kg
          </span>
        )}
      </div>

      {log.notes && (
        <div className="rounded-2xl p-3.5 mb-4 flex items-start gap-2.5" style={{ background: `${theme.accent}14` }}>
          <Info size={14} color={theme.accent} className="mt-0.5 shrink-0" />
          <p style={{ color: theme.text }} className="text-[13px] leading-snug">{log.notes}</p>
        </div>
      )}

      <LastSessionCard theme={theme} last={last} currentSet={{ weight: set.weight, reps: set.reps, round }} />

      {/* grid-cols-2 (= repeat(2, minmax(0,1fr))) donne deux colonnes strictement égales en
          largeur, qui s'adaptent à n'importe quelle taille d'écran ; items-stretch force les
          deux cartes à la même hauteur. Aucune largeur fixe, aucun positionnement absolu. */}
      <div className="grid grid-cols-2 gap-3 mb-5 items-stretch">
        <BigNumberStepper theme={theme} label="Charge (kg)" value={set.weight} onChange={(v) => onChangeSet({ weight: v })} step={2.5} />
        <BigNumberStepper theme={theme} label="Répétitions" value={set.reps} onChange={(v) => onChangeSet({ reps: v })} step={1} />
      </div>

      <BigButton theme={theme} gradient onClick={onValidate}>
        <Check size={18} strokeWidth={3} /> Valider la série
      </BigButton>

      <button onClick={onAddSet} className="w-full text-center mt-3 text-[12.5px] font-semibold" style={{ color: theme.textMuted }}>
        + Ajouter une série bonus à cet exercice
      </button>
    </Card>
  );
}

// --- Orchestrateur principal du mode entraînement --------------------------------------
// Regroupe l'état global de la séance : étape courante (exercice + série), phase
// ('set' = saisie en cours, 'rest' = récupération, 'done' = séance terminée), chrono
// global (toujours actif) et minuteur de récupération (pilotable indépendamment).
function WorkoutSession({ workout, setWorkout, sessions, onFinish, onCancel, restDefault, onStatusChange }) {
  // Le mode entraînement reste toujours en thème sombre, quel que soit le réglage
  // clair/sombre choisi ailleurs dans l'app (comme les apps fitness pro).
  const theme = useTheme(true);

  const elapsedSec = useSessionClock(workout.startedAt);
  const { rest, loaded: restLoaded, start: startRest, pause: pauseRest, resume: resumeRest, stop: stopRest } = useRestTimer(workout.id);

  const steps = useMemo(() => buildSessionSteps(workout.blocks), [workout.blocks]);
  // stepIndex et phase sont PERSISTÉS, chacun sous une clé propre à cette séance
  // (`workout.id`) : après un rafraîchissement de page, on retombe exactement sur le même
  // exercice / la même série plutôt que de repartir de zéro.
  const [stepIndex, setStepIndex, stepIndexLoaded] = usePersistentState(`gt_step_${workout.id}`, 0);
  const [phase, setPhase, phaseLoaded] = usePersistentState(`gt_phase_${workout.id}`, "set"); // 'set' | 'rest' | 'done'
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [lockedHint, setLockedHint] = useState(false); // message temporaire "exercice verrouillé"
  const [reorderMode, setReorderMode] = useState(false); // mode réorganisation de la suite de la séance
  const [pendingJump, setPendingJump] = useState(null); // blockId à activer dès que `steps` se recalcule

  // Tant que la position exacte dans la séance (étape, phase, minuteur de repos) n'a pas
  // fini d'être restaurée depuis le stockage, on affiche un petit chargement plutôt que de
  // montrer brièvement "Série 1" avant que la vraie valeur ("Série 3/4") ne s'affiche.
  const runtimeLoaded = stepIndexLoaded && phaseLoaded && restLoaded;

  const step = steps[stepIndex] || null;
  const block = step ? workout.blocks.find((b) => b.id === step.blockId) : null;
  const log = step && block ? block.exerciseLogs.find((el) => el.exerciseId === step.exerciseId) : null;
  const letters = useMemo(() => computeGroupLetters(workout.blocks.map((b) => ({ id: b.id, exercises: b.exerciseLogs }))), [workout.blocks]);

  // Remonte un instantané léger (nom d'exercice, chrono, phase, repos restant) vers App,
  // pour la bannière persistante affichée sur les autres onglets. Ne pilote rien ici :
  // WorkoutSession reste seul maître de son propre état, ceci n'est qu'un aperçu diffusé.
  useEffect(() => {
    if (!onStatusChange || !runtimeLoaded) return;
    onStatusChange({
      exerciseName: log?.name || "",
      elapsedSec,
      phase,
      restRemaining: rest ? rest.remainingSec : null,
    });
  }, [onStatusChange, runtimeLoaded, log?.name, elapsedSec, phase, rest?.remainingSec]);

  // Liste des exercices à venir (verrouillés) : un exercice par entrée (dédupliqué),
  // dans l'ordre de la séance, en excluant l'exercice actuellement actif.
  const upcomingExercises = useMemo(() => {
    if (!step) return [];
    const seen = new Set([step.exerciseId]);
    const list = [];
    for (let i = stepIndex + 1; i < steps.length; i++) {
      const s = steps[i];
      if (seen.has(s.exerciseId)) continue;
      seen.add(s.exerciseId);
      const b = workout.blocks.find((bl) => bl.id === s.blockId);
      const l = b?.exerciseLogs.find((el) => el.exerciseId === s.exerciseId);
      if (!l) continue;
      list.push({
        exerciseId: s.exerciseId, name: l.name, targetReps: l.targetReps, totalRounds: l.sets.length,
        groupSize: s.groupSize, letter: letters[s.blockId], exIndexInBlock: s.exIndexInBlock,
      });
    }
    return list;
  }, [steps, stepIndex, workout.blocks, letters, step]);

  // Liste des BLOCS à venir (unité de réorganisation) : un biset/triset/circuit se déplace
  // toujours comme un seul bloc, jamais exercice par exercice, pour ne pas casser son
  // enchaînement A1/A2. Seuls les blocs strictement après le bloc actif sont concernés :
  // le bloc en cours et tout ce qui le précède ne bougent jamais.
  const upcomingBlocks = useMemo(() => {
    if (!step) return [];
    const idx = workout.blocks.findIndex((b) => b.id === step.blockId);
    return idx === -1 ? [] : workout.blocks.slice(idx + 1);
  }, [workout.blocks, step]);

  // Réordonne la suite de la séance : seule la portion "à venir" est remplacée, donc le
  // nombre d'étapes avant/à l'exercice actif ne change pas -> `stepIndex` reste valide.
  const reorderUpcomingBlocks = (newUpcomingOrder) => {
    setWorkout((w) => {
      const idx = w.blocks.findIndex((b) => b.id === step.blockId);
      if (idx === -1) return w;
      return { ...w, blocks: [...w.blocks.slice(0, idx + 1), ...newUpcomingOrder] };
    });
  };

  // "Commencer maintenant" : place l'exercice choisi juste après le bloc actif, puis
  // demande à activer ce bloc dès que possible (voir l'effet ci-dessous). Le bloc
  // actuellement en cours n'est ni modifié ni supprimé : ses séries restantes réapparaîtront
  // simplement plus tard dans la séance, à leur nouvelle position.
  const startBlockNow = (blockId) => {
    setWorkout((w) => {
      const curIdx = w.blocks.findIndex((b) => b.id === step.blockId);
      const targetIdx = w.blocks.findIndex((b) => b.id === blockId);
      if (curIdx === -1 || targetIdx <= curIdx) return w;
      const target = w.blocks[targetIdx];
      const without = w.blocks.filter((b) => b.id !== blockId);
      const insertAt = without.findIndex((b) => b.id === step.blockId) + 1;
      return { ...w, blocks: [...without.slice(0, insertAt), target, ...without.slice(insertAt)] };
    });
    setReorderMode(false);
    setPendingJump(blockId);
  };

  // Une fois `steps` recalculé après le déplacement ci-dessus, on saute directement à la
  // première étape (première série) du bloc choisi.
  useEffect(() => {
    if (!pendingJump) return;
    const idx = steps.findIndex((s) => s.blockId === pendingJump);
    if (idx !== -1) {
      stopRest();
      setStepIndex(idx);
      setPhase("set");
    }
    setPendingJump(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingJump, steps]);

  // Affiche brièvement le message "verrouillé" puis le referme tout seul.
  useEffect(() => {
    if (!lockedHint) return;
    const t = setTimeout(() => setLockedHint(false), 2200);
    return () => clearTimeout(t);
  }, [lockedHint]);

  const allLogs = workout.blocks.flatMap((b) => b.exerciseLogs);
  const tonnage = allLogs.reduce((a, el) => a + el.sets.reduce((b, s) => b + (s.done ? (Number(s.weight) || 0) * (Number(s.reps) || 0) : 0), 0), 0);
  const totalSets = allLogs.reduce((a, el) => a + el.sets.filter((s) => s.done).length, 0);

  // Met à jour la série en cours (poids / reps / done) de l'étape active.
  const updateCurrentSet = (patch) => {
    if (!step) return;
    setWorkout((w) => ({
      ...w,
      blocks: w.blocks.map((b) => (b.id !== step.blockId ? b : {
        ...b,
        exerciseLogs: b.exerciseLogs.map((el) => (el.exerciseId !== step.exerciseId ? el : {
          ...el, sets: el.sets.map((s, i) => (i === step.round ? { ...s, ...patch } : s)),
        })),
      })),
    }));
  };

  const renameCurrentExercise = (name) => {
    if (!step) return;
    setWorkout((w) => ({
      ...w,
      blocks: w.blocks.map((b) => (b.id !== step.blockId ? b : {
        ...b, exerciseLogs: b.exerciseLogs.map((el) => (el.exerciseId !== step.exerciseId ? el : { ...el, name })),
      })),
    }));
  };

  const addBonusSetToCurrentExercise = () => {
    if (!step) return;
    setWorkout((w) => ({
      ...w,
      blocks: w.blocks.map((b) => (b.id !== step.blockId ? b : {
        ...b, exerciseLogs: b.exerciseLogs.map((el) => (el.exerciseId !== step.exerciseId ? el : { ...el, sets: [...el.sets, { weight: "", reps: "", done: false }] })),
      })),
    }));
  };

  // Passe à l'étape suivante (série suivante ou exercice suivant). Appelé soit
  // automatiquement (fin du repos), soit manuellement ("Série suivante" / "Passer").
  const goToNextStep = () => {
    stopRest();
    if (stepIndex + 1 >= steps.length) { setPhase("done"); return; }
    setStepIndex((i) => i + 1);
    setPhase("set");
  };

  // Valide la série affichée à l'écran :
  //  - si c'est le DERNIER exercice du tour (cas normal, ou dernier maillon d'un
  //    biset/triset/circuit) -> on lance le minuteur de récupération.
  //  - sinon (ex: A1 dans un biset) -> on enchaîne IMMÉDIATEMENT sur l'exercice suivant,
  //    sans jamais démarrer de repos entre les deux.
  const validateCurrentSet = () => {
    if (!step) return;
    updateCurrentSet({ done: true, completedAt: Date.now() });
    const isVeryLastStep = stepIndex + 1 >= steps.length;
    if (step.isLastOfRound) {
      if (isVeryLastStep) { setPhase("done"); return; }
      startRest(block.restSec || restDefault);
      setPhase("rest");
    } else {
      goToNextStep();
    }
  };

  // Supprime les clés de progression propres à CETTE séance (étape, phase, minuteur de
  // repos) une fois qu'elle est terminée ou annulée — la séance elle-même (`activeWorkout`)
  // est déjà remise à null par App à ce moment-là, ceci ne fait que nettoyer le stockage.
  // Entièrement défensif : ne doit JAMAIS lever d'exception, sous peine de bloquer les
  // boutons Enregistrer/Annuler qui l'appellent (c'était une cause possible du bug).
  const cleanupRuntimeStorage = () => {
    try {
      ["gt_step_", "gt_phase_", "gt_rest_"].forEach((prefix) => {
        try {
          window.storage?.delete?.(`${prefix}${workout.id}`, false)?.catch?.(() => {});
        } catch (e) { /* ignore : le nettoyage est un bonus, pas une condition de succès */ }
      });
    } catch (e) { /* ignore */ }
  };
  // L'action réelle (fermer/annuler) s'exécute D'ABORD, le nettoyage du stockage ensuite :
  // même si le nettoyage échouait, le bouton doit quand même avoir fait son travail.
  const handleCancel = () => { onCancel(); cleanupRuntimeStorage(); };

  const finishWorkout = () => {
    const durationSec = Math.floor((Date.now() - workout.startedAt) / 1000);
    const session = {
      id: workout.id, programId: workout.programId, programName: workout.programName,
      date: todayISO(), startedAt: workout.startedAt, durationSec, tonnage, totalSets,
      blocks: workout.blocks.map((b) => ({ id: b.id, restSec: b.restSec, exerciseIds: b.exerciseLogs.map((el) => el.exerciseId) })),
      exerciseLogs: workout.blocks.flatMap((b) => b.exerciseLogs.map((el) => ({ ...el, sets: el.sets.filter((s) => s.done || s.weight || s.reps) }))),
    };
    onFinish(session);
    cleanupRuntimeStorage();
  };

  if (steps.length === 0) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <EmptyState theme={theme} icon={Dumbbell} title="Programme vide" subtitle="Ajoute des exercices à ce programme avant de démarrer une séance." />
        <BigButton theme={theme} onClick={handleCancel}>Retour</BigButton>
      </div>
    );
  }

  // Tant que la position exacte de la séance n'a pas fini d'être restaurée depuis le
  // stockage (juste après un rafraîchissement de page), on affiche un petit indicateur de
  // chargement plutôt que l'exercice par défaut (Série 1) pendant une fraction de seconde.
  if (!runtimeLoaded) {
    return (
      <div style={{ background: theme.bg }} className="gt-app-shell flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          style={{ width: 24, height: 24, borderRadius: 999, border: `3px solid ${theme.card2}`, borderTopColor: theme.accent }} />
      </div>
    );
  }

  return (
    <div style={{ background: theme.bg }} className="gt-app-shell">
      <SessionHeader
        theme={theme} programName={workout.programName} elapsedSec={elapsedSec}
        stepNumber={Math.min(stepIndex + 1, steps.length)} totalSteps={steps.length}
        onCancel={handleCancel} onEndClick={() => setConfirmEnd(true)}
      />

      <div className="px-4 pb-8 pt-4">
        <AnimatePresence mode="wait">
          {phase === "rest" && rest ? (
            <motion.div key="rest" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <RestTimerCircle
                theme={theme} rest={rest}
                onPauseResume={() => (rest.paused ? resumeRest() : pauseRest())}
                onSkip={goToNextStep}
              />
              {steps[stepIndex + 1] && (() => {
                const nextStep = steps[stepIndex + 1];
                const nextBlock = workout.blocks.find((b) => b.id === nextStep.blockId);
                const nextLog = nextBlock?.exerciseLogs.find((el) => el.exerciseId === nextStep.exerciseId);
                return (
                  <Card theme={theme} className="p-4 mt-1">
                    <p style={{ color: theme.textFaint }} className="text-[10.5px] font-bold uppercase tracking-wide mb-1">À suivre</p>
                    <p style={{ color: theme.text }} className="font-bold text-[15px]">{nextLog?.name}</p>
                  </Card>
                );
              })()}
            </motion.div>
          ) : phase === "done" ? (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-8 text-center">
              <div className="rounded-full flex items-center justify-center mx-auto mb-4" style={{ width: 76, height: 76, background: `${theme.good}22` }}>
                <CheckCircle2 size={36} color={theme.good} />
              </div>
              <h2 style={{ color: theme.text }} className="text-[23px] font-extrabold mb-1">Séance terminée !</h2>
              <p style={{ color: theme.textMuted }} className="text-[13.5px] mb-6">
                {fmtDuration(elapsedSec)} · {totalSets} séries · {Math.round(tonnage).toLocaleString("fr-FR")} kg
              </p>
              <BigButton theme={theme} gradient onClick={finishWorkout}><Save size={17} /> Enregistrer la séance</BigButton>
            </motion.div>
          ) : (
            step && log && (
              <motion.div key={stepIndex} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.2 }}>
                <ExerciseCardActive
                  theme={theme} log={log} groupSize={step.groupSize} letter={letters[block.id]}
                  exIndexInBlock={step.exIndexInBlock} round={step.round} sessions={sessions}
                  onChangeSet={updateCurrentSet} onValidate={validateCurrentSet}
                  onRename={renameCurrentExercise} onAddSet={addBonusSetToCurrentExercise}
                />
              </motion.div>
            )
          )}
        </AnimatePresence>

        {/* Aperçu de la suite de la séance : verrouillé par défaut, non interactif.
            Le bouton "Modifier l'ordre" bascule vers un mode où l'utilisateur peut
            glisser-déposer les exercices à venir, ou en démarrer un immédiatement.
            L'exercice actif redevient automatiquement normal / verrouillé au fil de la
            séance (goToNextStep), sans intervention supplémentaire ici. */}
        {phase !== "done" && upcomingExercises.length > 0 && (
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <p style={{ color: theme.textFaint }} className="text-[11px] font-bold uppercase tracking-wide">Exercices suivants</p>
              <button
                onClick={() => setReorderMode((v) => !v)}
                className="flex items-center gap-1.5 text-[11.5px] font-bold active:scale-95 transition-transform"
                style={{ color: reorderMode ? theme.good : theme.accent }}
              >
                <ArrowUpDown size={13} /> {reorderMode ? "Terminé" : "Modifier l'ordre"}
              </button>
            </div>

            {reorderMode ? (
              <>
                <p style={{ color: theme.textFaint }} className="text-[11.5px] px-1 -mt-1">
                  Glisse pour réordonner, ou tape "Commencer" pour passer directement à un exercice.
                </p>
                <Reorder.Group axis="y" values={upcomingBlocks} onReorder={reorderUpcomingBlocks} className="space-y-2">
                  {upcomingBlocks.map((b) => (
                    <ReorderableBlockRow key={b.id} theme={theme} block={b} onStartNow={startBlockNow} />
                  ))}
                </Reorder.Group>
              </>
            ) : (
              upcomingExercises.map((ex) => (
                <ExerciseCardLocked key={ex.exerciseId} theme={theme} {...ex} onLockedTap={() => setLockedHint(true)} />
              ))
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {lockedHint && (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            className="fixed left-0 right-0 bottom-6 flex justify-center z-40 px-6 pointer-events-none" style={{ maxWidth: 480, margin: "0 auto" }}>
            <div className="rounded-2xl px-4 py-3 text-center text-[13px] font-semibold" style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}`, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)" }}>
              🔒 Terminez l'exercice actuel avant de modifier celui-ci.
            </div>
          </motion.div>
        )}
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

function ConfirmSheet({ theme, title, subtitle, confirmLabel, onConfirm, onCancel, danger }) {
  return (
    <motion.div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 200 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
        {(() => {
          const byId = Object.fromEntries(session.exerciseLogs.map((el) => [el.exerciseId, el]));
          const blocks = (session.blocks && session.blocks.length ? session.blocks : session.exerciseLogs.map((el) => ({ id: el.exerciseId, restSec: null, exerciseIds: [el.exerciseId] })));
          const letters = computeGroupLetters(blocks.map((b) => ({ id: b.id, exercises: b.exerciseIds })));
          return blocks.map((b) => {
            const logs = b.exerciseIds.map((id) => byId[id]).filter(Boolean);
            if (logs.length === 0) return null;
            const isGroup = logs.length > 1;
            return (
              <Card theme={theme} className="p-4" key={b.id} style={isGroup ? { border: `1.5px solid ${theme.accent}55` } : {}}>
                {isGroup && (
                  <span className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold inline-block mb-3" style={{ background: theme.accent, color: "#fff" }}>
                    {groupLabel(logs.length)}
                  </span>
                )}
                <div className={isGroup ? "space-y-3" : ""}>
                  {logs.map((el, i) => (
                    <div key={el.exerciseId} className={isGroup && i > 0 ? "pt-3" : ""} style={isGroup && i > 0 ? { borderTop: `1px dashed ${theme.border}` } : {}}>
                      <p style={{ color: theme.text }} className="font-bold text-[14.5px] mb-2">
                        {isGroup && <span style={{ color: theme.accent }} className="mr-1.5">{letters[b.id]}{i + 1}</span>}
                        {el.name}
                      </p>
                      <div className="space-y-1">
                        {el.sets.map((s, si) => (
                          <div key={si} className="flex items-center justify-between text-[13px]" style={{ color: s.done ? theme.text : theme.textFaint }}>
                            <span>Série {si + 1}</span>
                            <span className="font-semibold">{s.weight || 0} kg × {s.reps || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          });
        })()}
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
    <motion.div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 200 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
        <StatBox theme={theme} icon={Trophy} label="Série la plus lourde" value={heaviestSet ? `${heaviestSet.weight}kg` : "—"} />
      </div>

      {favoriteExercise && (
        <Card theme={theme} className="p-4 flex items-center gap-3">
          <div className="rounded-2xl flex items-center justify-center shrink-0" style={{ width: 44, height: 44, background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})` }}><Dumbbell size={18} color="#fff" /></div>
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
      <IconBadge theme={theme} icon={Icon} size={30} iconSize={15} tone="accent" className="mb-1.5" />
      <p style={{ color: theme.text }} className="text-[16px] font-extrabold leading-tight mt-1.5">{value}</p>
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
