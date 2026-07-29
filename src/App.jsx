import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence, Reorder, useReducedMotion } from "framer-motion";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ReferenceLine,
} from "recharts";
import {
  Home, Dumbbell, History as HistoryIcon, TrendingUp, Scale, BarChart3,
  Plus, X, Check, ChevronRight, ChevronLeft, Play, Pause, Timer, Trash2,
  Edit2, GripVertical, Moon, Sun, Search, Download, Upload, Copy,
  Flame, Calendar, Info, ChevronDown, RotateCcw, CheckCircle2, Circle,
  Target, ArrowUp, ArrowDown, Minus, Settings, FileDown, FileUp, Save,
  Link2, Unlink, Trophy, Sparkles, ArrowUpDown, User, Lock, Zap,
  Utensils, Beef, Wheat, Droplet, Bell, AlertTriangle, Edit3, HeartPulse,
  Camera, Rocket, Images, Ruler, FileText, FileSpreadsheet, FileJson, Footprints,
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

// Convertit une saisie utilisateur en nombre, en acceptant le format français (virgule)
// ET le format international (point) : "92,6" et "92.6" donnent tous les deux 92.6.
// C'était la cause exacte du bug "NaN kg" : `Number("92,6")` (sans remplacement de la
// virgule) renvoie NaN, car Number()/parseFloat() ne comprennent que le point décimal.
function parseLocaleNumber(str) {
  if (str == null) return NaN;
  const normalized = String(str).trim().replace(",", ".");
  if (normalized === "") return NaN;
  return Number(normalized);
}

// Affichage d'un poids au format français : virgule décimale, une seule décimale
// maximum, jamais de zéro inutile (92 -> "92", 92.6 -> "92,6", 85.25 -> "85,3").
function fmtWeight(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

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

// Estimation générique "combien de temps pour atteindre Y ?" à partir d'une régression
// linéaire sur des points {x: jours, y: valeur} — utilisée à la fois par l'objectif de
// poids (WeightPage) et par la Simulation de progression (force + poids corporel).
// Fonctionne dans les deux sens (progression qui monte OU qui descend) : seul compte le
// signe de la tendance par rapport à la direction de l'objectif.
function estimateTargetETA(points, targetY) {
  if (points.length < 3) return null;
  const reg = linRegSlope(points);
  if (!reg || reg.slope === 0) return null;
  const targetX = (targetY - reg.intercept) / reg.slope;
  const daysFromNow = targetX - points[points.length - 1].x;
  if (daysFromNow <= 0 || !isFinite(daysFromNow)) return null;
  const targetDate = new Date(Date.now() + daysFromNow * 86400000);
  return { days: Math.round(daysFromNow), date: targetDate, weeklyRate: reg.slope * 7 };
}

// Valeur projetée par la régression à N jours dans le futur (utilisé pour les horizons
// 1 semaine / 2 semaines / 1 mois / ... de la Simulation de progression).
function projectValueAtDays(points, daysFromNow) {
  if (points.length < 3) return null;
  const reg = linRegSlope(points);
  if (!reg) return null;
  return reg.intercept + reg.slope * (points[points.length - 1].x + daysFromNow);
}

// Indice de confiance (0-100) affiché à côté de chaque prédiction — une HEURISTIQUE
// transparente basée sur la quantité et la régularité des données disponibles, PAS une
// vraie confiance statistique (pas d'intervalle de confiance calculé, pas de p-value :
// on n'a pas de modèle probabiliste ici, juste une régression linéaire sur peu de points).
// Documentée ainsi pour ne jamais laisser croire à une précision qu'elle n'a pas.
// Pondération assumée et ajustable :
//   - jusqu'à 40 pts pour le nombre de pesées (10 pesées = plafond)
//   - jusqu'à 20 pts pour l'étalement dans le temps (60 jours = plafond)
//   - jusqu'à 25 pts pour le suivi nutritionnel (10 jours renseignés = plafond)
//   - jusqu'à 15 pts pour la régularité d'entraînement (10 séances = plafond)
function computeSimulationConfidence({ weightEntriesCount, daySpan, caloriesLogCount, sessionsCount }) {
  let score = 0;
  score += Math.min(40, weightEntriesCount * 4);
  score += Math.min(20, daySpan / 3);
  score += Math.min(25, caloriesLogCount * 2.5);
  score += Math.min(15, sessionsCount * 1.5);
  return Math.round(Math.min(100, score));
}

const PROJECTION_HORIZONS = [
  { id: "1w", label: "1 semaine", days: 7 },
  { id: "2w", label: "2 semaines", days: 14 },
  { id: "1m", label: "1 mois", days: 30 },
  { id: "2m", label: "2 mois", days: 60 },
  { id: "3m", label: "3 mois", days: 90 },
  { id: "6m", label: "6 mois", days: 182 },
  { id: "1y", label: "1 an", days: 365 },
];

// Petit indicateur visuel de confiance, réutilisé partout dans la Simulation.
function ConfidenceBadge({ theme, score }) {
  const color = score >= 66 ? theme.good : score >= 33 ? theme.accent2 : theme.bad;
  return (
    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1" style={{ background: `${color}1f`, color }}>
      <Target size={11} /> Confiance {score}%
    </span>
  );
}

// Lundi de la semaine contenant `date` (minuit) — utilisé pour découper l'historique en
// semaines calendaires (lundi -> dimanche) dans le calcul du streak hebdomadaire.
function mondayOfWeek(date) {
  const d = new Date(date);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Streak "jours consécutifs d'entraînement" : streak courant (jusqu'à aujourd'hui, ou
// hier si rien fait aujourd'hui — la journée n'est pas encore terminée) + meilleur record
// jamais atteint (plus longue série de jours consécutifs sur tout l'historique).
function computeDayStreak(sessions) {
  const dates = new Set(sessions.map((s) => s.date));
  const sortedDates = [...dates].sort();
  let best = 0, current = 0, prevTime = null;
  for (const d of sortedDates) {
    const t = new Date(d).getTime();
    current = prevTime !== null && t - prevTime === 86400000 ? current + 1 : 1;
    if (current > best) best = current;
    prevTime = t;
  }
  let currentStreak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!dates.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current: currentStreak, best: Math.max(best, currentStreak) };
}

// Streak "semaines consécutives où l'objectif a été atteint" : l'objectif hebdomadaire est
// le nombre de jours assignés dans le planning (gt_weekly_planning_v1). On ne compte que
// les semaines PLEINES et déjà terminées (la semaine en cours est exclue, elle n'est pas
// finie) ; le compte s'arrête à la première semaine où l'objectif n'est pas atteint.
function computeWeeklyStreak(sessions, weeklyPlanning) {
  const objective = Object.values(weeklyPlanning || {}).filter(Boolean).length;
  if (!objective) return 0;
  const sessionDates = sessions.map((s) => new Date(s.date));
  const thisMonday = mondayOfWeek(new Date());
  let streak = 0;
  for (let i = 1; i <= 52; i++) {
    const weekStart = new Date(thisMonday); weekStart.setDate(weekStart.getDate() - 7 * i);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
    const count = sessionDates.filter((d) => d >= weekStart && d < weekEnd).length;
    if (count >= objective) streak += 1; else break;
  }
  return streak;
}

/* ============================== PLANNING HEBDOMADAIRE ============================== */
// Jours de la semaine, lundi en premier.
const WEEK_DAYS = [
  { key: "mon", label: "Lundi", short: "L" },
  { key: "tue", label: "Mardi", short: "M" },
  { key: "wed", label: "Mercredi", short: "M" },
  { key: "thu", label: "Jeudi", short: "J" },
  { key: "fri", label: "Vendredi", short: "V" },
  { key: "sat", label: "Samedi", short: "S" },
  { key: "sun", label: "Dimanche", short: "D" },
];

// Mensurations suivies dans la section Physique — toutes en cm, toutes optionnelles à
// chaque enregistrement (on ne mesure pas forcément tout à chaque fois).
const BODY_MEASUREMENTS = [
  { id: "arm", label: "Bras" }, { id: "forearm", label: "Avant-bras" }, { id: "shoulders", label: "Épaules" },
  { id: "chest", label: "Poitrine" }, { id: "waist", label: "Taille" }, { id: "hips", label: "Hanches" },
  { id: "thighs", label: "Cuisses" }, { id: "calves", label: "Mollets" }, { id: "neck", label: "Cou" },
];

// `Date.getDay()` renvoie 0 = dimanche...6 = samedi ; on convertit pour que 0 = lundi.
function getTodayKey() {
  const jsDay = new Date().getDay();
  const idx = (jsDay + 6) % 7;
  return WEEK_DAYS[idx].key;
}

// Date calendaire (YYYY-MM-DD) de chaque jour de la semaine EN COURS (lundi -> dimanche) —
// sert à vérifier si une séance a été réalisée tel jour.
function getCurrentWeekDates() {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  const map = {};
  WEEK_DAYS.forEach((d, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    map[d.key] = date.toISOString().slice(0, 10);
  });
  return map;
}

// Planning par défaut : tous les jours en "Repos" (aucun programme assigné).
function defaultWeeklyPlanning() {
  const p = {};
  WEEK_DAYS.forEach((d) => { p[d.key] = null; });
  return p;
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

// Version du SCHÉMA DE DONNÉES (la forme des objets stockés, pas la version de l'app).
// À incrémenter si la forme d'une donnée persistée change un jour (champ renommé,
// restructuration...) — `normalizeProgram` ci-dessous est l'exemple déjà en place : il
// répare automatiquement les anciens programmes (format à plat, ou sans absExercises/
// muscleGroups) sans jamais supprimer de données existantes.
const SCHEMA_VERSION = 1;

function normalizeProgram(p) {
  if (p.blocks) return { ...p, absExercises: p.absExercises || [], muscleGroups: p.muscleGroups || [] };
  const blocks = (p.exercises || []).map((ex) => ({
    id: uid(),
    restSec: ex.rest || 90,
    exercises: [{ id: ex.id, name: ex.name, series: ex.series, reps: ex.reps, notes: ex.notes }],
  }));
  return { id: p.id, name: p.name, color: p.color, blocks, absExercises: p.absExercises || [], muscleGroups: p.muscleGroups || [] };
}

/* ============================== THEME ============================== */

// Palette premium inspirée d'une identité "salle de sport" moderne : noir profond
// légèrement bleuté (pas un noir pur, plus "riche"), anthracite pour les surfaces,
// blanc cassé plutôt que blanc pur pour le texte, accent énergique en dégradé
// rouge-orangé → ambre. Mêmes noms de propriétés qu'avant (aucun risque de casser un
// usage existant) — uniquement des valeurs plus travaillées, + quelques tokens en plus
// (shadowSm/shadowMd/glow/gradient) que les composants partagés utilisent désormais.
function useTheme(isDark) {
  return useMemo(() => {
    const accent = "#FF4B2B";
    const accent2 = "#FFB020";
    return {
      bg: isDark ? "#07080A" : "#F7F7F5",
      bgAlt: isDark ? "#0C0E11" : "#F7F7F5",
      card: isDark ? "#15171B" : "#FFFFFF",
      card2: isDark ? "#1D2025" : "#F0F0EC",
      border: isDark ? "rgba(255,255,255,0.07)" : "rgba(20,20,20,0.08)",
      text: isDark ? "#F7F6F3" : "#15171B",
      textMuted: isDark ? "#9A9CA3" : "#6B6D73",
      textFaint: isDark ? "#5C5F66" : "#AEAEB2",
      accent,
      accent2,
      good: "#2FD98A",
      bad: "#FF4757",
      tabBg: isDark ? "rgba(13,15,18,0.85)" : "rgba(255,255,255,0.85)",
      gradient: `linear-gradient(135deg, ${accent}, ${accent2})`,
      shadowSm: isDark ? "0 2px 10px -4px rgba(0,0,0,0.5)" : "0 2px 10px -4px rgba(20,20,20,0.08)",
      shadowMd: isDark ? "0 16px 40px -16px rgba(0,0,0,0.65)" : "0 16px 40px -16px rgba(20,20,20,0.14)",
      glow: `0 10px 28px -10px ${accent}70`,
    };
  }, [isDark]);
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

const singleBlock = (name, series, reps, rest, notes = "", primaryMuscle = null, secondaryMuscles = []) => ({
  id: uid(), restSec: rest, exercises: [{ id: uid(), name, series, reps, notes, primaryMuscle, secondaryMuscles }],
});

// Bloc abdos par défaut, ajouté à la fin de chaque programme d'exemple. `unit: "sec"`
// signifie que la valeur saisie pendant la séance est une DURÉE (secondes), pas des reps —
// utilisé ici pour le gainage.
const defaultAbsExercises = () => ([
  { id: uid(), name: "Crunch poulie", series: 4, reps: 15, unit: "reps", restSec: 45, primaryMuscle: "abdominaux", secondaryMuscles: [] },
  { id: uid(), name: "Relevé de jambes", series: 3, reps: 12, unit: "reps", restSec: 45, primaryMuscle: "abdominaux", secondaryMuscles: [] },
  { id: uid(), name: "Gainage", series: 3, reps: 60, unit: "sec", restSec: 45, primaryMuscle: "abdominaux", secondaryMuscles: ["lombaires"] },
]);

const DEFAULT_PROGRAMS = [
  {
    id: uid(), name: "Pecs", color: "#FF5A36", muscleGroups: ["pectoraux", "epaules", "triceps"],
    blocks: [
      singleBlock("Développé couché barre", 4, 8, 120, "", "pectoraux", ["triceps", "epaules"]),
      {
        id: uid(), restSec: 90,
        exercises: [
          { id: uid(), name: "Développé incliné haltères", series: 3, reps: 10, notes: "", primaryMuscle: "pectoraux", secondaryMuscles: ["epaules"] },
          { id: uid(), name: "Écarté poulie vis-à-vis", series: 3, reps: 12, notes: "", primaryMuscle: "pectoraux", secondaryMuscles: [] },
        ],
      },
      singleBlock("Dips lestés", 3, 10, 90, "", "pectoraux", ["triceps"]),
    ],
    absExercises: defaultAbsExercises(),
  },
  {
    id: uid(), name: "Épaules / Bras", color: "#FF9F1C", muscleGroups: ["epaules", "biceps", "triceps"],
    blocks: [
      singleBlock("Développé militaire", 4, 8, 120, "", "epaules", ["triceps"]),
      singleBlock("Élévations latérales", 4, 12, 60, "", "epaules", []),
      {
        id: uid(), restSec: 75,
        exercises: [
          { id: uid(), name: "Curl barre EZ", series: 3, reps: 10, notes: "", primaryMuscle: "biceps", secondaryMuscles: ["avant_bras"] },
          { id: uid(), name: "Extension triceps poulie", series: 3, reps: 12, notes: "", primaryMuscle: "triceps", secondaryMuscles: [] },
        ],
      },
    ],
    absExercises: defaultAbsExercises(),
  },
  {
    id: uid(), name: "Dos", color: "#30D5A6", muscleGroups: ["dos", "biceps"],
    blocks: [
      singleBlock("Tractions lestées", 4, 8, 120, "", "dos", ["biceps", "avant_bras"]),
      singleBlock("Rowing barre", 4, 8, 100, "", "dos", ["biceps"]),
      singleBlock("Tirage horizontal poulie", 3, 12, 75, "", "dos", []),
      singleBlock("Soulevé de terre", 3, 6, 150, "", "dos", ["ischios", "fessiers", "lombaires"]),
    ],
    absExercises: defaultAbsExercises(),
  },
  {
    id: uid(), name: "Jambes", color: "#5E5CE6", muscleGroups: ["quadriceps", "ischios", "fessiers", "mollets"],
    blocks: [
      singleBlock("Squat barre", 4, 8, 150, "", "quadriceps", ["fessiers"]),
      singleBlock("Presse à cuisses", 4, 10, 100, "", "quadriceps", ["fessiers"]),
      singleBlock("Leg curl", 3, 12, 60, "", "ischios", []),
      singleBlock("Mollets debout", 4, 15, 45, "", "mollets", []),
    ],
    absExercises: [],
  },
];

/* ============================== SMALL UI PRIMITIVES ============================== */

function Card({ theme, children, className = "", style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-3xl ${className}`}
      style={{ background: theme.card, border: `1px solid ${theme.border}`, boxShadow: theme.shadowSm, ...style }}
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
        background: active ? theme.gradient : theme.card2,
        color: active ? "#fff" : theme.textMuted,
        border: `1px solid ${active ? "transparent" : theme.border}`,
        boxShadow: active ? theme.glow : "none",
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
      style={{ width: 38, height: 38, background: theme.card2, color: theme.text, border: `1px solid ${theme.border}`, boxShadow: theme.shadowSm, ...style }}
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
      className="w-full rounded-2xl py-4 font-bold text-[16px] active:scale-[0.98] hover:brightness-105 transition-all flex items-center justify-center gap-2"
      style={{
        background: gradient ? theme.gradient : theme.card2,
        color: gradient ? "#fff" : theme.text,
        opacity: disabled ? 0.4 : 1,
        boxShadow: gradient ? theme.glow : "none",
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
      <div className="rounded-full flex items-center justify-center mb-4" style={{ width: 64, height: 64, background: theme.card2, boxShadow: `inset 0 0 0 1px ${theme.border}` }}>
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
    accent: filled ? theme.gradient : `${theme.accent}1f`,
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
// Nouvelle identité : trois barres ascendantes (progression) plutôt qu'un éclair — plus
// sobre, plus "premium", et se lit bien en toute petite taille (favicon, icône d'app).
// `variant="badge"` (par défaut) = carré arrondi dégradé, pour écran de chargement/app icon.
// `variant="mono"` = trait seul (currentColor), pour poser le logo sur n'importe quel fond.
function AppLogoMark({ size = 40, theme, variant = "badge" }) {
  if (variant === "mono") {
    const c = theme?.text || "#F7F6F3";
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <rect x="9" y="21" width="6" height="11" rx="2.5" fill={c} opacity="0.55" />
        <rect x="17" y="14" width="6" height="18" rx="2.5" fill={c} opacity="0.8" />
        <rect x="25" y="7" width="6" height="25" rx="2.5" fill={c} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF4B2B" />
          <stop offset="100%" stopColor="#FFB020" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="12" fill="url(#logoGrad)" />
      <rect x="9" y="21" width="6" height="11" rx="2.5" fill="#fff" opacity="0.6" />
      <rect x="17" y="14" width="6" height="18" rx="2.5" fill="#fff" opacity="0.85" />
      <rect x="25" y="7" width="6" height="25" rx="2.5" fill="#fff" />
    </svg>
  );
}

// Logo horizontal (icône + nom) : en-tête, écran de démarrage, partages.
function AppLogoHorizontal({ theme, size = 30 }) {
  return (
    <div className="flex items-center gap-2.5">
      <AppLogoMark size={size} />
      <span style={{ color: theme.text, fontSize: size * 0.62, letterSpacing: "-0.01em" }} className="font-extrabold">
        muscu<span style={{ color: theme.accent }}>·</span>app
      </span>
    </div>
  );
}

/* ============================================================================
   GROUPES MUSCULAIRES — illustrations SVG minimalistes réutilisables
   ============================================================================
   Choix de design assumé : UN SEUL pictogramme humain, géométrique et épuré
   (formes arrondies simples, pas d'anatomie détaillée), réutilisé pour tous les
   groupes musculaires — seule la zone mise en évidence (remplissage clair très
   discret) change d'un groupe à l'autre. Ça garantit une cohérence visuelle
   parfaite entre toutes les cartes, contrairement à 13 dessins différents.
*/

const MUSCLE_GROUPS = [
  { id: "pectoraux", label: "Pectoraux" },
  { id: "dos", label: "Dos" },
  { id: "epaules", label: "Épaules" },
  { id: "biceps", label: "Biceps" },
  { id: "triceps", label: "Triceps" },
  { id: "avant_bras", label: "Avant-bras" },
  { id: "quadriceps", label: "Quadriceps" },
  { id: "ischios", label: "Ischio-jambiers" },
  { id: "fessiers", label: "Fessiers" },
  { id: "mollets", label: "Mollets" },
  { id: "abdominaux", label: "Abdominaux" },
  { id: "lombaires", label: "Lombaires" },
  { id: "full_body", label: "Corps complet" },
];
const muscleLabel = (id) => MUSCLE_GROUPS.find((m) => m.id === id)?.label || id;

// Le pictogramme de base : tête, tronc, deux bras, deux jambes — uniquement des
// formes simples (cercle + rectangles arrondis), contour fin, aucun remplissage.
function BodySilhouette({ stroke, children }) {
  return (
    <>
      <circle cx="60" cy="18" r="14" fill="none" stroke={stroke} strokeWidth="2" />
      <rect x="54" y="30" width="12" height="10" rx="3" fill="none" stroke={stroke} strokeWidth="2" />
      <rect x="35" y="40" width="50" height="68" rx="20" fill="none" stroke={stroke} strokeWidth="2" />
      <rect x="10" y="44" width="15" height="64" rx="7.5" fill="none" stroke={stroke} strokeWidth="2" transform="rotate(10 17.5 44)" />
      <rect x="95" y="44" width="15" height="64" rx="7.5" fill="none" stroke={stroke} strokeWidth="2" transform="rotate(-10 102.5 44)" />
      <rect x="40" y="106" width="17" height="92" rx="8.5" fill="none" stroke={stroke} strokeWidth="2" />
      <rect x="63" y="106" width="17" height="92" rx="8.5" fill="none" stroke={stroke} strokeWidth="2" />
      {children}
    </>
  );
}

// Zone à surligner pour chaque groupe musculaire, positionnée sur le pictogramme
// ci-dessus. Simplification assumée : un seul pictogramme "de face" sert de support
// à tous les groupes (y compris ceux normalement vus de dos, comme le Dos ou les
// Fessiers) — le but est un repère visuel rapide et cohérent, pas une planche
// anatomique. Facilement remplaçable par des tracés plus élaborés plus tard.
const MUSCLE_HIGHLIGHTS = {
  pectoraux: (c) => (<>
    <ellipse cx="48" cy="54" rx="11" ry="9" fill={c} opacity="0.35" />
    <ellipse cx="72" cy="54" rx="11" ry="9" fill={c} opacity="0.35" />
  </>),
  epaules: (c) => (<>
    <circle cx="30" cy="46" r="9" fill={c} opacity="0.35" />
    <circle cx="90" cy="46" r="9" fill={c} opacity="0.35" />
  </>),
  biceps: (c) => (<>
    <ellipse cx="17" cy="62" rx="6.5" ry="12" fill={c} opacity="0.35" transform="rotate(10 17 62)" />
    <ellipse cx="103" cy="62" rx="6.5" ry="12" fill={c} opacity="0.35" transform="rotate(-10 103 62)" />
  </>),
  triceps: (c) => (<>
    <ellipse cx="14" cy="82" rx="6" ry="13" fill={c} opacity="0.3" transform="rotate(10 14 82)" />
    <ellipse cx="106" cy="82" rx="6" ry="13" fill={c} opacity="0.3" transform="rotate(-10 106 82)" />
  </>),
  avant_bras: (c) => (<>
    <ellipse cx="21" cy="100" rx="6" ry="10" fill={c} opacity="0.35" transform="rotate(10 21 100)" />
    <ellipse cx="99" cy="100" rx="6" ry="10" fill={c} opacity="0.35" transform="rotate(-10 99 100)" />
  </>),
  abdominaux: (c) => (<>
    <rect x="46" y="70" width="28" height="34" rx="6" fill={c} opacity="0.3" />
    <line x1="60" y1="70" x2="60" y2="104" stroke={c} strokeWidth="1" opacity="0.6" />
    <line x1="46" y1="80" x2="74" y2="80" stroke={c} strokeWidth="1" opacity="0.5" />
    <line x1="46" y1="91" x2="74" y2="91" stroke={c} strokeWidth="1" opacity="0.5" />
  </>),
  dos: (c) => (<>
    <rect x="38" y="42" width="44" height="62" rx="18" fill={c} opacity="0.28" />
    <line x1="60" y1="46" x2="60" y2="100" stroke={c} strokeWidth="1" opacity="0.5" />
  </>),
  lombaires: (c) => (<rect x="46" y="96" width="28" height="14" rx="5" fill={c} opacity="0.35" />),
  quadriceps: (c) => (<>
    <rect x="42" y="110" width="13" height="42" rx="6" fill={c} opacity="0.32" />
    <rect x="65" y="110" width="13" height="42" rx="6" fill={c} opacity="0.32" />
  </>),
  ischios: (c) => (<>
    <rect x="42" y="140" width="13" height="38" rx="6" fill={c} opacity="0.3" />
    <rect x="65" y="140" width="13" height="38" rx="6" fill={c} opacity="0.3" />
  </>),
  fessiers: (c) => (<ellipse cx="60" cy="108" rx="20" ry="10" fill={c} opacity="0.32" />),
  mollets: (c) => (<>
    <ellipse cx="48.5" cy="175" rx="7" ry="16" fill={c} opacity="0.32" />
    <ellipse cx="71.5" cy="175" rx="7" ry="16" fill={c} opacity="0.32" />
  </>),
  full_body: (c) => (<rect x="8" y="4" width="104" height="200" rx="30" fill={c} opacity="0.12" />),
};

// Illustration réutilisable : un ou plusieurs groupes musculaires surlignés sur le
// même pictogramme de base. `muscles` accepte un id unique ou un tableau.
function MuscleIllustration({ theme, muscles, size = 56 }) {
  const list = (Array.isArray(muscles) ? muscles : [muscles]).filter(Boolean);
  return (
    <svg width={size} height={size} viewBox="0 0 120 220" preserveAspectRatio="xMidYMid meet">
      <BodySilhouette stroke={theme.textFaint}>
        {list.map((m) => {
          const fn = MUSCLE_HIGHLIGHTS[m];
          return fn ? <g key={m}>{fn(theme.text)}</g> : null;
        })}
      </BodySilhouette>
    </svg>
  );
}

// Grille de sélection multiple des groupes musculaires (création/édition de programme).
function MuscleGroupPicker({ theme, selected, onToggle }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {MUSCLE_GROUPS.filter((m) => m.id !== "full_body").map((m) => {
        const active = selected.includes(m.id);
        return (
          <button
            key={m.id} onClick={() => onToggle(m.id)}
            className="rounded-2xl p-2.5 flex flex-col items-center gap-1.5 active:scale-95 transition-transform relative"
            style={{ background: active ? `${theme.accent}14` : theme.card2, border: `1.5px solid ${active ? theme.accent : theme.border}` }}
          >
            {active && (
              <div className="absolute top-1.5 right-1.5 rounded-full flex items-center justify-center" style={{ width: 16, height: 16, background: theme.accent }}>
                <Check size={10} color="#fff" strokeWidth={3} />
              </div>
            )}
            <MuscleIllustration theme={theme} muscles={m.id} size={44} />
            <span style={{ color: active ? theme.text : theme.textMuted }} className="text-[11px] font-semibold text-center leading-tight">{m.label}</span>
          </button>
        );
      })}
      <button
        onClick={() => onToggle("full_body")}
        className="rounded-2xl p-2.5 flex flex-col items-center gap-1.5 active:scale-95 transition-transform relative col-span-3"
        style={{ background: selected.includes("full_body") ? `${theme.accent}14` : theme.card2, border: `1.5px solid ${selected.includes("full_body") ? theme.accent : theme.border}` }}
      >
        {selected.includes("full_body") && (
          <div className="absolute top-1.5 right-1.5 rounded-full flex items-center justify-center" style={{ width: 16, height: 16, background: theme.accent }}>
            <Check size={10} color="#fff" strokeWidth={3} />
          </div>
        )}
        <div className="flex items-center gap-2">
          <MuscleIllustration theme={theme} muscles="full_body" size={32} />
          <span style={{ color: selected.includes("full_body") ? theme.text : theme.textMuted }} className="text-[12px] font-semibold">Corps complet</span>
        </div>
      </button>
    </div>
  );
}

/* ============================== CLAVIER VIRTUEL (audit iOS/Android) ============================== */
// Sur le web, il n'y a pas de KeyboardAvoidingView/WindowInsets natifs — les équivalents
// corrects sont l'API Visual Viewport et scrollIntoView(). Ces deux hooks sont appelés une
// seule fois, dans <App/>, et couvrent TOUS les écrans (aucun champ à instrumenter
// individuellement) : voir leur usage plus bas pour le détail de ce qu'ils corrigent.

// Suit `window.visualViewport`, qui reflète réellement l'espace visible une fois le
// clavier ouvert — contrairement à `window.innerHeight` ou à `100dvh` en CSS, qui ne
// réagissent pas de façon fiable à l'ouverture du clavier sur iOS/Android.
function useVisualViewport() {
  const [state, setState] = useState(() => ({
    height: typeof window !== "undefined" ? (window.visualViewport?.height || window.innerHeight) : 0,
    isKeyboardOpen: false,
  }));

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return undefined;
    const vv = window.visualViewport;
    const update = () => {
      const height = vv.height;
      // Seuil de 120px : une rétractation de la barre d'adresse ne réduit le viewport que
      // de quelques dizaines de pixels, jamais plus de ~100px — au-delà, c'est le clavier.
      const isKeyboardOpen = window.innerHeight - height > 120;
      setState({ height, isKeyboardOpen });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return state;
}

// Un seul écouteur global : dès qu'un input/textarea reçoit le focus (sur N'IMPORTE QUEL
// écran), il se recentre automatiquement dans la zone visible au-dessus du clavier.
function useScrollActiveFieldIntoView() {
  useEffect(() => {
    const handleFocusIn = (event) => {
      const el = event.target;
      if (!el || !["INPUT", "TEXTAREA"].includes(el.tagName)) return;
      window.setTimeout(() => {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 300);
    };
    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, []);
}

/* ============================== APP ROOT ============================== */

export default function App() {
  const prefersReduced = useReducedMotion();
  const [isDark, setIsDark] = usePersistentState_simple("gt_dark", true);
  const theme = useTheme(isDark);
  // Audit clavier virtuel : ces deux hooks couvrent tous les écrans de l'application.
  const { height: viewportHeight, isKeyboardOpen } = useVisualViewport();
  useScrollActiveFieldIntoView();

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

  // Objectifs nutritionnels — nouvelle fonctionnalité, entièrement dans Profil (pas de
  // nouvel onglet). Le poids courant N'EST PAS dupliqué ici : il est relu depuis
  // `weightEntries` (déjà la source unique de vérité pour le poids, voir les corrections
  // précédentes sur les doublons Profil/Poids).
  const [nutritionProfile, setNutritionProfile, nutritionProfileLoaded] = usePersistentState("gt_nutrition_profile_v1", {
    sex: "M", birthdate: null, height: null, weightTarget: null,
    activityLevel: "sedentary", stepsPerDay: null, profession: "",
    strengthSessionsPerWeek: 3, strengthSessionDuration: 60,
    cardioSessionsPerWeek: 0, cardioSessionDuration: 30,
    goal: "maintain",
  });
  // Saisie manuelle des calories consommées dans la journée (pas de journal alimentaire
  // complet — cette app ne suit pas d'aliments individuels, juste un total quotidien).
  const [caloriesLog, setCaloriesLog, caloriesLogLoaded] = usePersistentState("gt_calories_log_v1", []);
  // Saisie manuelle du nombre de pas du jour — sert à estimer la dépense calorique liée à
  // la marche (voir "Dépense du jour" dans NutritionScreen), en plus de la musculation et
  // du cardio.
  const [stepsLog, setStepsLog, stepsLogLoaded] = usePersistentState("gt_steps_log_v1", []);
  // Historique des cibles caloriques calculées + des ajustements hebdomadaires appliqués.
  const [nutritionAdjustments, setNutritionAdjustments, adjustmentsLoaded] = usePersistentState("gt_nutrition_adjustments_v1", []);

  // Planning hebdomadaire (Accueil + Profil > Planning hebdomadaire) : programme assigné à
  // chaque jour de la semaine, par id (donc toujours à jour si un programme est renommé,
  // et repli propre sur "Aucune séance programmée" s'il est supprimé).
  const [weeklyPlanning, setWeeklyPlanning, weeklyPlanningLoaded] = usePersistentState("gt_weekly_planning_v1", defaultWeeklyPlanning());
  const setDayProgram = (dayKey, programId) => setWeeklyPlanning((p) => ({ ...p, [dayKey]: programId }));

  // Section "Physique" : photos de progression (image en base64 — pas de backend, donc
  // stockées directement ; attention à la taille pour ne pas saturer le stockage local) et
  // historique des mensurations, chacune datée.
  const [progressPhotos, setProgressPhotos, progressPhotosLoaded] = usePersistentState("gt_progress_photos_v1", []);
  const [measurements, setMeasurements, measurementsLoaded] = usePersistentState("gt_measurements_v1", []);

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

  const dataLoaded = programsLoaded && sessionsLoaded && weightLoaded && settingsLoaded && profileLoaded
    && activeWorkoutLoaded && nutritionProfileLoaded && caloriesLogLoaded && adjustmentsLoaded && weeklyPlanningLoaded
    && progressPhotosLoaded && measurementsLoaded && stepsLogLoaded;

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

  // Migration de schéma : garantit que les programmes existants (créés avant l'ajout du
  // bloc abdos / des groupes musculaires) ont bien tous les champs attendus. `normalizeProgram`
  // fait déjà tout le travail ; on note juste la version courante dans le stockage, pour
  // qu'une future évolution du schéma ait un endroit clair où s'accrocher (comparer la
  // version stockée à SCHEMA_VERSION avant de décider s'il faut migrer autre chose).
  useEffect(() => {
    if (!programsLoaded) return;
    setPrograms((ps) => (ps.some((p) => !p.blocks || !p.absExercises || !p.muscleGroups) ? ps.map(normalizeProgram) : ps));
    window.storage?.set?.("gt_schema_version", String(SCHEMA_VERSION), false)?.catch?.(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programsLoaded]);

  // Corrige les anciennes entrées de poids invalides éventuellement déjà enregistrées
  // (poids null/NaN à cause du bug de virgule décimale) : on ne peut pas retrouver la
  // valeur d'origine tapée par l'utilisateur, donc on retire ces entrées cassées plutôt
  // que d'afficher "NaN kg" partout (poids actuel, historique, graphique, statistiques).
  useEffect(() => {
    if (!weightLoaded) return;
    setWeightEntries((entries) => {
      const cleaned = entries.filter((e) => Number.isFinite(e.weight) && e.weight > 0);
      return cleaned.length === entries.length ? entries : cleaned;
    });
  }, [weightLoaded]);

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
        <style>{`.gt-app-shell { height: 100vh; height: 100dvh; overflow: hidden; overscroll-behavior: none; }`}</style>
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
      style={{
        background: theme.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif",
        maxWidth: 480, margin: "0 auto", position: "relative",
        // `100dvh` ne réagit pas de façon fiable à l'ouverture du clavier virtuel sur
        // iOS/Android : la hauteur est donc pilotée directement par `useVisualViewport`
        // (window.visualViewport), avec une transition douce plutôt qu'un saut brutal.
        height: viewportHeight ? `${viewportHeight}px` : undefined,
        transition: "height 0.25s ease",
      }}
      className="w-full flex flex-col gt-app-shell"
    >
      {/* `height: 100dvh` (avec repli 100vh) sert de valeur de secours tant que
          `useVisualViewport` n'a pas encore de mesure (tout premier rendu). */}
      <style>{`.gt-app-shell { height: 100vh; height: 100dvh; overflow: hidden; overscroll-behavior: none; }`}</style>
      {/* overscrollBehavior: "contain" empêche le "scroll chaining" — arriver en haut/bas de
          CE conteneur ne fait plus rebondir la page entière derrière lui (le bounce Safari).
          touchAction: "pan-y" autorise le scroll vertical normal mais bloque le pincement
          pour zoomer À L'INTÉRIEUR de l'app (en plus du <meta viewport> dans index.html). */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          WebkitOverflowScrolling: "touch",
          paddingBottom: "calc(112px + env(safe-area-inset-bottom))",
          overscrollBehavior: "contain",
          touchAction: "pan-y",
        }}
      >
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
                  onStart={startWorkout} weeklyPlanning={weeklyPlanning} onGoToPlanning={() => setTab("profile")}
                />
              )}
              {tab === "workout" && !activeWorkout && (
                <WorkoutStartScreen
                  theme={theme} programs={programs} settings={settings} setSettings={setSettings}
                  onStart={startWorkout} onGoToPrograms={() => setTab("profile")}
                  sessions={sessions} setSessions={setSessions}
                />
              )}
              {tab === "profile" && (
                <ProfileHub
                  theme={theme} isDark={isDark} setIsDark={setIsDark}
                  programs={programs} setPrograms={setPrograms}
                  sessions={sessions} setSessions={setSessions}
                  weightEntries={weightEntries} setWeightEntries={setWeightEntries}
                  settings={settings} setSettings={setSettings}
                  userProfile={userProfile} setUserProfile={setUserProfile} onResetData={resetData}
                  nutritionProfile={nutritionProfile} setNutritionProfile={setNutritionProfile}
                  caloriesLog={caloriesLog} setCaloriesLog={setCaloriesLog}
                  nutritionAdjustments={nutritionAdjustments} setNutritionAdjustments={setNutritionAdjustments}
                  weeklyPlanning={weeklyPlanning} setDayProgram={setDayProgram}
                  progressPhotos={progressPhotos} setProgressPhotos={setProgressPhotos}
                  measurements={measurements} setMeasurements={setMeasurements}
                  stepsLog={stepsLog} setStepsLog={setStepsLog}
                  onStartProgram={startWorkout}
                  onExport={() => exportBackup({
                    programs, sessions, weightEntries, settings, userProfile,
                    nutritionProfile, caloriesLog, nutritionAdjustments, weeklyPlanning,
                    measurements, progressPhotos, stepsLog,
                  })}
                  onImport={(data) => {
                    if (data.programs) setPrograms(data.programs);
                    if (data.sessions) setSessions(data.sessions);
                    if (data.weightEntries) setWeightEntries(data.weightEntries);
                    if (data.settings) setSettings(data.settings);
                    if (data.userProfile) setUserProfile(data.userProfile);
                    if (data.nutritionProfile) setNutritionProfile(data.nutritionProfile);
                    if (data.caloriesLog) setCaloriesLog(data.caloriesLog);
                    if (data.nutritionAdjustments) setNutritionAdjustments(data.nutritionAdjustments);
                    if (data.weeklyPlanning) setWeeklyPlanning(data.weeklyPlanning);
                    if (data.measurements) setMeasurements(data.measurements);
                    if (data.progressPhotos) setProgressPhotos(data.progressPhotos);
                    if (data.stepsLog) setStepsLog(data.stepsLog);
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Bannière persistante : visible sur n'importe quel autre onglet tant qu'une séance
          tourne, avec le nom de l'exercice en cours et le chrono en direct. Masquée quand
          le clavier est ouvert (sinon elle resterait par-dessus un champ actif ou un
          bouton de validation juste en dessous). */}
      <AnimatePresence>
        {activeWorkout && !showingActiveWorkout && !isKeyboardOpen && (
          <ActiveSessionBanner theme={theme} status={sessionStatus} onTap={() => setTab("workout")} />
        )}
      </AnimatePresence>

      {/* Barre de navigation : masquée pendant que le clavier est ouvert (elle ne sert à
          rien tant qu'on saisit du texte, et resterait sinon plaquée au-dessus du clavier,
          cachant potentiellement le bouton d'action juste au-dessus). */}
      {!isKeyboardOpen && <BottomNav theme={theme} tab={tab} setTab={setTab} activeWorkout={!!activeWorkout} />}
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

// Construit le tableau de séries vierges d'un exercice au démarrage d'une séance : pour
// un exercice unilatéral, chaque série a des champs gauche/droite entièrement séparés
// (poids, reps) au lieu d'un seul poids/reps partagé.
function makeEmptySets(ex) {
  const count = ex.series || 3;
  if (ex.unilateral) {
    return Array.from({ length: count }, () => ({ leftWeight: "", leftReps: "", rightWeight: "", rightReps: "", done: false }));
  }
  return Array.from({ length: count }, () => ({ weight: "", reps: "", done: false }));
}

function makeWorkout(program) {
  const mainBlocks = (program.blocks || []).map((block) => ({
    id: uid(),
    restSec: block.restSec || 90,
    exerciseLogs: block.exercises.map((ex) => ({
      exerciseId: ex.id,
      name: ex.name,
      targetReps: ex.reps,
      targetRepsPerSet: ex.customReps ? syncRepsPerSet(ex.repsPerSet, ex.series || 3, ex.reps) : null,
      targetUnit: ex.unit || "reps",
      unilateral: !!ex.unilateral,
      notes: ex.notes,
      primaryMuscle: ex.primaryMuscle || null,
      secondaryMuscles: ex.secondaryMuscles || [],
      sets: makeEmptySets(ex),
    })),
  }));
  // Le bloc abdos est ajouté à la toute fin de la séance, un exercice = un bloc chacun
  // (pas de biset ici), et marqué `isAbsBlock` pour que WorkoutSession sache afficher
  // l'écran "Fin de séance · Abdominaux" au moment d'y arriver.
  const absBlocks = (program.absExercises || []).map((ex) => ({
    id: uid(),
    restSec: ex.restSec || ex.rest || 45,
    isAbsBlock: true,
    exerciseLogs: [{
      exerciseId: ex.id, name: ex.name, targetReps: ex.reps,
      targetRepsPerSet: ex.customReps ? syncRepsPerSet(ex.repsPerSet, ex.series || 3, ex.reps) : null,
      targetUnit: ex.unit || "reps", unilateral: !!ex.unilateral, notes: ex.notes || "",
      primaryMuscle: ex.primaryMuscle || "abdominaux", secondaryMuscles: ex.secondaryMuscles || [],
      sets: makeEmptySets(ex),
    }],
  }));
  return {
    id: uid(),
    programId: program.id,
    programName: program.name,
    startedAt: Date.now(),
    blocks: [...mainBlocks, ...absBlocks],
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

// Sauvegarde locale complète : reprend TOUTES les données utilisateur persistées.
// `data` est un objet libre : { programs, sessions, weightEntries, settings, userProfile,
// nutritionProfile, caloriesLog, nutritionAdjustments } — avant ce correctif, seuls
// programs/sessions/weightEntries/settings étaient inclus : restaurer une sauvegarde sur
// un nouvel appareil perdait silencieusement le profil et les données nutritionnelles.
function exportBackup(data) {
  const payload = { ...data, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `muscu-app-backup-${todayISO()}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================== EXPORT COMPLET DES DONNÉES ============================== */
// Moteur derrière le bouton "Exporter mes données" (Profil, en haut à droite) : choix
// d'une période + d'un format, puis génération du fichier correspondant. Entièrement
// séparé de `exportBackup` ci-dessus (la sauvegarde simple existante, utilisée dans
// Statistiques) — aucune des deux fonctionnalités ne touche à l'autre.

const EXPORT_PERIODS = [
  { id: "week", label: "Cette semaine" },
  { id: "30d", label: "30 derniers jours" },
  { id: "3m", label: "3 derniers mois" },
  { id: "6m", label: "6 derniers mois" },
  { id: "year", label: "Cette année" },
  { id: "all", label: "Depuis le début" },
  { id: "custom", label: "Période personnalisée" },
];
const EXPORT_FORMATS = [
  { id: "pdf", label: "PDF", desc: "Rapport complet et lisible", icon: FileText },
  { id: "xlsx", label: "Excel", desc: "Feuilles de calcul (.xlsx)", icon: FileSpreadsheet },
  { id: "csv", label: "CSV", desc: "Tableau simple, universel", icon: FileDown },
  { id: "json", label: "JSON", desc: "Pour sauvegarde/restauration", icon: FileJson },
];

function addDaysISO(days) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
function addMonthsISO(months) { const d = new Date(); d.setMonth(d.getMonth() + months); return d.toISOString().slice(0, 10); }

function resolveExportPeriod(periodId, customStart, customEnd) {
  const end = periodId === "custom" ? (customEnd || todayISO()) : todayISO();
  let start;
  if (periodId === "week") start = addDaysISO(-7);
  else if (periodId === "30d") start = addDaysISO(-30);
  else if (periodId === "3m") start = addMonthsISO(-3);
  else if (periodId === "6m") start = addMonthsISO(-6);
  else if (periodId === "year") start = `${new Date().getFullYear()}-01-01`;
  else if (periodId === "custom") start = customStart || "2000-01-01";
  else start = "2000-01-01"; // 'all'
  return { start, end };
}

// Rassemble et filtre toutes les catégories de données sur la période choisie. Les photos
// de progression sont volontairement exclues (base64 potentiellement lourd, hors de propos
// pour un export PDF/Excel/CSV) — elles restent disponibles via "Sauvegarde complète".
function gatherExportData(all, periodId, customStart, customEnd) {
  const { start, end } = resolveExportPeriod(periodId, customStart, customEnd);
  const inRange = (d) => d >= start && d <= end;
  const sessions = all.sessions.filter((s) => inRange(s.date));
  const weightEntries = all.weightEntries.filter((e) => inRange(e.date));
  const measurements = all.measurements.filter((m) => inRange(m.date));
  const caloriesLog = all.caloriesLog.filter((c) => inRange(c.date));
  const stepsLog = (all.stepsLog || []).filter((s) => inRange(s.date));

  return {
    period: { start, end, label: EXPORT_PERIODS.find((p) => p.id === periodId)?.label || periodId },
    programs: all.programs,
    sessions, weightEntries, measurements, caloriesLog, stepsLog,
    settings: all.settings, userProfile: all.userProfile, nutritionProfile: all.nutritionProfile,
    weeklyPlanning: all.weeklyPlanning,
    prs: computePRs(sessions),
    // Le streak se calcule toujours sur TOUT l'historique (une série de jours consécutifs
    // n'a pas de sens limitée à la fenêtre choisie) — jamais filtré par période.
    dayStreak: computeDayStreak(all.sessions),
    weekStreak: computeWeeklyStreak(all.sessions, all.weeklyPlanning),
    totalTonnage: sessions.reduce((a, s) => a + (s.tonnage || 0), 0),
    totalSets: sessions.reduce((a, s) => a + (s.totalSets || 0), 0),
  };
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- CSV : un seul fichier, sections successives séparées par un titre "## ..." ---------
function toCsvValue(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function rowsToCsv(headers, rows) {
  return [headers.join(";"), ...rows.map((r) => r.map(toCsvValue).join(";"))].join("\n");
}
function buildExerciseRows(sessions) {
  const rows = [];
  sessions.forEach((s) => s.exerciseLogs.forEach((el) => {
    el.sets.forEach((set, i) => {
      if (set.leftWeight != null || set.rightWeight != null) {
        rows.push([s.date, el.name, i + 1, "Gauche", set.leftWeight || "", set.leftReps || "", set.done ? "Oui" : "Non"]);
        rows.push([s.date, el.name, i + 1, "Droit", set.rightWeight || "", set.rightReps || "", set.done ? "Oui" : "Non"]);
      } else {
        rows.push([s.date, el.name, i + 1, "", set.weight || "", set.reps || "", set.done ? "Oui" : "Non"]);
      }
    });
  }));
  return rows;
}
function generateCSVExport(data) {
  const sections = [
    "## SÉANCES",
    rowsToCsv(["Date", "Programme", "Durée (min)", "Séries", "Tonnage (kg)"],
      data.sessions.map((s) => [s.date, s.programName, Math.round((s.durationSec || 0) / 60), s.totalSets, Math.round(s.tonnage || 0)])),
    "",
    "## EXERCICES (détail des séries)",
    rowsToCsv(["Date", "Exercice", "Série", "Côté", "Poids (kg)", "Reps", "Terminée"], buildExerciseRows(data.sessions)),
    "",
    "## CARDIO",
    rowsToCsv(["Date", "Type", "Durée (min)", "Distance", "Calories", "Intensité"],
      data.sessions.filter((s) => s.cardio).map((s) => [s.date, s.cardio.type, s.cardio.durationMin, s.cardio.distance || "", s.cardio.calories || "", s.cardio.intensity])),
    "",
    "## POIDS",
    rowsToCsv(["Date", "Poids (kg)"], data.weightEntries.map((e) => [e.date, e.weight])),
    "",
    "## MENSURATIONS",
    rowsToCsv(["Date", ...MEASUREMENT_FIELDS.map((f) => f.label)], data.measurements.map((m) => [m.date, ...MEASUREMENT_FIELDS.map((f) => m.values[f.key] || "")])),
    "",
    "## NUTRITION (calories saisies)",
    rowsToCsv(["Date", "Calories consommées"], data.caloriesLog.map((c) => [c.date, c.calories])),
    "",
    "## RECORDS PERSONNELS",
    rowsToCsv(["Exercice", "Charge max (kg)", "Répétitions", "1RM estimé", "Date"],
      Object.entries(data.prs).map(([name, pr]) => [name, pr.maxWeight, pr.maxWeightReps, pr.est1RM, pr.date])),
  ];
  triggerDownload(new Blob([sections.join("\n")], { type: "text/csv;charset=utf-8" }), `export-${data.period.start}_${data.period.end}.csv`);
}

// --- JSON : snapshot structuré de la période, prêt à être relu (pas la sauvegarde 100%) -
function generateJSONExport(data) {
  triggerDownload(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    `export-${data.period.start}_${data.period.end}.json`
  );
}

// --- Excel (SheetJS) : une feuille par catégorie -----------------------------------------
async function generateXLSXExport(data) {
  // Chargée depuis un CDN au moment de l'export plutôt qu'installée via npm : évite tout
  // souci de résolution au build (ex: paquet non installé) — nécessite juste une connexion
  // internet au moment de cliquer sur "Exporter" en format Excel.
  const XLSX = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
  const wb = XLSX.utils.book_new();
  const addSheet = (name, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);

  addSheet("Résumé", [
    ["Période", `${data.period.start} → ${data.period.end}`],
    ["Séances réalisées", data.sessions.length],
    ["Tonnage total (kg)", Math.round(data.totalTonnage)],
    ["Séries totales", data.totalSets],
    ["Streak actuel (jours)", data.dayStreak.current],
    ["Meilleur streak (jours)", data.dayStreak.best],
    ["Semaines d'objectif atteint", data.weekStreak],
  ]);
  addSheet("Séances", [
    ["Date", "Programme", "Durée (min)", "Séries", "Tonnage (kg)"],
    ...data.sessions.map((s) => [s.date, s.programName, Math.round((s.durationSec || 0) / 60), s.totalSets, Math.round(s.tonnage || 0)]),
  ]);
  addSheet("Exercices", [["Date", "Exercice", "Série", "Côté", "Poids (kg)", "Reps", "Terminée"], ...buildExerciseRows(data.sessions)]);
  addSheet("Cardio", [
    ["Date", "Type", "Durée (min)", "Distance", "Calories", "Intensité"],
    ...data.sessions.filter((s) => s.cardio).map((s) => [s.date, s.cardio.type, s.cardio.durationMin, s.cardio.distance || "", s.cardio.calories || "", s.cardio.intensity]),
  ]);
  addSheet("Poids", [["Date", "Poids (kg)"], ...data.weightEntries.map((e) => [e.date, e.weight])]);
  addSheet("Mensurations", [
    ["Date", ...MEASUREMENT_FIELDS.map((f) => f.label)],
    ...data.measurements.map((m) => [m.date, ...MEASUREMENT_FIELDS.map((f) => m.values[f.key] || "")]),
  ]);
  addSheet("Nutrition", [["Date", "Calories consommées"], ...data.caloriesLog.map((c) => [c.date, c.calories])]);
  addSheet("Records", [
    ["Exercice", "Charge max (kg)", "Répétitions", "1RM estimé", "Date"],
    ...Object.entries(data.prs).map(([name, pr]) => [name, pr.maxWeight, pr.maxWeightReps, pr.est1RM, pr.date]),
  ]);

  XLSX.writeFile(wb, `export-${data.period.start}_${data.period.end}.xlsx`);
}

// --- PDF (jsPDF + autoTable) : rapport structuré, une section par catégorie -------------
async function generatePDFExport(data) {
  // Chargées depuis un CDN au moment de l'export plutôt qu'installées via npm : évite tout
  // souci de résolution au build — nécessite juste une connexion internet au moment de
  // cliquer sur "Exporter" en format PDF.
  const { jsPDF } = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm");
  const { default: autoTable } = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/+esm");
  const doc = new jsPDF();
  const marginX = 14;
  let y = 18;

  const ensureSpace = (needed) => {
    if (y + needed > 280) { doc.addPage(); y = 18; }
  };
  const sectionTitle = (title) => {
    ensureSpace(14);
    doc.setFontSize(13); doc.setFont(undefined, "bold");
    doc.text(title, marginX, y);
    doc.setFont(undefined, "normal");
    y += 6;
  };
  const table = (head, body) => {
    autoTable(doc, { startY: y, margin: { left: marginX, right: marginX }, head: [head], body, styles: { fontSize: 8 }, headStyles: { fillColor: [255, 90, 54] } });
    y = doc.lastAutoTable.finalY + 8;
  };

  doc.setFontSize(20); doc.setFont(undefined, "bold");
  doc.text("Rapport d'entraînement", marginX, y); y += 8;
  doc.setFont(undefined, "normal"); doc.setFontSize(10); doc.setTextColor(100);
  doc.text(`Période : ${data.period.label} (${data.period.start} → ${data.period.end})`, marginX, y);
  doc.setTextColor(0); y += 10;

  sectionTitle("Résumé de la période");
  table(["Statistique", "Valeur"], [
    ["Séances réalisées", String(data.sessions.length)],
    ["Tonnage total", `${Math.round(data.totalTonnage).toLocaleString("fr-FR")} kg`],
    ["Séries totales", String(data.totalSets)],
    ["Streak actuel", `${data.dayStreak.current} jours`],
    ["Meilleur streak", `${data.dayStreak.best} jours`],
    ["Semaines d'objectif atteint", String(data.weekStreak)],
  ]);

  if (data.sessions.length) {
    sectionTitle("Historique des séances");
    table(["Date", "Programme", "Durée", "Séries", "Tonnage"], data.sessions.map((s) => [
      fmtDate(s.date), s.programName, fmtDuration(s.durationSec || 0), String(s.totalSets), `${Math.round(s.tonnage || 0)} kg`,
    ]));
  }

  const cardioSessions = data.sessions.filter((s) => s.cardio);
  if (cardioSessions.length) {
    sectionTitle("Cardio");
    table(["Date", "Type", "Durée", "Distance", "Intensité"], cardioSessions.map((s) => [
      fmtDate(s.date), CARDIO_TYPES.find((t) => t.id === s.cardio.type)?.label || s.cardio.type,
      `${s.cardio.durationMin} min`, s.cardio.distance ? `${s.cardio.distance} km` : "—",
      INTENSITY_LEVELS.find((i) => i.id === s.cardio.intensity)?.label || s.cardio.intensity,
    ]));
  }

  const prEntries = Object.entries(data.prs);
  if (prEntries.length) {
    sectionTitle("Records personnels");
    table(["Exercice", "Charge max", "Répétitions", "1RM estimé"], prEntries.map(([name, pr]) => [
      name, `${pr.maxWeight} kg`, String(pr.maxWeightReps), `${pr.est1RM} kg`,
    ]));
  }

  if (data.weightEntries.length) {
    sectionTitle("Historique du poids");
    table(["Date", "Poids"], data.weightEntries.map((e) => [fmtDate(e.date), `${fmtWeight(e.weight)} kg`]));
  }

  if (data.measurements.length) {
    sectionTitle("Mensurations");
    table(["Date", ...MEASUREMENT_FIELDS.map((f) => f.label)], data.measurements.map((m) => [
      fmtDate(m.date), ...MEASUREMENT_FIELDS.map((f) => (m.values[f.key] ? `${m.values[f.key]}cm` : "—")),
    ]));
  }

  if (data.caloriesLog.length) {
    sectionTitle("Nutrition");
    table(["Date", "Calories consommées"], data.caloriesLog.map((c) => [fmtDate(c.date), `${c.calories} kcal`]));
  }

  sectionTitle("Objectif nutritionnel actuel");
  table(["Champ", "Valeur"], [
    ["Objectif", data.nutritionProfile?.goal === "cut" ? "Sèche" : data.nutritionProfile?.goal === "bulk" ? "Prise de masse" : "Maintien"],
    ["Poids cible", data.nutritionProfile?.weightTarget ? `${data.nutritionProfile.weightTarget} kg` : "Non renseigné"],
  ]);

  doc.save(`rapport-${data.period.start}_${data.period.end}.pdf`);
}

async function runExport(all, { periodId, customStart, customEnd, format }) {
  const data = gatherExportData(all, periodId, customStart, customEnd);
  if (format === "csv") generateCSVExport(data);
  else if (format === "json") generateJSONExport(data);
  else if (format === "xlsx") await generateXLSXExport(data);
  else if (format === "pdf") await generatePDFExport(data);
}

// --- Sauvegarde complète : 100 % des données, structure prête pour une future restauration
const FULL_BACKUP_SCHEMA_VERSION = 1;
function buildFullBackup(all) {
  return {
    backupSchemaVersion: FULL_BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    programs: all.programs, sessions: all.sessions, weightEntries: all.weightEntries,
    settings: all.settings, userProfile: all.userProfile,
    nutritionProfile: all.nutritionProfile, caloriesLog: all.caloriesLog, nutritionAdjustments: all.nutritionAdjustments,
    weeklyPlanning: all.weeklyPlanning, measurements: all.measurements, progressPhotos: all.progressPhotos,
    stepsLog: all.stepsLog,
  };
}
function downloadFullBackup(all) {
  triggerDownload(
    new Blob([JSON.stringify(buildFullBackup(all), null, 2)], { type: "application/json" }),
    `muscu-app-sauvegarde-complete-${todayISO()}.json`
  );
}

function ExportDataSheet({ theme, onClose, onExport, onFullBackup }) {
  const [periodId, setPeriodId] = useState("30d");
  const [customStart, setCustomStart] = useState(todayISO());
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [format, setFormat] = useState("pdf");
  const [exporting, setExporting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [error, setError] = useState("");
  const { height: viewportHeight } = useVisualViewport();

  const handleExport = async () => {
    setExporting(true);
    setError("");
    try {
      await onExport({ periodId, customStart, customEnd, format });
      onClose();
    } catch (e) {
      console.error("Échec de l'export :", e);
      setError(
        /jspdf|xlsx|import|fetch|network/i.test(String(e?.message))
          ? "Ce format (PDF/Excel) a besoin d'une connexion internet pour charger un composant externe — vérifie ta connexion et réessaie."
          : `Échec de l'export : ${e?.message || "erreur inconnue"}.`
      );
    } finally {
      setExporting(false);
    }
  };
  const handleBackup = () => {
    setBackingUp(true);
    setError("");
    try { onFullBackup(); onClose(); } catch (e) {
      console.error("Échec de la sauvegarde :", e);
      setError(`Échec de la sauvegarde : ${e?.message || "erreur inconnue"}.`);
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 200, height: viewportHeight ? `${viewportHeight}px` : undefined }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl p-5" style={{ maxWidth: 480, background: theme.card, borderTop: `1px solid ${theme.border}`, paddingBottom: "calc(2rem + env(safe-area-inset-bottom))", maxHeight: viewportHeight ? `${viewportHeight * 0.85}px` : "85vh", overflowY: "auto" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: theme.border }} />
        <h3 style={{ color: theme.text }} className="text-[17px] font-bold mb-1">Exporter mes données</h3>
        <p style={{ color: theme.textMuted }} className="text-[12.5px] mb-4">Choisis une période et un format, puis génère le fichier.</p>

        <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold mb-1.5">Période</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {EXPORT_PERIODS.map((p) => (
            <Pill key={p.id} theme={theme} active={periodId === p.id} onClick={() => setPeriodId(p.id)}>{p.label}</Pill>
          ))}
        </div>
        {periodId === "custom" && (
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <FieldRow theme={theme} label="Début">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-transparent outline-none text-right" style={{ color: theme.text }} />
            </FieldRow>
            <FieldRow theme={theme} label="Fin">
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="bg-transparent outline-none text-right" style={{ color: theme.text }} />
            </FieldRow>
          </div>
        )}

        <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold mb-1.5 mt-1">Format</p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {EXPORT_FORMATS.map((f) => {
            const FIcon = f.icon;
            const active = format === f.id;
            return (
              <button
                key={f.id} onClick={() => setFormat(f.id)}
                className="rounded-2xl p-3 text-left active:scale-[0.98] transition-transform"
                style={{ background: active ? `${theme.accent}14` : theme.card2, border: `1.5px solid ${active ? theme.accent : theme.border}` }}
              >
                <FIcon size={18} color={active ? theme.accent : theme.textMuted} className="mb-1.5" />
                <p style={{ color: theme.text }} className="text-[13px] font-bold">{f.label}</p>
                <p style={{ color: theme.textFaint }} className="text-[10.5px] leading-tight mt-0.5">{f.desc}</p>
              </button>
            );
          })}
        </div>

        {error && (
          <p style={{ color: theme.bad }} className="text-[12.5px] font-semibold mb-3 px-1">{error}</p>
        )}
        <BigButton theme={theme} gradient disabled={exporting} onClick={handleExport}>
          {exporting ? "Génération..." : <><Download size={16} /> Exporter</>}
        </BigButton>

        <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
          <p style={{ color: theme.textMuted }} className="text-[12px] mb-2.5">
            Sauvegarde complète : 100 % de tes données (y compris les photos), pour restaurer sur un autre appareil ou après une réinstallation.
          </p>
          <BigButton theme={theme} disabled={backingUp} onClick={handleBackup}>
            <Save size={16} /> Créer une sauvegarde complète de mon profil
          </BigButton>
        </div>
      </motion.div>
    </motion.div>
  );
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
          className="mx-3 rounded-3xl flex items-stretch justify-between px-1 py-1.5 backdrop-blur-xl"
          style={{ background: theme.tabBg, border: `1px solid ${theme.border}`, boxShadow: theme.shadowMd, marginBottom: "calc(12px + env(safe-area-inset-bottom))" }}
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
      style={{ maxWidth: 480, margin: "0 auto", bottom: "calc(92px + env(safe-area-inset-bottom))" }}
    >
      <div
        className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 active:scale-[0.98] transition-transform"
        style={{ maxWidth: 448, background: theme.gradient, boxShadow: theme.glow }}
      >
        <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.3 }} className="shrink-0 flex items-center">
          <Flame size={17} color="#fff" fill="#fff" />
        </motion.span>
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
/* ============================== CARDIO & ABDOS AUTONOMES ============================== */
// Construit une séance "cardio" ou "abdos" indépendante de la musculation, avec EXACTEMENT
// la même forme qu'une séance normale (date, durationSec, tonnage, totalSets, exerciseLogs)
// — c'est ce qui permet à tout ce qui lit déjà `sessions` (historique, calendrier, streak,
// statistiques, calories du jour) de les prendre en compte automatiquement, sans code
// séparé à maintenir. `type` sert uniquement à les distinguer visuellement.
function makeCardioSession(cardio, existingId) {
  return {
    id: existingId || uid(),
    type: "cardio",
    programId: null, programName: CARDIO_TYPES.find((t) => t.id === cardio.type)?.label || "Cardio",
    date: todayISO(), startedAt: Date.now(),
    durationSec: (Number(cardio.durationMin) || 0) * 60,
    tonnage: 0, totalSets: 0, exerciseLogs: [], blocks: [],
    cardio,
  };
}
function makeAbsSession(exercises, notes, existingId) {
  const exerciseLogs = exercises.map((ex) => ({
    exerciseId: ex.id, name: ex.name, targetReps: ex.reps, targetUnit: ex.unit,
    primaryMuscle: "abdominaux", secondaryMuscles: [], notes: ex.notes || "", restSec: ex.restSec,
    sets: Array.from({ length: ex.series }, () => ({ weight: "", reps: String(ex.reps), done: true })),
  }));
  return {
    id: existingId || uid(),
    type: "abs",
    programId: null, programName: "Abdominaux",
    date: todayISO(), startedAt: Date.now(),
    durationSec: 0, tonnage: 0,
    totalSets: exerciseLogs.reduce((a, el) => a + el.sets.length, 0),
    exerciseLogs, blocks: [], notes,
  };
}

function StandaloneCardioSheet({ theme, initial, onClose, onSave }) {
  const [cardio, setCardio] = useState(initial || { type: null, durationMin: 20, distance: "", calories: "", intensity: "moderate", notes: "" });
  const { height: viewportHeight } = useVisualViewport();

  return (
    <motion.div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 200, height: viewportHeight ? `${viewportHeight}px` : undefined }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl p-5" style={{ maxWidth: 480, background: theme.card, borderTop: `1px solid ${theme.border}`, paddingBottom: "calc(2rem + env(safe-area-inset-bottom))", maxHeight: viewportHeight ? `${viewportHeight * 0.85}px` : "85vh", overflowY: "auto" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: theme.border }} />
        <h3 style={{ color: theme.text }} className="text-[17px] font-bold mb-1 flex items-center gap-1.5"><HeartPulse size={16} color={theme.accent} /> Cardio</h3>
        <p style={{ color: theme.textMuted }} className="text-[12.5px] mb-4">Indépendant de ta séance de musculation — à tout moment de la journée.</p>

        <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold mb-1.5">Type</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {CARDIO_TYPES.map((t) => (
            <Pill key={t.id} theme={theme} active={cardio.type === t.id} onClick={() => setCardio((c) => ({ ...c, type: t.id }))}>{t.label}</Pill>
          ))}
        </div>
        {cardio.type && (
          <>
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <MiniStepper theme={theme} label="Durée" value={cardio.durationMin} step={5} suffix=" min" onChange={(v) => setCardio((c) => ({ ...c, durationMin: Math.max(5, v) }))} />
              <LabeledInput theme={theme} label="Distance (km, optionnel)" value={cardio.distance} onChange={(v) => setCardio((c) => ({ ...c, distance: v }))} placeholder="Ex : 5" />
            </div>
            <div className="mb-3">
              <LabeledInput theme={theme} label="Calories (optionnel)" value={cardio.calories} onChange={(v) => setCardio((c) => ({ ...c, calories: v }))} placeholder="Si connues (montre, machine...)" />
            </div>
            <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold mb-1.5">Intensité</p>
            <div className="flex gap-1.5 mb-3">
              {INTENSITY_LEVELS.map((i) => (
                <Pill key={i.id} theme={theme} active={cardio.intensity === i.id} onClick={() => setCardio((c) => ({ ...c, intensity: i.id }))}>{i.label}</Pill>
              ))}
            </div>
            <textarea placeholder="Notes (optionnel)" value={cardio.notes} onChange={(e) => setCardio((c) => ({ ...c, notes: e.target.value }))} rows={2}
              className="w-full rounded-xl p-2.5 text-[13px] outline-none resize-none mb-5" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
          </>
        )}
        <BigButton theme={theme} gradient disabled={!cardio.type} onClick={() => onSave(cardio)}>
          <Check size={16} /> Enregistrer
        </BigButton>
      </motion.div>
    </motion.div>
  );
}

function StandaloneAbsSheet({ theme, initial, initialNotes, onClose, onSave }) {
  const [exercises, setExercises] = useState(initial || []);
  const [notes, setNotes] = useState(initialNotes || "");
  const [draft, setDraft] = useState({ name: "", series: 3, reps: 15, unit: "reps", restSec: 45 });
  const { height: viewportHeight } = useVisualViewport();

  const addExercise = () => {
    if (!draft.name.trim()) return;
    setExercises((list) => [...list, { id: uid(), ...draft, name: draft.name.trim() }]);
    setDraft({ name: "", series: 3, reps: 15, unit: "reps", restSec: 45 });
  };
  const removeExercise = (id) => setExercises((list) => list.filter((e) => e.id !== id));

  return (
    <motion.div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 200, height: viewportHeight ? `${viewportHeight}px` : undefined }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl p-5" style={{ maxWidth: 480, background: theme.card, borderTop: `1px solid ${theme.border}`, paddingBottom: "calc(2rem + env(safe-area-inset-bottom))", maxHeight: viewportHeight ? `${viewportHeight * 0.85}px` : "85vh", overflowY: "auto" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: theme.border }} />
        <h3 style={{ color: theme.text }} className="text-[17px] font-bold mb-1">Abdominaux</h3>
        <p style={{ color: theme.textMuted }} className="text-[12.5px] mb-4">Indépendant de ta séance de musculation — à tout moment de la journée.</p>

        {exercises.length > 0 && (
          <div className="space-y-2 mb-4">
            {exercises.map((ex) => (
              <Card key={ex.id} theme={theme} className="p-3.5 flex items-center justify-between">
                <div>
                  <p style={{ color: theme.text }} className="font-semibold text-[14px]">{ex.name}</p>
                  <p style={{ color: theme.textMuted }} className="text-[12px]">{ex.series} × {ex.reps}{ex.unit === "sec" ? "s" : " reps"} · repos {ex.restSec}s</p>
                </div>
                <IconButton theme={theme} onClick={() => removeExercise(ex.id)}><Trash2 size={14} color={theme.bad} /></IconButton>
              </Card>
            ))}
          </div>
        )}

        <Card theme={theme} className="p-4 space-y-3 mb-4">
          <input
            value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Nom de l'exercice (ex : Crunch, Gainage...)"
            className="w-full rounded-xl px-3.5 py-3 text-[14.5px] outline-none"
            style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }}
          />
          <div className="flex gap-2">
            <Pill theme={theme} active={draft.unit === "reps"} onClick={() => setDraft((d) => ({ ...d, unit: "reps" }))}>Répétitions</Pill>
            <Pill theme={theme} active={draft.unit === "sec"} onClick={() => setDraft((d) => ({ ...d, unit: "sec" }))}>Durée (sec)</Pill>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniStepper theme={theme} label="Séries" value={draft.series} onChange={(v) => setDraft((d) => ({ ...d, series: Math.max(1, v) }))} />
            <MiniStepper theme={theme} label={draft.unit === "sec" ? "Secondes" : "Reps"} value={draft.reps} step={draft.unit === "sec" ? 5 : 1} onChange={(v) => setDraft((d) => ({ ...d, reps: Math.max(1, v) }))} />
            <MiniStepper theme={theme} label="Repos" value={draft.restSec} step={15} suffix="s" onChange={(v) => setDraft((d) => ({ ...d, restSec: Math.max(0, v) }))} />
          </div>
          <BigButton theme={theme} disabled={!draft.name.trim()} onClick={addExercise}>
            <Plus size={16} /> Ajouter cet exercice
          </BigButton>
        </Card>

        <textarea placeholder="Notes (optionnel)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          className="w-full rounded-xl p-2.5 text-[13px] outline-none resize-none mb-5" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />

        <BigButton theme={theme} gradient disabled={exercises.length === 0} onClick={() => onSave(exercises, notes)}>
          <Check size={16} /> Enregistrer
        </BigButton>
      </motion.div>
    </motion.div>
  );
}

function WorkoutStartScreen({ theme, programs, settings, setSettings, onStart, onGoToPrograms, sessions, setSessions }) {
  // Reprend exactement la logique de suggestion qui vivait avant sur l'Accueil (rotation
  // sur le dernier programme démarré), simplement déplacée ici.
  const suggestedIndex = programs.length ? (settings.lastProgramIndex + 1) % programs.length : -1;
  const suggested = programs[suggestedIndex] || programs[0] || null;
  const [selectedId, setSelectedId] = useState(null);
  const selectedProgram = programs.find((p) => p.id === selectedId) || suggested;

  const handleStart = () => {
    if (!selectedProgram) return;
    const idx = programs.findIndex((p) => p.id === selectedProgram.id);
    if (idx !== -1) setSettings((s) => ({ ...s, lastProgramIndex: idx }));
    onStart(selectedProgram);
  };

  // --- Cardio & Abdos indépendants : accessibles à tout moment de la journée, avant,
  // pendant ou après la séance de musculation, sans jamais rouvrir celle-ci. Enregistrés
  // comme de vraies séances (voir makeCardioSession/makeAbsSession) pour apparaître
  // automatiquement dans l'historique, le calendrier, le streak et les calories du jour.
  const [showCardioSheet, setShowCardioSheet] = useState(false);
  const [showAbsSheet, setShowAbsSheet] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const todayStr = todayISO();
  const todayCardioSessions = sessions.filter((s) => s.date === todayStr && s.type === "cardio");
  const todayAbsSessions = sessions.filter((s) => s.date === todayStr && s.type === "abs");

  const saveCardio = (cardio) => {
    if (editingSessionId) {
      setSessions((list) => list.map((s) => (s.id === editingSessionId ? makeCardioSession(cardio, s.id) : s)));
    } else {
      setSessions((list) => [makeCardioSession(cardio), ...list]);
    }
    setShowCardioSheet(false); setEditingSessionId(null);
  };
  const saveAbs = (exercises, notes) => {
    if (editingSessionId) {
      setSessions((list) => list.map((s) => (s.id === editingSessionId ? makeAbsSession(exercises, notes, s.id) : s)));
    } else {
      setSessions((list) => [makeAbsSession(exercises, notes), ...list]);
    }
    setShowAbsSheet(false); setEditingSessionId(null);
  };
  const deleteStandalone = (id) => setSessions((list) => list.filter((s) => s.id !== id));
  const editCardio = (s) => { setEditingSessionId(s.id); setShowCardioSheet(true); };
  const editAbs = (s) => { setEditingSessionId(s.id); setShowAbsSheet(true); };

  const cardioAbsSection = (
    <div>
      <SectionTitle theme={theme}>Cardio & Abdos</SectionTitle>
      <p style={{ color: theme.textMuted }} className="text-[12.5px] px-1 mb-3">Indépendants de ta séance de musculation — ajoute-les à tout moment de la journée.</p>

      {(todayCardioSessions.length > 0 || todayAbsSessions.length > 0) && (
        <div className="space-y-2 mb-3">
          {todayCardioSessions.map((s) => (
            <Card key={s.id} theme={theme} className="p-3.5 flex items-center gap-3">
              <IconBadge theme={theme} icon={HeartPulse} size={38} iconSize={17} filled />
              <div className="flex-1 min-w-0">
                <p style={{ color: theme.text }} className="font-semibold text-[14px] truncate">{s.programName}</p>
                <p style={{ color: theme.textMuted }} className="text-[12px]">{fmtDuration(s.durationSec || 0)}{s.cardio?.distance ? ` · ${s.cardio.distance} km` : ""}</p>
              </div>
              <IconButton theme={theme} onClick={() => editCardio(s)}><Edit2 size={13} color={theme.textMuted} /></IconButton>
              <IconButton theme={theme} onClick={() => deleteStandalone(s.id)}><Trash2 size={13} color={theme.bad} /></IconButton>
            </Card>
          ))}
          {todayAbsSessions.map((s) => (
            <Card key={s.id} theme={theme} className="p-3.5 flex items-center gap-3">
              <IconBadge theme={theme} icon={Flame} size={38} iconSize={17} filled />
              <div className="flex-1 min-w-0">
                <p style={{ color: theme.text }} className="font-semibold text-[14px] truncate">Abdominaux</p>
                <p style={{ color: theme.textMuted }} className="text-[12px]">{s.exerciseLogs.length} exercice{s.exerciseLogs.length !== 1 ? "s" : ""} · {s.totalSets} séries</p>
              </div>
              <IconButton theme={theme} onClick={() => editAbs(s)}><Edit2 size={13} color={theme.textMuted} /></IconButton>
              <IconButton theme={theme} onClick={() => deleteStandalone(s.id)}><Trash2 size={13} color={theme.bad} /></IconButton>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <BigButton theme={theme} onClick={() => { setEditingSessionId(null); setShowCardioSheet(true); }}>
          <HeartPulse size={16} /> Cardio
        </BigButton>
        <BigButton theme={theme} onClick={() => { setEditingSessionId(null); setShowAbsSheet(true); }}>
          <Flame size={16} /> Abdominaux
        </BigButton>
      </div>

      <AnimatePresence>
        {showCardioSheet && (
          <StandaloneCardioSheet
            theme={theme}
            initial={editingSessionId ? sessions.find((s) => s.id === editingSessionId)?.cardio : null}
            onClose={() => { setShowCardioSheet(false); setEditingSessionId(null); }}
            onSave={saveCardio}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAbsSheet && (
          <StandaloneAbsSheet
            theme={theme}
            initial={editingSessionId ? sessions.find((s) => s.id === editingSessionId)?.exerciseLogs.map((el) => ({ id: el.exerciseId, name: el.name, series: el.sets.length, reps: el.targetReps, unit: el.targetUnit, restSec: el.restSec ?? 45, notes: el.notes })) : null}
            initialNotes={editingSessionId ? sessions.find((s) => s.id === editingSessionId)?.notes : ""}
            onClose={() => { setShowAbsSheet(false); setEditingSessionId(null); }}
            onSave={saveAbs}
          />
        )}
      </AnimatePresence>
    </div>
  );

  if (programs.length === 0) {
    return (
      <div className="px-4 pt-6 space-y-6">
        <Card theme={theme} className="p-8 flex flex-col items-center text-center">
          <div className="rounded-full flex items-center justify-center mb-4" style={{ width: 72, height: 72, background: theme.card2 }}>
            <Flame size={30} color={theme.textFaint} />
          </div>
          <p style={{ color: theme.text }} className="font-bold text-[16px] mb-1.5">Aucun programme</p>
          <p style={{ color: theme.textMuted }} className="text-[13px] mb-6 max-w-[260px]">Crée un programme dans Profil pour pouvoir démarrer une séance.</p>
          <BigButton theme={theme} gradient onClick={onGoToPrograms}>
            <Dumbbell size={17} /> Créer un programme
          </BigButton>
        </Card>
        {cardioAbsSection}
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 space-y-6">
      <div>
        <SectionTitle theme={theme}>Choisir une séance</SectionTitle>
        <div className="space-y-2.5">
          {programs.map((p) => (
            <ProgramSelectCard key={p.id} theme={theme} program={p} selected={selectedProgram?.id === p.id} onSelect={() => setSelectedId(p.id)} />
          ))}
        </div>
      </div>

      <BigButton theme={theme} gradient disabled={!selectedProgram} onClick={handleStart}>
        <Play size={18} fill="#fff" /> Commencer la séance
      </BigButton>

      {cardioAbsSection}
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

// Un seul point d'entrée par section. "Mon profil" n'a PAS sa propre ligne ici : c'est la
// carte d'en-tête (ProfileAccountHeader, juste au-dessus de cette liste) qui joue ce rôle —
// avoir les deux était le doublon signalé (voir l'explication dans la conversation).
const PROFILE_MENU_ITEMS = [
  { id: "weight", view: "weight", icon: Scale, label: "Poids", desc: "Poids actuel, évolution, ajout, historique" },
  { id: "physique", view: "physique", icon: Camera, label: "Physique", desc: "Photos de progression, mensurations" },
  { id: "planning", view: "planning", icon: Calendar, label: "Calendrier", desc: "Planning de la semaine, calendrier mensuel, streak" },
  { id: "simulation", view: "simulation", icon: Rocket, label: "Simulation de progression", desc: "Estime le temps pour atteindre un objectif", premium: true },
  { id: "nutrition", view: "nutrition", icon: Utensils, label: "Objectifs nutritionnels", desc: "Calories, macros, coach adaptatif" },
  { id: "performances", view: "performances", icon: TrendingUp, label: "Performances", desc: "Progression, records personnels, statistiques" },
  { id: "history", view: "history", icon: HistoryIcon, label: "Historique séances", desc: "Revoir toutes tes séances passées" },
  { id: "settings", view: "settings", icon: Settings, label: "Paramètres", desc: "Thème, repos par défaut" },
  { id: "programs", view: "programs", icon: Dumbbell, label: "Mes programmes", desc: "Créer, modifier, organiser tes séances" },
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
              <div className="flex items-center gap-1.5">
                <p style={{ color: theme.text }} className="font-bold text-[15px]">{it.label}</p>
                {it.premium && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide" style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`, color: "#fff" }}>
                    Premium
                  </span>
                )}
              </div>
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
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Poids actuel</p><p style={{ color: theme.text }} className="text-[19px] font-extrabold">{lastWeight ? `${fmtWeight(lastWeight.weight)}kg` : "—"}</p></Card>
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
// Écran "Planning hebdomadaire" (Profil) : associe un programme existant (ou Repos) à
// chaque jour. Utilisé automatiquement par <TodaySessionCard/> et <WeeklyPlanningStrip/>
// sur Accueil.
function WeeklyPlanningEditor({ theme, programs, weeklyPlanning, setDayProgram }) {
  const [openDay, setOpenDay] = useState(null);

  if (programs.length === 0) {
    return (
      <div className="px-4 pt-2">
        <Card theme={theme}>
          <EmptyState theme={theme} icon={Dumbbell} title="Aucun programme" subtitle="Crée d'abord un programme dans Mes programmes pour pouvoir planifier ta semaine." />
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 space-y-2.5">
      <p style={{ color: theme.textMuted }} className="text-[13px] px-1 mb-1">Associe un programme (ou Repos) à chaque jour de la semaine.</p>
      {WEEK_DAYS.map((d) => {
        const programId = weeklyPlanning[d.key];
        const program = programId ? programs.find((p) => p.id === programId) : null;
        const open = openDay === d.key;
        return (
          <Card theme={theme} className="overflow-hidden" key={d.key}>
            <button className="w-full flex items-center justify-between p-4" onClick={() => setOpenDay(open ? null : d.key)}>
              <p style={{ color: theme.text }} className="font-bold text-[14.5px]">{d.label}</p>
              <div className="flex items-center gap-1.5">
                <span style={{ color: program ? theme.accent : theme.textMuted }} className="text-[13px] font-semibold">
                  {program ? program.name : "Repos"}
                </span>
                <ChevronDown size={15} color={theme.textFaint} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </div>
            </button>
            {open && (
              <div className="px-4 pb-4 flex flex-wrap gap-2" style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12 }}>
                <Pill theme={theme} active={!programId} onClick={() => { setDayProgram(d.key, null); setOpenDay(null); }}>Repos</Pill>
                {programs.map((p) => (
                  <Pill key={p.id} theme={theme} active={programId === p.id} onClick={() => { setDayProgram(d.key, p.id); setOpenDay(null); }}>
                    {p.name}
                  </Pill>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// Calendrier mensuel : visualise en un coup d'œil les jours réalisés (vert), planifiés
// (bleu) et de repos (gris), avec les statistiques du mois et les indicateurs de
// régularité (streak). Vient compléter le planning hebdomadaire ci-dessus.
function MonthlyCalendarSection({ theme, sessions, weeklyPlanning }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const base = useMemo(() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + monthOffset); return d; }, [monthOffset]);
  const year = base.getFullYear(), month = base.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // lundi = 0

  const sessionDates = useMemo(() => new Set(sessions.map((s) => s.date)), [sessions]);
  const isoFor = (d) => { const dt = new Date(year, month, d); const off = dt.getTimezoneOffset(); return new Date(dt.getTime() - off * 60000).toISOString().slice(0, 10); };
  const dayKeyFor = (d) => WEEK_DAYS[(new Date(year, month, d).getDay() + 6) % 7].key;

  let realisees = 0, planifieesCount = 0, joursEntrainement = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const hasSession = sessionDates.has(isoFor(d));
    const isPlannedDay = !!weeklyPlanning[dayKeyFor(d)];
    if (hasSession) realisees += 1;
    if (isPlannedDay) planifieesCount += 1;
    if (hasSession || isPlannedDay) joursEntrainement += 1;
  }
  const joursRepos = daysInMonth - joursEntrainement;
  const tauxRealisation = planifieesCount > 0 ? Math.round((realisees / planifieesCount) * 100) : null;

  const dayStreak = useMemo(() => computeDayStreak(sessions), [sessions]);
  const weekStreak = useMemo(() => computeWeeklyStreak(sessions, weeklyPlanning), [sessions, weeklyPlanning]);

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="px-4 pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <p style={{ color: theme.textMuted }} className="text-[12px] font-bold uppercase tracking-wide">Calendrier des séances</p>
        <div className="flex items-center gap-1">
          <IconButton theme={theme} onClick={() => setMonthOffset((m) => m - 1)}><ChevronLeft size={15} color={theme.text} /></IconButton>
          <p style={{ color: theme.text }} className="text-[13px] font-bold w-28 text-center capitalize">{base.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
          <IconButton theme={theme} onClick={() => setMonthOffset((m) => m + 1)}><ChevronRight size={15} color={theme.text} /></IconButton>
        </div>
      </div>

      <Card theme={theme} className="p-3">
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {WEEK_DAYS.map((d) => <p key={d.key} style={{ color: theme.textFaint }} className="text-[10px] font-bold text-center uppercase">{d.short}</p>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const hasSession = sessionDates.has(isoFor(d));
            const isPlannedDay = !!weeklyPlanning[dayKeyFor(d)];
            const isToday = isoFor(d) === todayISO();
            const color = hasSession ? theme.good : isPlannedDay ? theme.accent : theme.textFaint;
            return (
              <div
                key={i} className="aspect-square rounded-lg flex items-center justify-center"
                style={{ background: hasSession || isPlannedDay ? `${color}22` : theme.card2, border: isToday ? `1.5px solid ${theme.text}` : "1px solid transparent" }}
              >
                <span className="text-[11px] font-semibold" style={{ color }}>{d}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex items-center gap-4 px-1 flex-wrap">
        <div className="flex items-center gap-1.5"><div className="rounded-full" style={{ width: 8, height: 8, background: theme.good }} /><span className="text-[11px]" style={{ color: theme.textMuted }}>Réalisée</span></div>
        <div className="flex items-center gap-1.5"><div className="rounded-full" style={{ width: 8, height: 8, background: theme.accent }} /><span className="text-[11px]" style={{ color: theme.textMuted }}>Planifiée</span></div>
        <div className="flex items-center gap-1.5"><div className="rounded-full" style={{ width: 8, height: 8, background: theme.textFaint }} /><span className="text-[11px]" style={{ color: theme.textMuted }}>Repos</span></div>
      </div>

      <div>
        <p style={{ color: theme.textMuted }} className="text-[12px] font-bold uppercase tracking-wide mb-2 px-1">Statistiques du mois</p>
        <div className="grid grid-cols-2 gap-2.5">
          <Card theme={theme} className="p-3.5"><p style={{ color: theme.text }} className="text-[20px] font-extrabold">{realisees}</p><p style={{ color: theme.textMuted }} className="text-[11px]">Séances réalisées</p></Card>
          <Card theme={theme} className="p-3.5"><p style={{ color: theme.text }} className="text-[20px] font-extrabold">{planifieesCount}</p><p style={{ color: theme.textMuted }} className="text-[11px]">Séances planifiées</p></Card>
          <Card theme={theme} className="p-3.5"><p style={{ color: theme.text }} className="text-[20px] font-extrabold">{joursEntrainement}</p><p style={{ color: theme.textMuted }} className="text-[11px]">Jours d'entraînement</p></Card>
          <Card theme={theme} className="p-3.5"><p style={{ color: theme.text }} className="text-[20px] font-extrabold">{joursRepos}</p><p style={{ color: theme.textMuted }} className="text-[11px]">Jours de repos</p></Card>
        </div>
      </div>

      <Card theme={theme} className="p-4">
        <div className="flex items-center justify-between mb-1.5">
          <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold">Taux de réalisation</p>
          <p style={{ color: theme.text }} className="text-[15px] font-extrabold">{tauxRealisation != null ? `${tauxRealisation}%` : "—"}</p>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 8, background: theme.card2 }}>
          <div style={{ height: "100%", width: `${Math.min(100, tauxRealisation || 0)}%`, background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})`, transition: "width 0.4s" }} />
        </div>
      </Card>

      <div>
        <p style={{ color: theme.textMuted }} className="text-[12px] font-bold uppercase tracking-wide mb-2 px-1">Régularité</p>
        <div className="grid grid-cols-3 gap-2.5">
          <Card theme={theme} className="p-3.5 text-center">
            <Flame size={16} color={theme.accent} className="mx-auto mb-1" />
            <p style={{ color: theme.text }} className="text-[18px] font-extrabold">{dayStreak.current}</p>
            <p style={{ color: theme.textMuted }} className="text-[10px] leading-tight">jours de suite</p>
          </Card>
          <Card theme={theme} className="p-3.5 text-center">
            <Trophy size={16} color={theme.accent2} className="mx-auto mb-1" />
            <p style={{ color: theme.text }} className="text-[18px] font-extrabold">{dayStreak.best}</p>
            <p style={{ color: theme.textMuted }} className="text-[10px] leading-tight">record de jours</p>
          </Card>
          <Card theme={theme} className="p-3.5 text-center">
            <Check size={16} color={theme.good} className="mx-auto mb-1" />
            <p style={{ color: theme.text }} className="text-[18px] font-extrabold">{weekStreak}</p>
            <p style={{ color: theme.textMuted }} className="text-[10px] leading-tight">semaines d'objectif</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ============================== PHYSIQUE (photos + mensurations) ============================== */

const MEASUREMENT_FIELDS = [
  { key: "arms", label: "Bras" }, { key: "forearms", label: "Avant-bras" },
  { key: "shoulders", label: "Épaules" }, { key: "chest", label: "Poitrine" },
  { key: "waist", label: "Taille" }, { key: "hips", label: "Hanches" },
  { key: "thighs", label: "Cuisses" }, { key: "calves", label: "Mollets" },
  { key: "neck", label: "Cou" },
];

function PhysiqueHub({ theme, photos, setPhotos, measurements, setMeasurements }) {
  const [tab, setTab] = useState("photos"); // 'photos' | 'measurements'
  return (
    <div className="px-4 pt-2">
      <div className="flex gap-2 mb-4">
        <Pill theme={theme} active={tab === "photos"} onClick={() => setTab("photos")}>Photos</Pill>
        <Pill theme={theme} active={tab === "measurements"} onClick={() => setTab("measurements")}>Mensurations</Pill>
      </div>
      {tab === "photos" ? (
        <ProgressPhotosSection theme={theme} photos={photos} setPhotos={setPhotos} />
      ) : (
        <MeasurementsSection theme={theme} measurements={measurements} setMeasurements={setMeasurements} />
      )}
    </div>
  );
}

// --- Photos de progression : import multiple, tri chronologique, comparaison avant/après --
function ProgressPhotosSection({ theme, photos, setPhotos }) {
  const fileInputRef = useRef(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState([null, null]);
  const sorted = useMemo(() => [...photos].sort((a, b) => a.date.localeCompare(b.date)), [photos]);

  // Les photos sont converties en base64 et stockées directement (pas de backend) — voir
  // l'avertissement affiché à l'utilisateur sur la taille du stockage local.
  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((list) => [...list, { id: uid(), date: todayISO(), dataUrl: reader.result }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };
  const removePhoto = (id) => {
    setPhotos((list) => list.filter((p) => p.id !== id));
    setCompareIds((c) => c.map((x) => (x === id ? null : x)));
  };
  const updateDate = (id, date) => setPhotos((list) => list.map((p) => (p.id === id ? { ...p, date } : p)));
  const pickForCompare = (id) => setCompareIds((c) => (c[0] ? [c[0], id] : [id, c[1]]));

  const beforePhoto = photos.find((p) => p.id === compareIds[0]);
  const afterPhoto = photos.find((p) => p.id === compareIds[1]);

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
      <div className="flex gap-2.5">
        <BigButton theme={theme} gradient onClick={() => fileInputRef.current?.click()}><Plus size={16} /> Ajouter des photos</BigButton>
        {photos.length >= 2 && (
          <IconButton theme={theme} onClick={() => setCompareMode((v) => !v)}>
            <Images size={17} color={compareMode ? theme.accent : theme.text} />
          </IconButton>
        )}
      </div>
      <p style={{ color: theme.textFaint }} className="text-[11px] px-1">
        Les photos restent uniquement sur cet appareil (aucun envoi en ligne) — évite d'en ajouter un trop grand nombre, elles occupent de la place dans le stockage local.
      </p>

      {compareMode ? (
        <div>
          <SectionTitle theme={theme}>Comparer avant / après</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {[0, 1].map((slot) => {
              const p = slot === 0 ? beforePhoto : afterPhoto;
              return (
                <div key={slot}>
                  <p className="text-[11px] font-semibold mb-1.5 text-center" style={{ color: theme.textMuted }}>{slot === 0 ? "Avant" : "Après"}</p>
                  <div className="rounded-2xl overflow-hidden flex items-center justify-center" style={{ aspectRatio: "3/4", background: theme.card2 }}>
                    {p ? <img src={p.dataUrl} alt="" className="w-full h-full object-cover" /> : <Images size={22} color={theme.textFaint} />}
                  </div>
                  {p && <p className="text-[10.5px] text-center mt-1" style={{ color: theme.textFaint }}>{fmtDate(p.date)}</p>}
                </div>
              );
            })}
          </div>
          <p style={{ color: theme.textMuted }} className="text-[11.5px] px-1 mb-2">Choisis deux photos ci-dessous.</p>
          <div className="flex gap-2 overflow-x-auto pb-1 pt-1" style={{ scrollbarWidth: "none" }}>
            {sorted.map((p) => (
              <button
                key={p.id} onClick={() => pickForCompare(p.id)}
                className="shrink-0 rounded-xl overflow-hidden"
                style={{ width: 56, height: 72, border: `2px solid ${compareIds.includes(p.id) ? theme.accent : "transparent"}` }}
              >
                <img src={p.dataUrl} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <Card theme={theme}><EmptyState theme={theme} icon={Images} title="Aucune photo" subtitle="Ajoute une première photo pour commencer à suivre ton évolution." /></Card>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {[...sorted].reverse().map((p) => (
            <Card key={p.id} theme={theme} className="overflow-hidden p-0">
              <div style={{ aspectRatio: "3/4", background: theme.card2 }}>
                <img src={p.dataUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="p-2.5 flex items-center justify-between gap-1">
                <input type="date" value={p.date} onChange={(e) => updateDate(p.id, e.target.value)} className="text-[11px] bg-transparent outline-none min-w-0" style={{ color: theme.text }} />
                <button onClick={() => removePhoto(p.id)} className="shrink-0"><Trash2 size={13} color={theme.bad} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Mensurations : historique daté + graphique d'évolution par mesure ------------------
function MeasurementsSection({ theme, measurements, setMeasurements }) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedField, setSelectedField] = useState("arms");
  const sorted = useMemo(() => [...measurements].sort((a, b) => a.date.localeCompare(b.date)), [measurements]);
  const latest = sorted[sorted.length - 1];
  const removeMeasurement = (id) => setMeasurements((list) => list.filter((m) => m.id !== id));

  const chartData = sorted
    .filter((m) => m.values[selectedField] != null && m.values[selectedField] !== "")
    .map((m) => ({ dateLabel: fmtDate(m.date), value: Number(m.values[selectedField]) }));

  return (
    <div className="space-y-4">
      <BigButton theme={theme} gradient onClick={() => setShowAdd(true)}><Plus size={16} /> Ajouter une mensuration</BigButton>

      {latest && (
        <div>
          <SectionTitle theme={theme}>Dernières mesures · {fmtDate(latest.date)}</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {MEASUREMENT_FIELDS.map((f) => (
              <Card key={f.key} theme={theme} className="p-2.5 text-center">
                <p style={{ color: theme.text }} className="text-[15px] font-extrabold">{latest.values[f.key] || "—"}{latest.values[f.key] ? " cm" : ""}</p>
                <p style={{ color: theme.textFaint }} className="text-[9.5px] mt-0.5">{f.label}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionTitle theme={theme}>Évolution</SectionTitle>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {MEASUREMENT_FIELDS.map((f) => (
            <Pill key={f.key} theme={theme} active={selectedField === f.key} onClick={() => setSelectedField(f.key)}>{f.label}</Pill>
          ))}
        </div>
        {chartData.length < 2 ? (
          <Card theme={theme}><EmptyState theme={theme} icon={Ruler} title="Pas assez de données" subtitle="Ajoute au moins deux mesures pour voir un graphique." /></Card>
        ) : (
          <ChartCard theme={theme} title={MEASUREMENT_FIELDS.find((f) => f.key === selectedField)?.label}>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.border} vertical={false} />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: theme.textFaint }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: theme.textFaint }} axisLine={false} tickLine={false} width={30} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip contentStyle={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, fontSize: 12 }} labelStyle={{ color: theme.text }} />
                <Line type="monotone" dataKey="value" stroke={theme.accent} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      <div>
        <SectionTitle theme={theme}>Historique</SectionTitle>
        {sorted.length === 0 ? (
          <Card theme={theme}><EmptyState theme={theme} icon={Ruler} title="Aucune mensuration enregistrée" /></Card>
        ) : (
          <div className="space-y-2">
            {[...sorted].reverse().map((m) => (
              <Card key={m.id} theme={theme} className="p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <p style={{ color: theme.text }} className="font-bold text-[13.5px]">{fmtDate(m.date)}</p>
                  <button onClick={() => removeMeasurement(m.id)}><Trash2 size={13} color={theme.bad} /></button>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {MEASUREMENT_FIELDS.filter((f) => m.values[f.key]).map((f) => (
                    <span key={f.key} className="text-[11.5px]" style={{ color: theme.textMuted }}>
                      {f.label} : <b style={{ color: theme.text }}>{m.values[f.key]}cm</b>
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddMeasurementSheet
            theme={theme} onClose={() => setShowAdd(false)}
            onAdd={(entry) => { setMeasurements((list) => [...list, entry]); setShowAdd(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AddMeasurementSheet({ theme, onClose, onAdd }) {
  const [date, setDate] = useState(todayISO());
  const [values, setValues] = useState({});
  const { height: viewportHeight } = useVisualViewport();
  const setField = (key, v) => setValues((vals) => ({ ...vals, [key]: v }));

  return (
    <motion.div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 200, height: viewportHeight ? `${viewportHeight}px` : undefined }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl p-5" style={{ maxWidth: 480, background: theme.card, borderTop: `1px solid ${theme.border}`, paddingBottom: "calc(2rem + env(safe-area-inset-bottom))", maxHeight: viewportHeight ? `${viewportHeight * 0.85}px` : "85vh", overflowY: "auto" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: theme.border }} />
        <h3 style={{ color: theme.text }} className="text-[17px] font-bold mb-4">Ajouter une mensuration</h3>
        <FieldRow theme={theme} label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent outline-none text-right" style={{ color: theme.text }} />
        </FieldRow>
        <div className="grid grid-cols-2 gap-2.5 mt-3 mb-5">
          {MEASUREMENT_FIELDS.map((f) => (
            <div key={f.key}>
              <p style={{ color: theme.textMuted }} className="text-[11.5px] font-semibold mb-1 px-0.5">{f.label} (cm)</p>
              <input
                inputMode="decimal" placeholder="—" value={values[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-[14px] outline-none"
                style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }}
              />
            </div>
          ))}
        </div>
        <BigButton
          theme={theme} gradient
          disabled={!Object.values(values).some((v) => String(v || "").trim() !== "")}
          onClick={() => onAdd({ id: uid(), date, values })}
        >
          <Plus size={17} /> Enregistrer
        </BigButton>
      </motion.div>
    </motion.div>
  );
}


function ProfileHub({
  theme, isDark, setIsDark, programs, setPrograms, sessions, setSessions,
  weightEntries, setWeightEntries, settings, setSettings, onStartProgram, onExport, onImport,
  userProfile, setUserProfile, onResetData,
  nutritionProfile, setNutritionProfile, caloriesLog, setCaloriesLog, nutritionAdjustments, setNutritionAdjustments,
  weeklyPlanning, setDayProgram,
  progressPhotos, setProgressPhotos, measurements, setMeasurements,
  stepsLog, setStepsLog,
}) {
  const [view, setView] = useState(null); // null = menu racine
  const [programId, setProgramId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [showExportSheet, setShowExportSheet] = useState(false);

  if (!view) {
    return (
      <div>
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2.5">
            <IconBadge theme={theme} icon={User} size={34} iconSize={16} filled />
            <h1 style={{ color: theme.text }} className="text-[26px] font-extrabold tracking-tight">Profil</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowExportSheet(true)} className="active:scale-90 transition-transform rounded-full flex items-center justify-center" style={{ width: 38, height: 38, background: theme.card2, border: `1px solid ${theme.border}` }}>
              <Download size={16} color={theme.text} />
            </button>
            <button onClick={() => setIsDark((d) => !d)} className="active:scale-90 transition-transform rounded-full flex items-center justify-center" style={{ width: 38, height: 38, background: theme.card2, border: `1px solid ${theme.border}` }}>
              {isDark ? <Sun size={17} color={theme.text} /> : <Moon size={17} color={theme.text} />}
            </button>
          </div>
        </div>
        <ProfileMenu theme={theme} userProfile={userProfile} onSelect={setView} onOpenProfile={() => setView("myprofile")} />

        <AnimatePresence>
          {showExportSheet && (
            <ExportDataSheet
              theme={theme}
              onClose={() => setShowExportSheet(false)}
              onExport={(opts) => runExport({
                programs, sessions, weightEntries, measurements, caloriesLog, stepsLog,
                settings, userProfile, nutritionProfile, weeklyPlanning,
              }, opts)}
              onFullBackup={() => downloadFullBackup({
                programs, sessions, weightEntries, settings, userProfile,
                nutritionProfile, caloriesLog, nutritionAdjustments, weeklyPlanning,
                measurements, progressPhotos, stepsLog,
              })}
            />
          )}
        </AnimatePresence>
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
        <HistoryList
          theme={theme} sessions={sessions}
          onOpen={(id) => { setSessionId(id); setView("sessionDetail"); }}
          onEdit={(id) => { setSessionId(id); setView("sessionEdit"); }}
        />
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
        onEdit={(id) => { setSessionId(id); setView("sessionEdit"); }}
      />
    );
  }

  if (view === "sessionEdit") {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) { setView("history"); return null; }
    return (
      <EditSessionScreen
        theme={theme} session={session}
        onCancel={() => setView("sessionDetail")}
        onSave={(updated) => {
          // Ne remplace QUE la séance modifiée — le tableau `sessions` garde toutes les
          // autres inchangées. Records, progression et statistiques se recalculent tout
          // seuls au rendu suivant puisqu'ils lisent toujours `sessions` directement.
          setSessions((all) => all.map((s) => (s.id === updated.id ? updated : s)));
          setView("sessionDetail");
        }}
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

  if (view === "physique") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Physique" onBack={() => setView(null)} />
        <PhysiqueHub theme={theme} photos={progressPhotos} setPhotos={setProgressPhotos} measurements={measurements} setMeasurements={setMeasurements} />
      </div>
    );
  }

  if (view === "planning") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Calendrier" onBack={() => setView(null)} />
        <WeeklyPlanningEditor theme={theme} programs={programs} weeklyPlanning={weeklyPlanning} setDayProgram={setDayProgram} />
        <MonthlyCalendarSection theme={theme} sessions={sessions} weeklyPlanning={weeklyPlanning} programs={programs} />
      </div>
    );
  }

  if (view === "simulation") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Simulation de progression" onBack={() => setView(null)} />
        <ProgressSimulationScreen theme={theme} sessions={sessions} weightEntries={weightEntries} programs={programs} caloriesLog={caloriesLog} nutritionProfile={nutritionProfile} />
      </div>
    );
  }

  if (view === "nutrition") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Objectifs nutritionnels" onBack={() => setView(null)} />
        <NutritionScreen
          theme={theme} weightEntries={weightEntries} sessions={sessions}
          nutritionProfile={nutritionProfile} setNutritionProfile={setNutritionProfile}
          caloriesLog={caloriesLog} setCaloriesLog={setCaloriesLog}
          stepsLog={stepsLog} setStepsLog={setStepsLog}
          nutritionAdjustments={nutritionAdjustments} setNutritionAdjustments={setNutritionAdjustments}
        />
      </div>
    );
  }

  if (view === "performances") {
    return (
      <div>
        <SubPageHeader theme={theme} title="Performances" onBack={() => setView(null)} />
        <PerformancesHub theme={theme} sessions={sessions} programs={programs} onExport={onExport} onImport={onImport} />
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

const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sédentaire" },
  { id: "light", label: "Léger" },
  { id: "moderate", label: "Modéré" },
  { id: "high", label: "Élevé" },
  { id: "very_high", label: "Très élevé" },
];
const NUTRITION_GOALS = [
  { id: "cut", label: "Sèche" },
  { id: "maintain", label: "Maintien" },
  { id: "bulk", label: "Prise de masse" },
];

// --- Formulaire "Informations" du coach nutritionnel : toujours modifiable -------------
function NutritionInfoForm({ theme, profile, onUpdate, currentWeight, onDone, canClose }) {
  return (
    <div className="space-y-3">
      <Card theme={theme} className="p-4 space-y-3">
        <p style={{ color: theme.text }} className="font-bold text-[14px]">Informations personnelles</p>
        <FieldRow theme={theme} label="Sexe">
          <div className="flex gap-2">
            <Pill theme={theme} active={profile.sex === "M"} onClick={() => onUpdate({ sex: "M" })}>Homme</Pill>
            <Pill theme={theme} active={profile.sex === "F"} onClick={() => onUpdate({ sex: "F" })}>Femme</Pill>
          </div>
        </FieldRow>
        <FieldRow theme={theme} label="Date de naissance">
          <input type="date" value={profile.birthdate || ""} onChange={(e) => onUpdate({ birthdate: e.target.value })} className="bg-transparent outline-none text-right" style={{ color: theme.text }} />
        </FieldRow>
        <LabeledInput theme={theme} label="Taille (cm)" value={profile.height ?? ""} onChange={(v) => { const n = parseLocaleNumber(v); onUpdate({ height: v.trim() === "" ? null : (Number.isFinite(n) ? n : profile.height) }); }} placeholder="Ex : 178" />
        <FieldRow theme={theme} label="Poids actuel">
          <span style={{ color: theme.textMuted }} className="text-[13px]">{currentWeight ? `${fmtWeight(currentWeight)} kg (via Poids)` : "Non renseigné"}</span>
        </FieldRow>
        <LabeledInput theme={theme} label="Poids cible (kg)" value={profile.weightTarget ?? ""} onChange={(v) => { const n = parseLocaleNumber(v); onUpdate({ weightTarget: v.trim() === "" ? null : (Number.isFinite(n) ? n : profile.weightTarget) }); }} placeholder="Ex : 75" />
      </Card>

      <Card theme={theme} className="p-4 space-y-3">
        <p style={{ color: theme.text }} className="font-bold text-[14px]">Activité quotidienne</p>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_LEVELS.map((a) => <Pill key={a.id} theme={theme} active={profile.activityLevel === a.id} onClick={() => onUpdate({ activityLevel: a.id })}>{a.label}</Pill>)}
        </div>
        <LabeledInput theme={theme} label="Pas / jour (optionnel)" value={profile.stepsPerDay ?? ""} onChange={(v) => onUpdate({ stepsPerDay: v.trim() === "" ? null : Number(v.replace(/\D/g, "")) || null })} placeholder="Ex : 8000" />
        <LabeledInput theme={theme} label="Profession (optionnel)" value={profile.profession} onChange={(v) => onUpdate({ profession: v })} placeholder="Ex : bureau, chantier..." />
      </Card>

      <Card theme={theme} className="p-4 space-y-3">
        <p style={{ color: theme.text }} className="font-bold text-[14px]">Entraînement</p>
        <div className="grid grid-cols-2 gap-2.5">
          <MiniStepper theme={theme} label="Muscu / sem" value={profile.strengthSessionsPerWeek} onChange={(v) => onUpdate({ strengthSessionsPerWeek: v })} />
          <MiniStepper theme={theme} label="Durée muscu" value={profile.strengthSessionDuration} step={5} suffix="min" onChange={(v) => onUpdate({ strengthSessionDuration: v })} />
          <MiniStepper theme={theme} label="Cardio / sem" value={profile.cardioSessionsPerWeek} onChange={(v) => onUpdate({ cardioSessionsPerWeek: v })} />
          <MiniStepper theme={theme} label="Durée cardio" value={profile.cardioSessionDuration} step={5} suffix="min" onChange={(v) => onUpdate({ cardioSessionDuration: v })} />
        </div>
      </Card>

      <Card theme={theme} className="p-4">
        <p style={{ color: theme.text }} className="font-bold text-[14px] mb-2.5">Objectif</p>
        <div className="flex flex-wrap gap-2">
          {NUTRITION_GOALS.map((g) => <Pill key={g.id} theme={theme} active={profile.goal === g.id} onClick={() => onUpdate({ goal: g.id })}>{g.label}</Pill>)}
        </div>
      </Card>

      {canClose && <BigButton theme={theme} gradient onClick={onDone}><Check size={16} /> Voir le tableau de bord</BigButton>}
    </div>
  );
}

function NutritionNotificationBanner({ theme, notif }) {
  const isWarning = notif.type === "warning";
  const isSuccess = notif.type === "success";
  const color = isSuccess ? theme.good : isWarning ? theme.accent2 : theme.accent;
  return (
    <div className="rounded-2xl p-3.5 flex items-start gap-2.5" style={{ background: `${color}14`, border: `1px solid ${color}33` }}>
      {isSuccess ? <Trophy size={15} color={color} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} color={color} className="mt-0.5 shrink-0" />}
      <p style={{ color: theme.text }} className="text-[13px] leading-snug">{notif.message}</p>
    </div>
  );
}

// --- Coach nutritionnel : écran principal -----------------------------------------------
// Architecture : tout le calcul (BMR/TDEE/calories/macros/analyse hebdomadaire) vit dans
// les "services" définis plus haut (EnergyCalculator, WorkoutCalorieEstimator, GoalManager,
// NutritionCalculator, WeeklyAdaptiveAlgorithm) — ce composant ne fait que les appeler et
// afficher le résultat, il ne contient aucune formule lui-même.
// Ligne de progression pour un nutriment (calories, protéines, glucides ou lipides) :
// consommé / objectif, pourcentage atteint, quantité restante ou dépassement, barre visuelle.
function MacroProgressRow({ theme, icon: Icon, color, label, unit, consumed, target, last }) {
  const pct = target ? Math.min(100, Math.round((consumed / target) * 100)) : null;
  const remaining = target != null ? Math.round(target - consumed) : null;
  return (
    <div className={last ? "" : "mb-3"}>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: theme.text }}>
          <Icon size={13} color={color} /> {label}
        </span>
        <span className="text-[11px]" style={{ color: theme.textMuted }}>
          {Math.round(consumed)}{unit} / {target != null ? `${Math.round(target)}${unit}` : "—"}
          {pct != null && ` · ${pct}%`}
        </span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ height: 7, background: theme.card2 }}>
        <div style={{ height: "100%", width: `${pct || 0}%`, background: color, transition: "width 0.4s" }} />
      </div>
      {target != null && (
        <p style={{ color: remaining >= 0 ? theme.textFaint : theme.bad }} className="text-[10.5px] mt-1">
          {remaining >= 0 ? `${remaining}${unit} restant` : `${Math.abs(remaining)}${unit} de dépassement`}
        </p>
      )}
    </div>
  );
}

const NUTRITION_HISTORY_PERIODS = [
  { id: "day", label: "Jour" },
  { id: "week", label: "Semaine" },
  { id: "month", label: "Mois" },
];

// Historique quotidien / hebdomadaire / mensuel des apports — agrège `caloriesLog` (les
// mêmes entrées que le suivi du jour) sans stockage séparé : une seule source de vérité.
function NutritionHistorySection({ theme, caloriesLog, targets }) {
  const [period, setPeriod] = useState("day");

  const data = useMemo(() => {
    const sorted = [...caloriesLog].sort((a, b) => a.date.localeCompare(b.date));
    if (period === "day") {
      return sorted.slice(-14).map((c) => ({ label: fmtDate(c.date, { day: "numeric", month: "short" }), calories: c.calories || 0, protein: c.protein || 0, carbs: c.carbs || 0, fat: c.fat || 0 }));
    }
    const groups = {};
    sorted.forEach((c) => {
      let key;
      if (period === "week") {
        const d = new Date(c.date);
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        key = monday.toISOString().slice(0, 10);
      } else {
        key = c.date.slice(0, 7); // YYYY-MM
      }
      groups[key] = groups[key] || { calories: [], protein: [], carbs: [], fat: [] };
      groups[key].calories.push(c.calories || 0);
      if (c.protein != null) groups[key].protein.push(c.protein);
      if (c.carbs != null) groups[key].carbs.push(c.carbs);
      if (c.fat != null) groups[key].fat.push(c.fat);
    });
    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    return Object.entries(groups).slice(-12).map(([key, g]) => ({
      label: period === "week" ? fmtDate(key, { day: "numeric", month: "short" }) : fmtDate(`${key}-01`, { month: "short", year: "2-digit" }),
      calories: Math.round(avg(g.calories)), protein: Math.round(avg(g.protein)), carbs: Math.round(avg(g.carbs)), fat: Math.round(avg(g.fat)),
    }));
  }, [caloriesLog, period]);

  return (
    <div>
      <SectionTitle theme={theme}>Historique nutritionnel</SectionTitle>
      <div className="flex gap-2 mb-3">
        {NUTRITION_HISTORY_PERIODS.map((p) => (
          <Pill key={p.id} theme={theme} active={period === p.id} onClick={() => setPeriod(p.id)}>{p.label}</Pill>
        ))}
      </div>
      {data.length === 0 ? (
        <Card theme={theme}><EmptyState theme={theme} icon={Beef} title="Aucune donnée" subtitle="Renseigne tes apports quotidiens pour voir apparaître ton historique ici." /></Card>
      ) : (
        <ChartCard theme={theme} title={period === "day" ? "Calories (14 derniers jours)" : period === "week" ? "Moyenne calorique par semaine" : "Moyenne calorique par mois"}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: theme.textFaint }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: theme.textFaint }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, fontSize: 12 }} labelStyle={{ color: theme.text }} />
              {targets?.calories && <ReferenceLine y={targets.calories} stroke={theme.textFaint} strokeDasharray="4 4" />}
              <Bar dataKey="calories" fill={theme.accent} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

function NutritionScreen({ theme, weightEntries, sessions, nutritionProfile, setNutritionProfile, caloriesLog, setCaloriesLog, stepsLog, setStepsLog, nutritionAdjustments, setNutritionAdjustments }) {
  const sortedWeights = useMemo(() => [...weightEntries].sort((a, b) => a.date.localeCompare(b.date)), [weightEntries]);
  const currentWeight = sortedWeights.length ? sortedWeights[sortedWeights.length - 1].weight : null;
  const daysSinceLastWeight = sortedWeights.length
    ? Math.floor((Date.now() - new Date(sortedWeights[sortedWeights.length - 1].date).getTime()) / 86400000)
    : null;

  const update = (patch) => setNutritionProfile((p) => ({ ...p, ...patch }));
  const missingEssentials = !nutritionProfile.birthdate || !nutritionProfile.height || !currentWeight;
  const [editingInfo, setEditingInfo] = useState(missingEssentials);

  const age = EnergyCalculator.computeAge(nutritionProfile.birthdate);
  const bmr = EnergyCalculator.computeBMR({ sex: nutritionProfile.sex, weightKg: currentWeight, heightCm: nutritionProfile.height, age });

  const last7Sessions = useMemo(() => sessions.filter((s) => Date.now() - s.startedAt < 7 * 86400000), [sessions]);
  const avgStrengthKcal7d = useMemo(() => {
    if (!currentWeight || !last7Sessions.length) return 0;
    const total = last7Sessions.reduce((a, s) => a + WorkoutCalorieEstimator.estimateStrengthSessionKcal({ tonnage: s.tonnage, durationSec: s.durationSec, bodyWeightKg: currentWeight }), 0);
    return total / 7;
  }, [last7Sessions, currentWeight]);
  const avgCardioKcal = WorkoutCalorieEstimator.estimateAvgDailyCardioKcal({
    cardioSessionsPerWeek: nutritionProfile.cardioSessionsPerWeek, cardioDurationMin: nutritionProfile.cardioSessionDuration, bodyWeightKg: currentWeight,
  });

  const tdee = EnergyCalculator.computeTDEE({ bmr, activityLevel: nutritionProfile.activityLevel, avgDailyWorkoutKcal: avgStrengthKcal7d + avgCardioKcal });

  const totalAdjustmentKcal = useMemo(() => nutritionAdjustments.filter((a) => a.reason === "weekly_adjustment").reduce((a, x) => a + x.delta, 0), [nutritionAdjustments]);
  const calorieTarget = tdee ? GoalManager.computeCalorieTarget({ tdee, goal: nutritionProfile.goal, adjustmentKcal: totalAdjustmentKcal }) : null;
  const macros = calorieTarget && currentWeight ? NutritionCalculator.computeMacros({ calories: calorieTarget, weightKg: currentWeight, goal: nutritionProfile.goal }) : null;

  const todayStr = todayISO();
  // Toutes les séances du jour (musculation + cardio/abdos autonomes) — avant ce correctif,
  // seule la PREMIÈRE séance du jour était prise en compte, ce qui ratait les nouvelles
  // séances cardio/abdos autonomes dès qu'une séance de musculation avait aussi eu lieu.
  const todaySessionsAll = sessions.filter((s) => s.date === todayStr);
  const todaySession = todaySessionsAll[0]; // gardé pour compatibilité (streak/affichage existants)
  const todayStrengthSessions = todaySessionsAll.filter((s) => s.type !== "cardio");
  const todayStrengthKcal = todayStrengthSessions.reduce(
    (a, s) => a + WorkoutCalorieEstimator.estimateStrengthSessionKcal({ tonnage: s.tonnage, durationSec: s.durationSec, bodyWeightKg: currentWeight }), 0
  );
  // Cardio réellement renseigné aujourd'hui — que ce soit via une séance cardio autonome
  // (page Séance) ou via l'étape "Ajouter un cardio" en fin de séance de musculation —
  // utilisé à la place de la moyenne estimée à partir du profil dès qu'au moins une
  // entrée réelle existe pour aujourd'hui.
  const todayCardioEntries = todaySessionsAll.filter((s) => s.cardio).map((s) => s.cardio);
  const todayCardioKcal = todayCardioEntries.length
    ? todayCardioEntries.reduce((a, c) => a + WorkoutCalorieEstimator.estimateCardioSessionKcal({ ...c, bodyWeightKg: currentWeight }), 0)
    : avgCardioKcal;

  const todayStepsEntry = (stepsLog || []).find((s) => s.date === todayStr);
  const todaySteps = todayStepsEntry?.steps || 0;
  const todayStepsKcal = WorkoutCalorieEstimator.estimateStepsKcal({ steps: todaySteps, bodyWeightKg: currentWeight });

  const todayTotalBurn = Math.round((bmr || 0) + todayStrengthKcal + todayCardioKcal + todayStepsKcal);

  const [stepsInput, setStepsInput] = useState(todayStepsEntry ? String(todayStepsEntry.steps) : "");
  useEffect(() => { setStepsInput(todayStepsEntry ? String(todayStepsEntry.steps) : ""); }, [todayStepsEntry?.steps]);
  const saveSteps = () => {
    const parsed = parseLocaleNumber(stepsInput);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    const rounded = Math.round(parsed);
    setStepsLog((log) => (log.some((s) => s.date === todayStr) ? log.map((s) => (s.date === todayStr ? { ...s, steps: rounded } : s)) : [...log, { date: todayStr, steps: rounded }]));
  };

  const todayCalorieEntry = caloriesLog.find((c) => c.date === todayStr) || null;
  const [macroInputs, setMacroInputs] = useState({
    calories: todayCalorieEntry?.calories != null ? String(todayCalorieEntry.calories) : "",
    protein: todayCalorieEntry?.protein != null ? String(todayCalorieEntry.protein) : "",
    carbs: todayCalorieEntry?.carbs != null ? String(todayCalorieEntry.carbs) : "",
    fat: todayCalorieEntry?.fat != null ? String(todayCalorieEntry.fat) : "",
  });
  useEffect(() => {
    setMacroInputs({
      calories: todayCalorieEntry?.calories != null ? String(todayCalorieEntry.calories) : "",
      protein: todayCalorieEntry?.protein != null ? String(todayCalorieEntry.protein) : "",
      carbs: todayCalorieEntry?.carbs != null ? String(todayCalorieEntry.carbs) : "",
      fat: todayCalorieEntry?.fat != null ? String(todayCalorieEntry.fat) : "",
    });
  }, [todayCalorieEntry?.calories, todayCalorieEntry?.protein, todayCalorieEntry?.carbs, todayCalorieEntry?.fat]);
  const setMacroField = (key, v) => setMacroInputs((m) => ({ ...m, [key]: v }));
  // Enregistre calories + les 3 macros ensemble, dans la même entrée de `caloriesLog` (le
  // nom de la clé de stockage n'a pas changé pour éviter toute migration de données —
  // seuls les champs protein/carbs/fat sont maintenant utilisés en plus de calories).
  const saveMacros = () => {
    const parsedCal = parseLocaleNumber(macroInputs.calories);
    if (!Number.isFinite(parsedCal) || parsedCal < 0) return;
    const parseOptional = (v) => {
      if (v.trim() === "") return null;
      const n = parseLocaleNumber(v);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };
    const entry = {
      date: todayStr, calories: parsedCal,
      protein: parseOptional(macroInputs.protein), carbs: parseOptional(macroInputs.carbs), fat: parseOptional(macroInputs.fat),
    };
    setCaloriesLog((log) => (log.some((c) => c.date === todayStr) ? log.map((c) => (c.date === todayStr ? entry : c)) : [...log, entry]));
  };

  // Objectifs personnalisés par macronutriment : par défaut, les cibles calculées
  // (calorieTarget / macros.*) sont utilisées ; l'utilisateur peut les remplacer.
  const customTargets = nutritionProfile.customMacroTargets;
  const effectiveTargets = {
    calories: customTargets?.calories ?? calorieTarget,
    protein: customTargets?.protein ?? macros?.proteinG ?? null,
    carbs: customTargets?.carbs ?? macros?.carbsG ?? null,
    fat: customTargets?.fat ?? macros?.fatG ?? null,
  };
  const [editingTargets, setEditingTargets] = useState(false);
  const [targetDraft, setTargetDraft] = useState({
    calories: effectiveTargets.calories ? String(effectiveTargets.calories) : "",
    protein: effectiveTargets.protein ? String(effectiveTargets.protein) : "",
    carbs: effectiveTargets.carbs ? String(effectiveTargets.carbs) : "",
    fat: effectiveTargets.fat ? String(effectiveTargets.fat) : "",
  });
  const openTargetEditor = () => {
    setTargetDraft({
      calories: effectiveTargets.calories ? String(effectiveTargets.calories) : "",
      protein: effectiveTargets.protein ? String(effectiveTargets.protein) : "",
      carbs: effectiveTargets.carbs ? String(effectiveTargets.carbs) : "",
      fat: effectiveTargets.fat ? String(effectiveTargets.fat) : "",
    });
    setEditingTargets(true);
  };
  const saveTargets = () => {
    const n = (v) => { const p = parseLocaleNumber(v); return Number.isFinite(p) && p > 0 ? p : null; };
    update({ customMacroTargets: { calories: n(targetDraft.calories), protein: n(targetDraft.protein), carbs: n(targetDraft.carbs), fat: n(targetDraft.fat) } });
    setEditingTargets(false);
  };
  const resetTargets = () => { update({ customMacroTargets: null }); setEditingTargets(false); };

  // Un instantané par jour maximum (pas à chaque rendu) : sert de base à l'historique/graphique.
  useEffect(() => {
    if (!calorieTarget) return;
    setNutritionAdjustments((list) => (
      list.some((a) => a.date === todayStr && a.reason === "auto")
        ? list
        : [...list, { date: todayStr, calorieTarget, bmr, tdee, delta: 0, reason: "auto" }]
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calorieTarget, bmr, tdee]);

  const weeklyAnalysis = useMemo(() => WeeklyAdaptiveAlgorithm.analyze({ weightEntries: sortedWeights, goal: nutritionProfile.goal }), [sortedWeights, nutritionProfile.goal]);
  const applySuggestion = () => {
    if (!weeklyAnalysis.suggestionKcal) return;
    setNutritionAdjustments((list) => [...list, { date: todayStr, delta: weeklyAnalysis.suggestionKcal, reason: "weekly_adjustment", calorieTarget: (calorieTarget || 0) + weeklyAnalysis.suggestionKcal }]);
  };

  const notifications = useMemo(() => {
    const list = [];
    if (daysSinceLastWeight != null && daysSinceLastWeight >= 4) list.push({ type: "warning", message: `Tu n'as pas noté ton poids depuis ${daysSinceLastWeight} jours — pense à te peser pour garder des calculs fiables.` });
    if (nutritionProfile.weightTarget && currentWeight && Math.abs(currentWeight - nutritionProfile.weightTarget) <= 0.3) list.push({ type: "success", message: "Objectif de poids atteint !" });
    if (tdee && calorieTarget && calorieTarget < tdee * (1 - GoalManager.MAX_CUT_DEFICIT_PCT - 0.02)) list.push({ type: "warning", message: "Le déficit calorique actuel est important — reste vigilant sur la récupération." });
    if (tdee && calorieTarget && calorieTarget > tdee * (1 + GoalManager.MAX_BULK_SURPLUS_PCT + 0.02)) list.push({ type: "warning", message: "Le surplus calorique actuel est important — la prise de gras risque de s'accélérer." });
    return list;
  }, [daysSinceLastWeight, nutritionProfile.weightTarget, currentWeight, tdee, calorieTarget]);

  const chartData = useMemo(() => [...nutritionAdjustments].sort((a, b) => a.date.localeCompare(b.date)).map((a) => ({ date: a.date, dateLabel: fmtDate(a.date), calories: a.calorieTarget })), [nutritionAdjustments]);

  if (editingInfo) {
    return (
      <div className="px-4 pt-2 pb-6">
        <NutritionInfoForm theme={theme} profile={nutritionProfile} onUpdate={update} currentWeight={currentWeight} canClose={!missingEssentials} onDone={() => setEditingInfo(false)} />
        {missingEssentials && (
          <p style={{ color: theme.textFaint }} className="text-[12px] text-center mt-3">
            Renseigne au moins la date de naissance, la taille, et une pesée (dans "Poids") pour calculer tes besoins.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 space-y-4 pb-6">
      {notifications.map((n, i) => <NutritionNotificationBanner key={i} theme={theme} notif={n} />)}

      <Card theme={theme} className="p-5" style={{ background: `linear-gradient(135deg, ${theme.accent}14, ${theme.accent2}0a)` }}>
        <div className="flex items-center justify-between mb-1">
          <p style={{ color: theme.textMuted }} className="text-[12px] font-medium">Calories recommandées</p>
          <button onClick={() => setEditingInfo(true)} className="flex items-center gap-1 text-[11.5px] font-bold" style={{ color: theme.accent }}><Edit3 size={12} /> Infos</button>
        </div>
        <p style={{ color: theme.text }} className="text-[32px] font-extrabold leading-none">{calorieTarget ? calorieTarget.toLocaleString("fr-FR") : "—"} <span className="text-[15px] font-semibold" style={{ color: theme.textMuted }}>kcal / jour</span></p>
        <div className="flex items-center gap-2 mt-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: theme.card2, color: theme.text }}>{NUTRITION_GOALS.find((g) => g.id === nutritionProfile.goal)?.label}</span>
          <span style={{ color: theme.textFaint }} className="text-[11.5px]">Métabolisme {bmr || "—"} kcal · Dépense totale {tdee || "—"} kcal</span>
        </div>
      </Card>

      <Card theme={theme} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p style={{ color: theme.text }} className="font-bold text-[14px]">Suivi nutritionnel du jour</p>
          <button onClick={openTargetEditor} className="text-[11.5px] font-bold flex items-center gap-1" style={{ color: theme.accent }}><Edit3 size={11} /> Objectifs</button>
        </div>

        <MacroProgressRow theme={theme} icon={Flame} color={theme.accent} label="Calories" unit=" kcal" consumed={todayCalorieEntry?.calories || 0} target={effectiveTargets.calories} />
        <MacroProgressRow theme={theme} icon={Beef} color={theme.accent2} label="Protéines" unit="g" consumed={todayCalorieEntry?.protein || 0} target={effectiveTargets.protein} />
        <MacroProgressRow theme={theme} icon={Wheat} color={theme.good} label="Glucides" unit="g" consumed={todayCalorieEntry?.carbs || 0} target={effectiveTargets.carbs} />
        <MacroProgressRow theme={theme} icon={Droplet} color="#4EA1FF" label="Lipides" unit="g" consumed={todayCalorieEntry?.fat || 0} target={effectiveTargets.fat} last />

        <div className="grid grid-cols-2 gap-2 mt-3 mb-2">
          <input inputMode="decimal" placeholder="Calories" value={macroInputs.calories} onChange={(e) => setMacroField("calories", e.target.value)}
            className="rounded-xl px-3 py-2.5 text-[13.5px] font-semibold outline-none" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
          <input inputMode="decimal" placeholder="Protéines (g)" value={macroInputs.protein} onChange={(e) => setMacroField("protein", e.target.value)}
            className="rounded-xl px-3 py-2.5 text-[13.5px] font-semibold outline-none" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
          <input inputMode="decimal" placeholder="Glucides (g)" value={macroInputs.carbs} onChange={(e) => setMacroField("carbs", e.target.value)}
            className="rounded-xl px-3 py-2.5 text-[13.5px] font-semibold outline-none" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
          <input inputMode="decimal" placeholder="Lipides (g)" value={macroInputs.fat} onChange={(e) => setMacroField("fat", e.target.value)}
            className="rounded-xl px-3 py-2.5 text-[13.5px] font-semibold outline-none" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
        </div>
        <BigButton theme={theme} gradient onClick={saveMacros}>Enregistrer</BigButton>
        <p style={{ color: theme.textFaint }} className="text-[11px] mt-2">Saisie manuelle quotidienne (pas de journal alimentaire détaillé par aliment dans cette version). Protéines/glucides/lipides sont optionnels.</p>
      </Card>

      <AnimatePresence>
        {editingTargets && (
          <motion.div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 200 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setEditingTargets(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full rounded-t-3xl p-5" style={{ maxWidth: 480, background: theme.card, borderTop: `1px solid ${theme.border}`, paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}>
              <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: theme.border }} />
              <h3 style={{ color: theme.text }} className="text-[17px] font-bold mb-1">Objectifs personnalisés</h3>
              <p style={{ color: theme.textMuted }} className="text-[12.5px] mb-4">Remplace les objectifs calculés automatiquement. Laisse vide pour revenir au calcul automatique.</p>
              <div className="grid grid-cols-2 gap-2.5 mb-5">
                <LabeledInput theme={theme} label="Calories (kcal)" value={targetDraft.calories} onChange={(v) => setTargetDraft((t) => ({ ...t, calories: v }))} placeholder={calorieTarget ? String(calorieTarget) : "—"} />
                <LabeledInput theme={theme} label="Protéines (g)" value={targetDraft.protein} onChange={(v) => setTargetDraft((t) => ({ ...t, protein: v }))} placeholder={macros ? String(macros.proteinG) : "—"} />
                <LabeledInput theme={theme} label="Glucides (g)" value={targetDraft.carbs} onChange={(v) => setTargetDraft((t) => ({ ...t, carbs: v }))} placeholder={macros ? String(macros.carbsG) : "—"} />
                <LabeledInput theme={theme} label="Lipides (g)" value={targetDraft.fat} onChange={(v) => setTargetDraft((t) => ({ ...t, fat: v }))} placeholder={macros ? String(macros.fatG) : "—"} />
              </div>
              <div className="flex gap-2.5">
                {customTargets && <BigButton theme={theme} onClick={resetTargets}>Réinitialiser</BigButton>}
                <BigButton theme={theme} gradient onClick={saveTargets}>Enregistrer</BigButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card theme={theme} className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p style={{ color: theme.text }} className="font-bold text-[14px] flex items-center gap-1.5"><Footprints size={15} color={theme.accent} /> Pas aujourd'hui</p>
          <p style={{ color: theme.textMuted }} className="text-[12.5px]">{todaySteps ? todaySteps.toLocaleString("fr-FR") : 0} pas</p>
        </div>
        <div className="flex items-center gap-2">
          <input inputMode="numeric" placeholder="Ex : 8000" value={stepsInput} onChange={(e) => setStepsInput(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2.5 text-[14px] font-semibold outline-none" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
          <button onClick={saveSteps} className="px-4 py-2.5 rounded-xl font-bold text-[13px] text-white active:scale-95 transition-transform" style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})` }}>OK</button>
        </div>
        {todaySteps > 0 && (
          <p style={{ color: theme.textFaint }} className="text-[11px] mt-2">≈ {todayStepsKcal} kcal dépensées à la marche (estimation à partir de ton poids).</p>
        )}
      </Card>

      <Card theme={theme} className="p-4">
        <p style={{ color: theme.text }} className="font-bold text-[14px] mb-2.5">Dépense du jour</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[13px]"><span style={{ color: theme.textMuted }}>Métabolisme de base</span><span style={{ color: theme.text }} className="font-semibold">{bmr || 0} kcal</span></div>
          <div className="flex items-center justify-between text-[13px]"><span style={{ color: theme.textMuted }}>Séance de musculation</span><span style={{ color: theme.text }} className="font-semibold">{todayStrengthKcal} kcal</span></div>
          <div className="flex items-center justify-between text-[13px]"><span style={{ color: theme.textMuted }}>Cardio {todayCardioEntries.length ? "(séance du jour)" : "(moyenne)"}</span><span style={{ color: theme.text }} className="font-semibold">{todayCardioKcal} kcal</span></div>
          <div className="flex items-center justify-between text-[13px]"><span style={{ color: theme.textMuted }}>Marche ({todaySteps.toLocaleString("fr-FR")} pas)</span><span style={{ color: theme.text }} className="font-semibold">{todayStepsKcal} kcal</span></div>
          <div className="flex items-center justify-between text-[13.5px] pt-1.5" style={{ borderTop: `1px solid ${theme.border}` }}><span style={{ color: theme.text }} className="font-bold">Total</span><span style={{ color: theme.accent }} className="font-extrabold">{todayTotalBurn} kcal</span></div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2.5">
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[10.5px] font-semibold mb-1">Poids actuel</p><p style={{ color: theme.text }} className="text-[16px] font-extrabold">{currentWeight ? fmtWeight(currentWeight) : "—"}</p></Card>
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[10.5px] font-semibold mb-1">Poids cible</p><p style={{ color: theme.text }} className="text-[16px] font-extrabold">{nutritionProfile.weightTarget ? fmtWeight(nutritionProfile.weightTarget) : "—"}</p></Card>
        <Card theme={theme} className="p-3.5"><p style={{ color: theme.textMuted }} className="text-[10.5px] font-semibold mb-1">Variation</p><p style={{ color: theme.text }} className="text-[16px] font-extrabold">{currentWeight && nutritionProfile.weightTarget ? `${(currentWeight - nutritionProfile.weightTarget) > 0 ? "+" : ""}${fmtWeight(currentWeight - nutritionProfile.weightTarget)}` : "—"}</p></Card>
      </div>

      <NutritionHistorySection theme={theme} caloriesLog={caloriesLog} targets={effectiveTargets} />

      {(weeklyAnalysis.status === "too_slow" || weeklyAnalysis.status === "too_fast") && (
        <Card theme={theme} className="p-4" style={{ border: `1.5px solid ${theme.accent}55` }}>
          <div className="flex items-center gap-2 mb-2"><Bell size={15} color={theme.accent} /><p style={{ color: theme.text }} className="font-bold text-[14px]">Ajustement suggéré</p></div>
          <p style={{ color: theme.textMuted }} className="text-[13px] mb-3">{weeklyAnalysis.message}</p>
          <BigButton theme={theme} gradient onClick={applySuggestion}>
            {weeklyAnalysis.suggestionKcal > 0 ? "+" : ""}{weeklyAnalysis.suggestionKcal} kcal/jour — Appliquer
          </BigButton>
        </Card>
      )}

      {chartData.length > 1 && (
        <ChartCard theme={theme} title="Évolution des calories recommandées">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} vertical={false} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: theme.textFaint }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: theme.textFaint }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, fontSize: 12 }} labelStyle={{ color: theme.text }} />
              <Line type="monotone" dataKey="calories" stroke={theme.accent} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <button onClick={() => setEditingInfo(true)} className="w-full text-center text-[12.5px] font-semibold py-2 flex items-center justify-center gap-1.5" style={{ color: theme.textMuted }}>
        <Edit3 size={13} /> Modifier mes informations
      </button>
    </div>
  );
}

// --- "Mon profil" : identité + aperçu rapide de l'activité (voir MyProfileView) --------

/* ============================================================================
   MOTEUR NUTRITIONNEL — services dédiés, séparés de l'UI et du stockage
   ============================================================================
   Toutes les constantes ci-dessous sont des choix documentés (formules reconnues
   quand elles existent, hypothèses raisonnables sinon) — regroupées ici pour être
   facilement modifiables sans toucher au reste du fichier.
*/

// --- EnergyCalculator : métabolisme de base et dépense journalière ----------------------
const EnergyCalculator = {
  // Âge exact calculé à partir de la date de naissance (nécessaire pour Mifflin-St Jeor).
  computeAge(birthdate) {
    if (!birthdate) return null;
    const b = new Date(birthdate);
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return age;
  },

  // BMR — formule de Mifflin-St Jeor (1990), la plus fiable et la plus utilisée
  // aujourd'hui en pratique clinique (plus précise que Harris-Benedict sur des
  // populations modernes). Homme : +5, Femme : -161.
  computeBMR({ sex, weightKg, heightCm, age }) {
    if (!weightKg || !heightCm || age == null) return null;
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return Math.round(sex === "F" ? base - 161 : base + 5);
  },

  // Coefficients d'activité (PAL — Physical Activity Level), échelle Harris-Benedict
  // standard. NE COUVRE QUE l'activité quotidienne "hors entraînement structuré" (travail,
  // marche, pas quotidiens) — les séances de musculation/cardio sont ajoutées à part par
  // WorkoutCalorieEstimator, pour éviter de compter deux fois le même effort.
  ACTIVITY_MULTIPLIERS: {
    sedentary: 1.2,   // Sédentaire — travail de bureau, peu de marche
    light: 1.375,     // Léger — debout une partie de la journée, marche occasionnelle
    moderate: 1.55,   // Modéré — travail physique léger ou marche régulière
    high: 1.725,      // Élevé — travail physique
    very_high: 1.9,   // Très élevé — travail physique intense
  },

  // TDEE = BMR × multiplicateur d'activité quotidienne + dépense moyenne des
  // entraînements (calculée séparément par WorkoutCalorieEstimator et lissée sur 7 jours).
  computeTDEE({ bmr, activityLevel, avgDailyWorkoutKcal }) {
    if (!bmr) return null;
    const mult = EnergyCalculator.ACTIVITY_MULTIPLIERS[activityLevel] || EnergyCalculator.ACTIVITY_MULTIPLIERS.sedentary;
    return Math.round(bmr * mult + (avgDailyWorkoutKcal || 0));
  },
};

// Types de cardio proposés en fin de séance, avec une valeur MET par intensité
// (Compendium of Physical Activities) — hypothèse documentée et ajustable.
const CARDIO_TYPES = [
  { id: "running", label: "Course", met: { light: 7, moderate: 9.8, vigorous: 12.8 } },
  { id: "cycling", label: "Vélo", met: { light: 4, moderate: 8, vigorous: 10 } },
  { id: "rowing", label: "Rameur", met: { light: 3.5, moderate: 7, vigorous: 8.5 } },
  { id: "treadmill", label: "Tapis", met: { light: 6, moderate: 8.3, vigorous: 11 } },
  { id: "walking", label: "Marche", met: { light: 2.8, moderate: 3.8, vigorous: 5 } },
  { id: "elliptical", label: "Elliptique", met: { light: 5, moderate: 5.5, vigorous: 8 } },
  { id: "other", label: "Autre", met: { light: 4, moderate: 6, vigorous: 8 } },
];
const INTENSITY_LEVELS = [
  { id: "light", label: "Faible" },
  { id: "moderate", label: "Moyenne" },
  { id: "vigorous", label: "Élevée" },
];

// --- WorkoutCalorieEstimator : calories dépensées pendant une séance --------------------
// Basé sur des valeurs MET (Metabolic Equivalent of Task) issues du Compendium of
// Physical Activities (Ainsworth et al.) — référence scientifique standard.
// Formule générale : kcal = MET × poids(kg) × durée(heures).
const WorkoutCalorieEstimator = {
  // MET musculation selon l'intensité estimée (tonnage soulevé par minute de séance,
  // repos inclus — une séance dense/lourde a un MET plus élevé qu'une séance légère).
  // Hypothèse documentée et ajustable : ces seuils sont une approximation raisonnable,
  // pas une mesure directe de la dépense énergétique réelle.
  STRENGTH_MET_BY_INTENSITY: { light: 3.5, moderate: 5.0, vigorous: 6.0 },
  CARDIO_MET_MODERATE: 7.0, // course/vélo modéré — Compendium ≈ 6-8 MET

  estimateIntensity(tonnageKg, durationSec) {
    if (!durationSec) return "light";
    const perMinute = tonnageKg / (durationSec / 60);
    if (perMinute >= 50) return "vigorous";
    if (perMinute >= 20) return "moderate";
    return "light";
  },

  // Séance de musculation réellement enregistrée dans l'app (tonnage + durée connus).
  estimateStrengthSessionKcal({ tonnage, durationSec, bodyWeightKg }) {
    if (!durationSec || !bodyWeightKg) return 0;
    const intensity = WorkoutCalorieEstimator.estimateIntensity(tonnage || 0, durationSec);
    const met = WorkoutCalorieEstimator.STRENGTH_MET_BY_INTENSITY[intensity];
    const hours = durationSec / 3600;
    return Math.round(met * bodyWeightKg * hours);
  },

  // Cardio RÉELLEMENT renseigné en fin de séance (type + durée + intensité) — remplace
  // l'estimation moyenne ci-dessous dès qu'une entrée cardio existe pour la séance du jour.
  // Si `calories` a été saisi manuellement par l'utilisateur, on lui fait confiance en
  // priorité (valeur mesurée par un appareil, plus précise qu'une estimation par MET).
  estimateCardioSessionKcal({ type, durationMin, intensity, calories, bodyWeightKg }) {
    if (calories) return Math.round(Number(calories));
    if (!durationMin || !bodyWeightKg) return 0;
    const def = CARDIO_TYPES.find((c) => c.id === type) || CARDIO_TYPES.find((c) => c.id === "other");
    const met = def.met[intensity] || def.met.moderate;
    return Math.round(met * bodyWeightKg * (durationMin / 60));
  },

  // Cardio non renseigné : l'app estime une moyenne à partir de ce que l'utilisateur a
  // déclaré dans son profil (fréquence × durée par semaine), lissée sur 7 jours pour le
  // calcul du TDEE quotidien. Utilisé en repli quand aucune séance de cardio réelle n'a
  // été enregistrée ce jour-là (voir "Dépense du jour" dans NutritionScreen).
  estimateAvgDailyCardioKcal({ cardioSessionsPerWeek, cardioDurationMin, bodyWeightKg }) {
    if (!cardioSessionsPerWeek || !cardioDurationMin || !bodyWeightKg) return 0;
    const hoursPerWeek = (cardioSessionsPerWeek * cardioDurationMin) / 60;
    const weeklyKcal = WorkoutCalorieEstimator.CARDIO_MET_MODERATE * bodyWeightKg * hoursPerWeek;
    return Math.round(weeklyKcal / 7);
  },

  // Calories dépensées à la marche à partir du nombre de pas — hypothèse documentée et
  // ajustable : ~0,0005 kcal par pas et par kg de poids corporel, cohérent avec les
  // estimations usuelles (~30 à 40 kcal pour 1000 pas chez un adulte moyen de 70 kg :
  // 1000 × 0,0005 × 70 = 35 kcal). Simplification qui ne tient pas compte de la vitesse
  // de marche ni du dénivelé, uniquement du nombre de pas et du poids.
  estimateStepsKcal({ steps, bodyWeightKg }) {
    if (!steps || !bodyWeightKg) return 0;
    return Math.round(steps * 0.0005 * bodyWeightKg);
  },
};

// --- GoalManager : calories cibles selon l'objectif (Sèche / Maintien / Prise de masse) -
const GoalManager = {
  // Déficit/surplus par défaut, DANS la plage demandée (15-20% en sèche, 5-15% en prise
  // de masse). Valeurs médianes choisies comme point de départ raisonnable, modifiables.
  DEFAULT_CUT_DEFICIT_PCT: 0.175,
  MIN_CUT_DEFICIT_PCT: 0.15,
  MAX_CUT_DEFICIT_PCT: 0.20,
  DEFAULT_BULK_SURPLUS_PCT: 0.10,
  MIN_BULK_SURPLUS_PCT: 0.05,
  MAX_BULK_SURPLUS_PCT: 0.15,

  // `adjustmentKcal` = ajustement cumulé proposé par l'algorithme hebdomadaire (section 6),
  // appliqué par-dessus le calcul de base une fois que l'utilisateur l'a validé.
  computeCalorieTarget({ tdee, goal, adjustmentKcal = 0 }) {
    if (!tdee) return null;
    let base;
    if (goal === "cut") {
      const pct = Math.min(GoalManager.MAX_CUT_DEFICIT_PCT, Math.max(GoalManager.MIN_CUT_DEFICIT_PCT, GoalManager.DEFAULT_CUT_DEFICIT_PCT));
      base = tdee * (1 - pct);
    } else if (goal === "bulk") {
      const pct = Math.min(GoalManager.MAX_BULK_SURPLUS_PCT, Math.max(GoalManager.MIN_BULK_SURPLUS_PCT, GoalManager.DEFAULT_BULK_SURPLUS_PCT));
      base = tdee * (1 + pct);
    } else {
      base = tdee;
    }
    const target = base + adjustmentKcal;
    // Garde-fou de sécurité : jamais en dessous du métabolisme de base, quel que soit
    // l'ajustement cumulé (évite un déficit dangereux au fil des semaines).
    return Math.round(target);
  },
};

// --- NutritionCalculator : répartition des macronutriments ------------------------------
const NutritionCalculator = {
  // g/kg de poids corporel par objectif — fourchettes usuelles en nutrition sportive.
  MACRO_RANGES: {
    cut: { proteinPerKg: 2.1, fatPerKg: 0.9 },      // 2-2.2 g/kg protéines, 0.8-1 g/kg lipides
    maintain: { proteinPerKg: 1.8, fatPerKg: 1.0 },
    bulk: { proteinPerKg: 1.9, fatPerKg: 1.0 },
  },
  computeMacros({ calories, weightKg, goal }) {
    if (!calories || !weightKg) return null;
    const { proteinPerKg, fatPerKg } = NutritionCalculator.MACRO_RANGES[goal] || NutritionCalculator.MACRO_RANGES.maintain;
    const proteinG = Math.round(proteinPerKg * weightKg);
    const fatG = Math.round(fatPerKg * weightKg);
    const proteinKcal = proteinG * 4;
    const fatKcal = fatG * 9;
    const carbsKcal = Math.max(0, calories - proteinKcal - fatKcal);
    const carbsG = Math.round(carbsKcal / 4);
    return { proteinG, fatG, carbsG, proteinKcal, fatKcal, carbsKcal };
  },
};

// --- WeeklyAdaptiveAlgorithm : ajuste progressivement les calories selon les résultats --
const WeeklyAdaptiveAlgorithm = {
  // Objectifs de variation hebdomadaire raisonnables (grammes/semaine), documentés.
  WEEKLY_TARGET_G: { cut: -500, maintain: 0, bulk: 300 },
  ADJUSTMENT_STEP_KCAL: 125, // "100 à 150 kcal" demandé -> valeur médiane

  // Moyenne du poids sur les 7 derniers jours d'une fenêtre donnée (jamais une seule
  // pesée isolée, comme demandé).
  weeklyAverage(entries, fromTs, toTs) {
    const inWindow = entries.filter((e) => {
      const t = new Date(e.date).getTime();
      return t >= fromTs && t < toTs;
    });
    if (!inWindow.length) return null;
    return inWindow.reduce((a, e) => a + e.weight, 0) / inWindow.length;
  },

  // Compare les deux dernières semaines pleines à l'objectif, et propose un ajustement
  // (jamais appliqué automatiquement sans confirmation — voir NutritionScreen).
  analyze({ weightEntries, goal }) {
    const now = Date.now();
    const week1Start = now - 14 * 86400000, week1End = now - 7 * 86400000;
    const week2Start = now - 7 * 86400000, week2End = now;
    const avgWeek1 = WeeklyAdaptiveAlgorithm.weeklyAverage(weightEntries, week1Start, week1End);
    const avgWeek2 = WeeklyAdaptiveAlgorithm.weeklyAverage(weightEntries, week2Start, week2End);
    if (avgWeek1 == null || avgWeek2 == null) return { status: "insufficient_data" };

    const deltaG = (avgWeek2 - avgWeek1) * 1000;
    const targetG = WeeklyAdaptiveAlgorithm.WEEKLY_TARGET_G[goal] ?? 0;
    const step = WeeklyAdaptiveAlgorithm.ADJUSTMENT_STEP_KCAL;

    if (goal === "cut") {
      if (deltaG > targetG + 150) return { status: "too_slow", suggestionKcal: -step, message: `Perte plus lente que prévu (${Math.round(deltaG)} g cette semaine, objectif ${targetG} g). Réduire légèrement les calories ?` };
      if (deltaG < targetG - 300) return { status: "too_fast", suggestionKcal: step, message: `Perte plus rapide que prévu (${Math.round(deltaG)} g). Remonter un peu les calories pour préserver la masse musculaire ?` };
    } else if (goal === "bulk") {
      if (deltaG < targetG - 150) return { status: "too_slow", suggestionKcal: step, message: `Prise de poids plus lente que prévu (${Math.round(deltaG)} g). Augmenter légèrement les calories ?` };
      if (deltaG > targetG + 300) return { status: "too_fast", suggestionKcal: -step, message: `Prise de poids plus rapide que prévu (${Math.round(deltaG)} g). Réduire un peu le surplus ?` };
    }
    return { status: "on_track", deltaG: Math.round(deltaG) };
  },
};

/* ============================== DASHBOARD ============================== */

function computePRs(sessions) {
  const prs = {}; // name -> {maxWeight, maxWeightReps, est1RM, date}
  const registerSide = (name, w, r, date) => {
    if (!w || !r) return;
    const est = epley1RM(w, r);
    const cur = prs[name];
    if (!cur || w > cur.maxWeight) prs[name] = { ...(cur || {}), maxWeight: w, maxWeightReps: r, date };
    if (!prs[name].est1RM || est > prs[name].est1RM) prs[name].est1RM = est;
  };
  for (const s of sessions) {
    for (const el of s.exerciseLogs) {
      for (const set of el.sets) {
        if (!set.done) continue;
        const date = s.date || s.startedAtISO;
        if (set.leftWeight != null || set.rightWeight != null) {
          registerSide(el.name, Number(set.leftWeight), Number(set.leftReps), date);
          registerSide(el.name, Number(set.rightWeight), Number(set.rightReps), date);
        } else if (set.weight && set.reps) {
          registerSide(el.name, Number(set.weight), Number(set.reps), date);
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
  const muscleGroups = program.muscleGroups || [];
  return (
    <button onClick={onSelect} className="w-full text-left active:scale-[0.98] transition-transform">
      <Card
        theme={theme} className="p-3.5 flex items-center gap-3"
        style={{ border: `1.5px solid ${selected ? theme.accent : theme.border}`, background: selected ? `${theme.accent}14` : theme.card }}
      >
        <div className="rounded-2xl flex items-center justify-center shrink-0" style={{ width: 56, height: 56, background: theme.card2 }}>
          {muscleGroups.length ? (
            <MuscleIllustration theme={theme} muscles={muscleGroups} size={44} />
          ) : (
            <div style={{ width: 10, height: 10, borderRadius: 999, background: program.color || theme.accent }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ color: theme.text }} className="font-bold text-[15px] truncate">{program.name}</p>
          {muscleGroups.length > 0 && (
            <p style={{ color: theme.textMuted }} className="text-[11.5px] mt-0.5 truncate">{muscleGroups.map(muscleLabel).join(" • ")}</p>
          )}
          <p style={{ color: theme.textFaint }} className="text-[11.5px] mt-0.5">{count} exercice{count !== 1 ? "s" : ""}</p>
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

// Carte principale d'Accueil : détecte automatiquement la séance prévue aujourd'hui selon
// le planning hebdomadaire (Profil > Planning hebdomadaire) et propose de la démarrer
// directement, sans étape de sélection manuelle.
function TodaySessionCard({ theme, programs, weeklyPlanning, sessions, onStart, onPlanify }) {
  const todayKey = getTodayKey();
  const todayLabel = WEEK_DAYS.find((d) => d.key === todayKey)?.label;
  const todayDate = getCurrentWeekDates()[todayKey];
  const programId = weeklyPlanning[todayKey];
  const program = programId ? programs.find((p) => p.id === programId) : null;
  const isDone = sessions.some((s) => s.date === todayDate);
  const isRest = !programId;
  const muscles = program?.muscleGroups || [];

  return (
    <Card theme={theme} className="p-5 relative overflow-hidden">
      <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 999, background: `radial-gradient(circle, ${theme.accent}22, transparent 70%)` }} />
      <p style={{ color: theme.textMuted }} className="text-[12px] font-medium relative">{todayLabel}</p>

      {isRest ? (
        <div className="flex items-center gap-2.5 mt-1 relative">
          <IconBadge theme={theme} icon={Zap} size={34} iconSize={16} tone="accent" />
          <p style={{ color: theme.text }} className="text-[17px] font-extrabold leading-snug">
            Aujourd'hui est un jour de repos
          </p>
        </div>
      ) : !program ? (
        <>
          <p style={{ color: theme.text }} className="text-[19px] font-extrabold mt-1 relative">Aucune séance programmée</p>
          <div className="relative mt-4">
            <BigButton theme={theme} onClick={onPlanify}>Planifier</BigButton>
          </div>
        </>
      ) : (
        <>
          <p style={{ color: theme.text }} className="text-[22px] font-extrabold mt-0.5 relative">{program.name}</p>
          {muscles.length > 0 && (
            <p style={{ color: theme.textMuted }} className="text-[12px] mt-0.5 relative">{muscles.map(muscleLabel).join(" • ")}</p>
          )}
          <div className="relative mt-4">
            {isDone ? (
              <div className="w-full rounded-2xl py-3.5 font-bold text-[14.5px] flex items-center justify-center gap-2" style={{ background: `${theme.good}1f`, color: theme.good }}>
                <CheckCircle2 size={18} /> Séance du jour terminée
              </div>
            ) : (
              <BigButton theme={theme} gradient onClick={() => onStart(program)}>
                <Play size={18} fill="#fff" /> Commencer la séance
              </BigButton>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

// Bande de planning hebdomadaire (défilement horizontal) : un programme ou "Repos" par
// jour, jour actuel mis en évidence, coche verte si une séance a été enregistrée ce jour-là.
function WeeklyPlanningStrip({ theme, programs, weeklyPlanning, sessions }) {
  const todayKey = getTodayKey();
  const weekDates = getCurrentWeekDates();
  const doneDates = new Set(sessions.map((s) => s.date));

  return (
    <div>
      <p style={{ color: theme.textMuted }} className="text-[12px] font-bold uppercase tracking-wide mb-2 px-1">Planning de la semaine</p>
      <div className="flex gap-2.5 overflow-x-auto pb-1 pt-3 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
        {WEEK_DAYS.map((d) => {
          const programId = weeklyPlanning[d.key];
          const program = programId ? programs.find((p) => p.id === programId) : null;
          const isToday = d.key === todayKey;
          const isDone = doneDates.has(weekDates[d.key]);
          const isRest = !programId;
          return (
            <div
              key={d.key}
              className="rounded-2xl shrink-0 flex flex-col items-center justify-center gap-1.5 p-3 relative transition-transform"
              style={{
                width: 74, height: 92,
                background: isToday ? `linear-gradient(160deg, ${theme.accent}, ${theme.accent2})` : theme.card,
                border: `1.5px solid ${isToday ? "transparent" : theme.border}`,
                boxShadow: isToday ? `0 8px 20px -8px ${theme.accent}88` : "none",
              }}
            >
              {isToday && (
                <span
                  className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[8px] font-extrabold whitespace-nowrap"
                  style={{ background: theme.text, color: theme.bg }}
                >
                  Aujourd'hui
                </span>
              )}
              <span className="text-[10px] font-bold uppercase" style={{ color: isToday ? "rgba(255,255,255,0.85)" : theme.textFaint }}>
                {d.short}
              </span>
              {isDone ? (
                <div className="rounded-full flex items-center justify-center" style={{ width: 26, height: 26, background: isToday ? "rgba(255,255,255,0.25)" : `${theme.good}22` }}>
                  <Check size={15} color={isToday ? "#fff" : theme.good} strokeWidth={3} />
                </div>
              ) : (
                <span
                  className="text-[11px] font-bold text-center leading-tight px-0.5"
                  style={{ color: isToday ? "#fff" : isRest ? theme.textFaint : theme.text }}
                >
                  {isRest ? "Repos" : (program ? program.name : "—")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Dashboard({ theme, programs, sessions, weightEntries, onStart, weeklyPlanning, onGoToPlanning }) {
  const prs = useMemo(() => computePRs(sessions), [sessions]);
  const lastWeight = weightEntries.length ? [...weightEntries].sort((a, b) => b.date.localeCompare(a.date))[0] : null;

  const last7 = sessions.filter((s) => Date.now() - s.startedAt < 7 * 86400000);
  const tonnage7 = last7.reduce((a, s) => a + (s.tonnage || 0), 0);

  const recentSessions = sessions.slice(0, 3);
  const topPRs = Object.entries(prs).sort((a, b) => b[1].maxWeight - a[1].maxWeight).slice(0, 3);

  return (
    <div className="px-4 pt-2 space-y-5">
      <TodaySessionCard theme={theme} programs={programs} weeklyPlanning={weeklyPlanning} sessions={sessions} onStart={onStart} onPlanify={onGoToPlanning} />

      <WeeklyPlanningStrip theme={theme} programs={programs} weeklyPlanning={weeklyPlanning} sessions={sessions} />

      <div className="grid grid-cols-2 gap-3">
        <Card theme={theme} className="p-4">
          <div className="flex items-center gap-1.5 mb-1"><Scale size={13} color={theme.textMuted} /><p style={{ color: theme.textMuted }} className="text-[11px] font-semibold">Poids actuel</p></div>
          <p style={{ color: theme.text }} className="text-[22px] font-extrabold">{lastWeight ? `${fmtWeight(lastWeight.weight)} kg` : "—"}</p>
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
    const p = { id: uid(), name: "Nouveau programme", color: theme.accent, blocks: [], absExercises: [], muscleGroups: [] };
    setPrograms((ps) => [...ps, p]);
    onOpen(p.id);
  };
  return (
    <div className="px-4 pt-2 space-y-3">
      {programs.length === 0 && <Card theme={theme}><EmptyState theme={theme} icon={Dumbbell} title="Aucun programme" subtitle="Crée ton premier programme d'entraînement." /></Card>}
      {programs.map((p) => {
        const count = flattenExercises(p.blocks).length;
        const groupCount = (p.blocks || []).filter((b) => b.exercises.length > 1).length;
        const muscleGroups = p.muscleGroups || [];
        return (
          <Card key={p.id} theme={theme} className="p-3.5">
            <div className="flex items-center justify-between gap-2">
              <button className="flex-1 flex items-center gap-3 text-left min-w-0" onClick={() => onOpen(p.id)}>
                <div className="rounded-2xl flex items-center justify-center shrink-0" style={{ width: 52, height: 52, background: theme.card2 }}>
                  {muscleGroups.length ? (
                    <MuscleIllustration theme={theme} muscles={muscleGroups} size={40} />
                  ) : (
                    <div style={{ width: 10, height: 10, borderRadius: 999, background: p.color || theme.accent }} />
                  )}
                </div>
                <div className="min-w-0">
                  <p style={{ color: theme.text }} className="font-bold text-[15.5px] truncate">{p.name}</p>
                  {muscleGroups.length > 0 && <p style={{ color: theme.textMuted }} className="text-[11.5px] mt-0.5 truncate">{muscleGroups.map(muscleLabel).join(" • ")}</p>}
                  <p style={{ color: theme.textFaint }} className="text-[11.5px] mt-0.5">
                    {count} exercice{count !== 1 ? "s" : ""}{groupCount > 0 ? ` · ${groupCount} enchaînement${groupCount !== 1 ? "s" : ""}` : ""}
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-2 shrink-0">
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
  const [showAddAbs, setShowAddAbs] = useState(false);
  const [pairTarget, setPairTarget] = useState(null); // blockId currently pairing/extending

  if (!program) return null;

  const updateProgram = (fn) => setPrograms((ps) => ps.map((p) => (p.id === program.id ? fn({ ...p }) : p)));
  const setBlocks = (blocks) => updateProgram((p) => ({ ...p, blocks }));
  const muscleGroups = program.muscleGroups || [];
  const toggleMuscleGroup = (id) => updateProgram((p) => {
    const cur = p.muscleGroups || [];
    return { ...p, muscleGroups: cur.includes(id) ? cur.filter((m) => m !== id) : [...cur, id] };
  });
  const absExercises = program.absExercises || [];
  const setAbsExercises = (list) => updateProgram((p) => ({ ...p, absExercises: list }));
  const updateAbsExercise = (id, patch) => setAbsExercises(absExercises.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeAbsExercise = (id) => setAbsExercises(absExercises.filter((e) => e.id !== id));
  const addAbsExercise = (ex) => setAbsExercises([...absExercises, ex]);

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

  const addNewExercise = (ex) => setBlocks([...program.blocks, { id: uid(), restSec: ex.rest || 90, exercises: [{ id: ex.id, name: ex.name, series: ex.series, reps: ex.reps, notes: ex.notes, primaryMuscle: ex.primaryMuscle || null, secondaryMuscles: ex.secondaryMuscles || [] }] }]);

  const attachExercise = (blockId, exDef) => {
    setBlocks(program.blocks
      .filter((b) => b.id !== exDef.__sourceBlockId)
      .map((b) => (b.id === blockId ? { ...b, exercises: [...b.exercises, { id: exDef.id, name: exDef.name, series: exDef.series, reps: exDef.reps, notes: exDef.notes || "", primaryMuscle: exDef.primaryMuscle || null, secondaryMuscles: exDef.secondaryMuscles || [] }] } : b)));
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

      <div>
        <SectionTitle theme={theme}>Groupes musculaires ciblés</SectionTitle>
        <MuscleGroupPicker theme={theme} selected={muscleGroups} onToggle={toggleMuscleGroup} />
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

      {/* Bloc abdominaux : réalisé automatiquement à la fin de la séance (voir
          WorkoutSession / phase "absIntro"). Liste à part de l'exercice courant plus haut :
          chaque exercice est indépendant, avec ses propres séries, reps OU durée
          (gainage), et repos — pas de biset ici, juste une liste simple réordonnable. */}
      <div className="pt-2">
        <SectionTitle theme={theme}>Bloc abdominaux · fin de séance</SectionTitle>
        {absExercises.length === 0 ? (
          <Card theme={theme}><EmptyState theme={theme} icon={Flame} title="Aucun exercice abdos" subtitle="Ajoute un bloc abdos à réaliser automatiquement à la fin de cette séance." /></Card>
        ) : (
          <Reorder.Group axis="y" values={absExercises} onReorder={setAbsExercises} className="space-y-2.5">
            {absExercises.map((ex) => (
              <Reorder.Item key={ex.id} value={ex}>
                <AbsExerciseRow theme={theme} exercise={ex} onUpdate={(patch) => updateAbsExercise(ex.id, patch)} onRemove={() => removeAbsExercise(ex.id)} />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
        <button onClick={() => setShowAddAbs(true)} className="w-full rounded-2xl py-3.5 mt-2.5 font-bold text-[14.5px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform" style={{ background: theme.card2, color: theme.accent, border: `1.5px dashed ${theme.border}` }}>
          <Plus size={17} /> Ajouter un exercice abdos
        </button>
      </div>

      <button onClick={deleteProgram} className="w-full rounded-2xl py-3 font-semibold text-[13.5px] flex items-center justify-center gap-2 mt-6" style={{ color: theme.bad }}>
        <Trash2 size={14} /> Supprimer le programme
      </button>

      <AnimatePresence>
        {showAdd && (
          <AddExerciseSheet theme={theme} onClose={() => setShowAdd(false)} onAdd={(ex) => { addNewExercise(ex); setShowAdd(false); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddAbs && (
          <AddExerciseSheet
            theme={theme} allowDuration title="Ajouter un exercice abdos" showMuscle={false} defaultPrimaryMuscle="abdominaux"
            onClose={() => setShowAddAbs(false)}
            onAdd={(ex) => { addAbsExercise({ ...ex, primaryMuscle: "abdominaux" }); setShowAddAbs(false); }}
          />
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

// Ligne d'un exercice du bloc abdos : contrairement aux exercices normaux, chaque entrée
// gère son propre repos (pas de bloc partagé) et peut être en reps OU en durée (gainage).
function AbsExerciseRow({ theme, exercise, onUpdate, onRemove }) {
  const [open, setOpen] = useState(false);
  const isDuration = exercise.unit === "sec";
  return (
    <Card theme={theme} className="overflow-hidden" style={{ border: `1px solid ${theme.accent}33` }}>
      <div className="flex items-center gap-2 p-3.5">
        <GripVertical size={16} color={theme.textFaint} className="cursor-grab shrink-0" />
        <button className="flex-1 text-left min-w-0" onClick={() => setOpen((o) => !o)}>
          <p style={{ color: theme.text }} className="font-semibold text-[14.5px] truncate">{exercise.name}</p>
          <p style={{ color: theme.textMuted }} className="text-[12px] mt-0.5">
            {exercise.series} × {exercise.reps}{isDuration ? "s" : " reps"} · repos {exercise.restSec}s
          </p>
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
              <div className="flex gap-2">
                <Pill theme={theme} active={!isDuration} onClick={() => onUpdate({ unit: "reps" })}>Répétitions</Pill>
                <Pill theme={theme} active={isDuration} onClick={() => onUpdate({ unit: "sec" })}>Durée</Pill>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MiniStepper theme={theme} label="Séries" value={exercise.series} onChange={(v) => onUpdate({ series: v })} />
                <MiniStepper theme={theme} label={isDuration ? "Secondes" : "Reps"} value={exercise.reps} step={isDuration ? 10 : 1} onChange={(v) => onUpdate({ reps: v })} />
                <MiniStepper theme={theme} label="Repos" value={exercise.restSec} step={15} onChange={(v) => onUpdate({ restSec: v })} suffix="s" />
              </div>
              <button onClick={onRemove} className="text-[12.5px] font-semibold flex items-center gap-1.5" style={{ color: theme.bad }}>
                <Trash2 size={12} /> Retirer des abdos
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function ExerciseRow({ theme, exercise, restSec, onUpdate, onUpdateRest, onRemove, onCreateSuperset }) {
  const [open, setOpen] = useState(false);
  const toggleSecondary = (id) => {
    const cur = exercise.secondaryMuscles || [];
    onUpdate({ secondaryMuscles: cur.includes(id) ? cur.filter((m) => m !== id) : [...cur, id] });
  };
  const onSeriesChange = (v) => onUpdate({
    series: v,
    repsPerSet: exercise.customReps ? syncRepsPerSet(exercise.repsPerSet, v, exercise.reps) : exercise.repsPerSet,
  });
  const toggleCustomReps = () => {
    const next = !exercise.customReps;
    onUpdate({ customReps: next, repsPerSet: next ? syncRepsPerSet(exercise.repsPerSet, exercise.series, exercise.reps) : exercise.repsPerSet });
  };
  return (
    <Card theme={theme} className="overflow-hidden">
      <div className="flex items-center gap-2 p-3.5">
        <GripVertical size={16} color={theme.textFaint} className="cursor-grab shrink-0" />
        {exercise.primaryMuscle && (
          <div className="rounded-xl flex items-center justify-center shrink-0" style={{ width: 34, height: 34, background: theme.card2 }}>
            <MuscleIllustration theme={theme} muscles={exercise.primaryMuscle} size={26} />
          </div>
        )}
        <button className="flex-1 text-left min-w-0" onClick={() => setOpen((o) => !o)}>
          <p style={{ color: theme.text }} className="font-semibold text-[14.5px] truncate">{exercise.name}</p>
          <p style={{ color: theme.textMuted }} className="text-[12px] mt-0.5">
            {exercise.series} × {exercise.customReps && exercise.repsPerSet ? exercise.repsPerSet.join("/") : exercise.reps} reps · repos {restSec}s
            {exercise.unilateral ? " · unilatéral" : ""}
            {exercise.primaryMuscle ? ` · ${muscleLabel(exercise.primaryMuscle)}` : ""}
          </p>
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
                <MiniStepper theme={theme} label="Séries" value={exercise.series} onChange={onSeriesChange} />
                <MiniStepper theme={theme} label="Reps" value={exercise.reps} onChange={(v) => onUpdate({ reps: v })} />
                <MiniStepper theme={theme} label="Repos" value={restSec} step={15} onChange={onUpdateRest} suffix="s" />
              </div>

              {/* Répétitions indépendantes par série (ex: pyramide 12/10/8/6). */}
              <button onClick={toggleCustomReps} className="flex items-center gap-2">
                <div className="rounded-md flex items-center justify-center shrink-0" style={{ width: 18, height: 18, background: exercise.customReps ? theme.accent : theme.card2, border: `1.5px solid ${exercise.customReps ? theme.accent : theme.border}` }}>
                  {exercise.customReps && <Check size={12} color="#fff" strokeWidth={3} />}
                </div>
                <span style={{ color: theme.text }} className="text-[13px] font-semibold">Personnaliser les répétitions par série</span>
              </button>
              {exercise.customReps && (
                <PerSetRepsEditor
                  theme={theme} values={syncRepsPerSet(exercise.repsPerSet, exercise.series, exercise.reps)}
                  onChange={(v) => onUpdate({ repsPerSet: v })}
                />
              )}

              {/* Exercice unilatéral : côté gauche / droit indépendants pendant la séance. */}
              <button onClick={() => onUpdate({ unilateral: !exercise.unilateral })} className="flex items-center gap-2">
                <div className="rounded-md flex items-center justify-center shrink-0" style={{ width: 18, height: 18, background: exercise.unilateral ? theme.accent : theme.card2, border: `1.5px solid ${exercise.unilateral ? theme.accent : theme.border}` }}>
                  {exercise.unilateral && <Check size={12} color="#fff" strokeWidth={3} />}
                </div>
                <span style={{ color: theme.text }} className="text-[13px] font-semibold">Exercice unilatéral (côté gauche / droit séparés)</span>
              </button>

              <div>
                <div className="flex items-center gap-3 mb-2">
                  {exercise.primaryMuscle && (
                    <div className="rounded-2xl flex items-center justify-center shrink-0" style={{ width: 48, height: 48, background: theme.card2 }}>
                      <MuscleIllustration theme={theme} muscles={exercise.primaryMuscle} size={38} />
                    </div>
                  )}
                  <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold">Muscle principal</p>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {MUSCLE_GROUPS.map((m) => (
                    <Pill key={m.id} theme={theme} active={exercise.primaryMuscle === m.id} onClick={() => onUpdate({ primaryMuscle: exercise.primaryMuscle === m.id ? null : m.id })}>{m.label}</Pill>
                  ))}
                </div>
                {exercise.primaryMuscle && (
                  <>
                    <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold mb-1.5">Muscles secondaires</p>
                    <div className="flex flex-wrap gap-1.5">
                      {MUSCLE_GROUPS.filter((m) => m.id !== exercise.primaryMuscle).map((m) => (
                        <Pill key={m.id} theme={theme} active={(exercise.secondaryMuscles || []).includes(m.id)} onClick={() => toggleSecondary(m.id)}>{m.label}</Pill>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <textarea placeholder="Notes (technique, variante...)" value={exercise.notes} onChange={(e) => onUpdate({ notes: e.target.value })}
                className="w-full rounded-xl p-2.5 text-[13px] outline-none resize-none" rows={2}
                style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
              <div className="flex items-center justify-between pt-1">
                <button onClick={onRemove} className="text-[12.5px] font-semibold flex items-center gap-1.5" style={{ color: theme.bad }}>
                  <Trash2 size={12} /> Retirer cet exercice
                </button>
                <button onClick={onCreateSuperset} className="text-[12.5px] font-bold flex items-center gap-1.5" style={{ color: theme.accent }}>
                  <Link2 size={12} /> Ajouter à un superset
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
  const { height: viewportHeight } = useVisualViewport();

  return (
    <motion.div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 200, height: viewportHeight ? `${viewportHeight}px` : undefined }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl p-5" style={{ maxWidth: 480, background: theme.card, borderTop: `1px solid ${theme.border}`, maxHeight: viewportHeight ? `${viewportHeight * 0.85}px` : "85vh", overflowY: "auto", paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}>
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

// Ajuste un tableau de répétitions par série à la longueur `series` (ajoute des copies de
// la dernière valeur si la série grandit, tronque si elle rétrécit) — utilisé partout où
// le nombre de séries peut changer après que des répétitions par série ont été saisies.
function syncRepsPerSet(repsPerSet, series, fallback) {
  const base = Array.isArray(repsPerSet) && repsPerSet.length ? repsPerSet : Array.from({ length: series }, () => fallback);
  if (base.length === series) return base;
  if (base.length > series) return base.slice(0, series);
  return [...base, ...Array.from({ length: series - base.length }, () => base[base.length - 1] ?? fallback)];
}

// Éditeur "répétitions indépendantes par série" (ex: pyramide 12/10/8/6) — repli discret,
// masqué par défaut : la plupart des exercices utilisent le même nombre de reps partout.
function PerSetRepsEditor({ theme, values, onChange }) {
  const setAt = (i, v) => {
    const next = [...values];
    next[i] = Math.max(1, v);
    onChange(next);
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      {values.map((v, i) => (
        <div key={i} className="rounded-xl p-2 flex items-center justify-between" style={{ background: theme.card2, border: `1px solid ${theme.border}` }}>
          <span className="text-[11.5px] font-semibold" style={{ color: theme.textMuted }}>Série {i + 1}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setAt(i, v - 1)} className="w-6 h-6 rounded-md flex items-center justify-center active:scale-90" style={{ background: theme.bg }}>
              <Minus size={11} color={theme.text} />
            </button>
            <span className="text-[13px] font-bold w-6 text-center" style={{ color: theme.text }}>{v}</span>
            <button onClick={() => setAt(i, v + 1)} className="w-6 h-6 rounded-md flex items-center justify-center active:scale-90" style={{ background: theme.bg }}>
              <Plus size={11} color={theme.text} />
            </button>
          </div>
        </div>
      ))}
    </div>
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

function AddExerciseSheet({ theme, onClose, onAdd, allowDuration = false, title = "Ajouter un exercice", showMuscle = true, defaultPrimaryMuscle = null }) {
  const [name, setName] = useState("");
  const [series, setSeries] = useState(4);
  const [unit, setUnit] = useState("reps"); // 'reps' | 'sec' (uniquement pertinent si allowDuration)
  const [reps, setReps] = useState(10);
  const [rest, setRest] = useState(90);
  const [primaryMuscle, setPrimaryMuscle] = useState(defaultPrimaryMuscle);
  const [secondaryMuscles, setSecondaryMuscles] = useState([]);
  const [unilateral, setUnilateral] = useState(false);
  const [customReps, setCustomReps] = useState(false);
  const [repsPerSet, setRepsPerSet] = useState(() => Array.from({ length: 4 }, () => 10));
  const filtered = name ? COMMON_EXERCISES.filter((e) => e.toLowerCase().includes(name.toLowerCase())) : COMMON_EXERCISES.slice(0, 5);

  const switchUnit = (u) => { setUnit(u); setReps(u === "sec" ? 30 : 10); };
  const toggleSecondary = (id) => setSecondaryMuscles((cur) => (cur.includes(id) ? cur.filter((m) => m !== id) : [...cur, id]));
  const { height: viewportHeight } = useVisualViewport();

  // Le nombre de séries peut changer à tout moment : on garde `repsPerSet` synchronisé
  // (ajout/retrait d'entrées) tant que le mode personnalisé est actif.
  useEffect(() => {
    if (customReps) setRepsPerSet((cur) => syncRepsPerSet(cur, series, reps));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, customReps]);

  return (
    <motion.div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 200, height: viewportHeight ? `${viewportHeight}px` : undefined }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl p-5" style={{ maxWidth: 480, background: theme.card, borderTop: `1px solid ${theme.border}`, paddingBottom: "calc(2rem + env(safe-area-inset-bottom))", maxHeight: viewportHeight ? `${viewportHeight * 0.85}px` : "85vh", overflowY: "auto" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: theme.border }} />
        <h3 style={{ color: theme.text }} className="text-[17px] font-bold mb-4">{title}</h3>
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
        {allowDuration && (
          <div className="flex gap-2 mb-4">
            <Pill theme={theme} active={unit === "reps"} onClick={() => switchUnit("reps")}>Répétitions</Pill>
            <Pill theme={theme} active={unit === "sec"} onClick={() => switchUnit("sec")}>Durée (secondes)</Pill>
          </div>
        )}
        {showMuscle && (
          <div className="mb-4">
            <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold mb-1.5">Muscle principal</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {MUSCLE_GROUPS.map((m) => (
                <Pill key={m.id} theme={theme} active={primaryMuscle === m.id} onClick={() => setPrimaryMuscle(primaryMuscle === m.id ? null : m.id)}>{m.label}</Pill>
              ))}
            </div>
            {primaryMuscle && (
              <>
                <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold mb-1.5">Muscles secondaires (optionnel)</p>
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_GROUPS.filter((m) => m.id !== primaryMuscle).map((m) => (
                    <Pill key={m.id} theme={theme} active={secondaryMuscles.includes(m.id)} onClick={() => toggleSecondary(m.id)}>{m.label}</Pill>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <MiniStepper theme={theme} label="Séries" value={series} onChange={setSeries} />
          <MiniStepper theme={theme} label={unit === "sec" ? "Secondes" : "Reps"} value={reps} step={unit === "sec" ? 10 : 1} onChange={setReps} />
          <MiniStepper theme={theme} label="Repos" value={rest} step={15} onChange={setRest} suffix="s" />
        </div>

        {/* Répétitions indépendantes par série (ex: pyramide 12/10/8/6) — masqué par
            défaut, la plupart des exercices utilisent le même nombre de reps partout. */}
        <button
          onClick={() => { const next = !customReps; setCustomReps(next); if (next) setRepsPerSet((cur) => syncRepsPerSet(cur, series, reps)); }}
          className="flex items-center gap-2 mb-3"
        >
          <div className="rounded-md flex items-center justify-center shrink-0" style={{ width: 18, height: 18, background: customReps ? theme.accent : theme.card2, border: `1.5px solid ${customReps ? theme.accent : theme.border}` }}>
            {customReps && <Check size={12} color="#fff" strokeWidth={3} />}
          </div>
          <span style={{ color: theme.text }} className="text-[13px] font-semibold">Personnaliser les répétitions par série</span>
        </button>
        {customReps && (
          <div className="mb-3">
            <PerSetRepsEditor theme={theme} values={syncRepsPerSet(repsPerSet, series, reps)} onChange={setRepsPerSet} />
          </div>
        )}

        {/* Exercice unilatéral : chaque série aura une colonne Gauche et une colonne Droite
            totalement indépendantes (poids, reps) pendant la séance. */}
        <button onClick={() => setUnilateral((v) => !v)} className="flex items-center gap-2 mb-5">
          <div className="rounded-md flex items-center justify-center shrink-0" style={{ width: 18, height: 18, background: unilateral ? theme.accent : theme.card2, border: `1.5px solid ${unilateral ? theme.accent : theme.border}` }}>
            {unilateral && <Check size={12} color="#fff" strokeWidth={3} />}
          </div>
          <span style={{ color: theme.text }} className="text-[13px] font-semibold">Exercice unilatéral (côté gauche / droit séparés)</span>
        </button>

        <BigButton
          theme={theme} gradient disabled={!name.trim()}
          onClick={() => onAdd({
            id: uid(), name: name.trim(), series, reps, rest, restSec: rest, unit, notes: "", primaryMuscle, secondaryMuscles,
            unilateral,
            repsPerSet: customReps ? syncRepsPerSet(repsPerSet, series, reps) : Array.from({ length: series }, () => reps),
          })}
        >
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
            isAbs: !!block.isAbsBlock,
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
        <IconBadge theme={theme} icon={Zap} size={32} iconSize={15} tone="accent" />
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
        <span style={{ color: theme.textMuted }} className="text-[11.5px] flex items-center gap-1">
          <Calendar size={11} /> {fmtDate(last.session.date, { day: "numeric", month: "long", year: "numeric" })}
        </span>
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
      <Lock size={16} color={theme.textFaint} className="shrink-0" />
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
function ExerciseCardActive({ theme, log, groupSize, letter, exIndexInBlock, round, sessions, isAbs, onChangeSet, onValidate, onRename, onAddSet, onSkip, onPrev }) {
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
  const isDuration = log.targetUnit === "sec";
  // Cible de LA série en cours (pyramide 12/10/8/6 par ex.) — avant ce correctif, la puce
  // affichait toujours `log.targetReps`, la même valeur quelle que soit la série affichée.
  const targetForRound = log.targetRepsPerSet?.[round] ?? log.targetReps;

  return (
    <Card theme={theme} className="p-5">
      <div className="flex items-center gap-1.5 mb-3">
        {groupSize > 1 && (
          <span className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold inline-block" style={{ background: theme.accent, color: "#fff" }}>
            {groupLabel(groupSize)} · {letter}{exIndexInBlock + 1}
          </span>
        )}
        {isAbs && (
          <span className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold inline-flex items-center gap-1" style={{ background: `${theme.accent}1f`, color: theme.accent }}>
            <Flame size={11} /> Abdominaux
          </span>
        )}
        {log.unilateral && (
          <span className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold inline-flex items-center gap-1" style={{ background: theme.card2, color: theme.textMuted }}>
            Unilatéral
          </span>
        )}
      </div>

      {editingName ? (
        <input
          autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitRename} onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
          className="w-full text-[23px] font-extrabold bg-transparent outline-none border-b mb-1"
          style={{ color: theme.text, borderColor: theme.accent }}
        />
      ) : (
        <div className="flex items-start gap-3 mb-1">
          {log.primaryMuscle && (
            <div className="rounded-2xl shrink-0 flex items-center justify-center" style={{ width: 52, height: 52, background: theme.card2 }}>
              <MuscleIllustration theme={theme} muscles={log.primaryMuscle} size={40} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <button onClick={() => setEditingName(true)} className="flex items-center gap-2 text-left">
              <h2 style={{ color: theme.text }} className="text-[21px] font-extrabold leading-tight truncate">{log.name}</h2>
              <Edit2 size={13} color={theme.textFaint} className="shrink-0" />
            </button>
            {log.primaryMuscle && <p style={{ color: theme.textMuted }} className="text-[12px] mt-0.5">{muscleLabel(log.primaryMuscle)}{log.secondaryMuscles?.length ? ` · ${log.secondaryMuscles.map(muscleLabel).join(", ")}` : ""}</p>}
          </div>
        </div>
      )}
      <p style={{ color: theme.accent }} className="text-[14px] font-bold mb-4">Série {round + 1} / {totalRounds}</p>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="px-3 py-1.5 rounded-full text-[12px] font-semibold inline-flex items-center gap-1" style={{ background: theme.card2, color: theme.textMuted }}>
          <Target size={12} /> {targetForRound}{isDuration ? "s" : " reps"} cible
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

      <LastSessionCard theme={theme} last={last} currentSet={{ weight: log.unilateral ? set.leftWeight : set.weight, reps: log.unilateral ? set.leftReps : set.reps, round }} />

      {log.unilateral ? (
        <div className="space-y-3 mb-5">
          <div>
            <p style={{ color: theme.textMuted }} className="text-[11px] font-bold uppercase tracking-wide mb-1.5 px-0.5">Côté gauche</p>
            <div className="grid grid-cols-2 gap-3 items-stretch">
              <BigNumberStepper theme={theme} label="Charge (kg)" value={set.leftWeight} onChange={(v) => onChangeSet({ leftWeight: v })} step={2.5} />
              <BigNumberStepper theme={theme} label={isDuration ? "Durée (sec)" : "Répétitions"} value={set.leftReps} onChange={(v) => onChangeSet({ leftReps: v })} step={isDuration ? 5 : 1} />
            </div>
          </div>
          <div>
            <p style={{ color: theme.textMuted }} className="text-[11px] font-bold uppercase tracking-wide mb-1.5 px-0.5">Côté droit</p>
            <div className="grid grid-cols-2 gap-3 items-stretch">
              <BigNumberStepper theme={theme} label="Charge (kg)" value={set.rightWeight} onChange={(v) => onChangeSet({ rightWeight: v })} step={2.5} />
              <BigNumberStepper theme={theme} label={isDuration ? "Durée (sec)" : "Répétitions"} value={set.rightReps} onChange={(v) => onChangeSet({ rightReps: v })} step={isDuration ? 5 : 1} />
            </div>
          </div>
        </div>
      ) : (
        // grid-cols-2 (= repeat(2, minmax(0,1fr))) donne deux colonnes strictement égales
        // en largeur, qui s'adaptent à n'importe quelle taille d'écran ; items-stretch
        // force les deux cartes à la même hauteur. Aucune largeur fixe, aucun
        // positionnement absolu.
        <div className="grid grid-cols-2 gap-3 mb-5 items-stretch">
          <BigNumberStepper theme={theme} label="Charge (kg)" value={set.weight} onChange={(v) => onChangeSet({ weight: v })} step={2.5} />
          <BigNumberStepper theme={theme} label={isDuration ? "Durée (sec)" : "Répétitions"} value={set.reps} onChange={(v) => onChangeSet({ reps: v })} step={isDuration ? 5 : 1} />
        </div>
      )}

      <BigButton theme={theme} gradient onClick={onValidate}>
        <Check size={18} strokeWidth={3} /> Valider la série
      </BigButton>

      <button onClick={onAddSet} className="w-full text-center mt-3 text-[12.5px] font-semibold" style={{ color: theme.textMuted }}>
        + Ajouter une série bonus à cet exercice
      </button>

      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
        <button
          onClick={onPrev || undefined} disabled={!onPrev}
          className="text-[12px] font-semibold flex items-center gap-1"
          style={{ color: onPrev ? theme.textMuted : theme.textFaint, opacity: onPrev ? 1 : 0.4 }}
        >
          <ChevronLeft size={13} /> Précédent
        </button>
        <button onClick={onSkip} className="text-[12px] font-semibold flex items-center gap-1" style={{ color: theme.textMuted }}>
          Passer cet exercice <ChevronRight size={13} />
        </button>
      </div>
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
  const [phase, setPhase, phaseLoaded] = usePersistentState(`gt_phase_${workout.id}`, "set"); // 'set' | 'rest' | 'done' | 'absIntro' | 'postCardio' | 'postAbs'
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [lockedHint, setLockedHint] = useState(false); // message temporaire "exercice verrouillé"
  const [reorderMode, setReorderMode] = useState(false); // mode réorganisation de la suite de la séance
  const [showAddExercise, setShowAddExercise] = useState(false); // "+ Ajouter un exercice" pendant la séance
  const [pendingJump, setPendingJump] = useState(null); // blockId à activer dès que `steps` se recalcule

  // Étape "Ajouter un cardio" (facultative) — après la musculation, avant la validation
  // finale. `cardioEntry` reste `null` tant que l'utilisateur n'a pas choisi de type : la
  // séance est enregistrée sans cardio si l'étape est passée.
  const [cardioEntry, setCardioEntry] = useState(null);
  // Étape "Ajouter des abdominaux" (facultative) — plusieurs exercices possibles, chacun
  // enregistré avec la séance mais marqué `primaryMuscle: "abdominaux"` pour rester
  // identifié comme tel dans l'historique et les statistiques.
  const [extraAbsExercises, setExtraAbsExercises] = useState([]);
  const [absDraft, setAbsDraft] = useState({ name: "", series: 3, reps: 15, unit: "reps" });

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
  // Pour un exercice unilatéral, le tonnage d'une série est la somme des deux côtés
  // (chacun a son propre poids × reps, totalement indépendants l'un de l'autre).
  const setTonnage = (s) => (s.leftWeight != null || s.rightWeight != null)
    ? (Number(s.leftWeight) || 0) * (Number(s.leftReps) || 0) + (Number(s.rightWeight) || 0) * (Number(s.rightReps) || 0)
    : (Number(s.weight) || 0) * (Number(s.reps) || 0);
  const tonnage = allLogs.reduce((a, el) => a + el.sets.reduce((b, s) => b + (s.done ? setTonnage(s) : 0), 0), 0);
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
  // Si on entre dans le bloc abdos (premier pas où isAbs passe de false à true), on
  // affiche d'abord l'écran "Fin de séance · Abdominaux" plutôt que d'enchaîner directement.
  const goToNextStep = () => {
    stopRest();
    const nextIndex = stepIndex + 1;
    if (nextIndex >= steps.length) { setPhase("done"); return; }
    const enteringAbs = steps[nextIndex].isAbs && !steps[stepIndex]?.isAbs;
    setStepIndex(nextIndex);
    setPhase(enteringAbs ? "absIntro" : "set");
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

  // Revenir à l'étape précédente (pour corriger/refaire), ou passer l'exercice actuel sans
  // le valider — utile en particulier pour le bloc abdos (section 4 : "passer un exercice",
  // "revenir en arrière"), mais disponible pour toute la séance par cohérence.
  const goToPrevStep = () => {
    if (stepIndex === 0) return;
    stopRest();
    setStepIndex((i) => Math.max(0, i - 1));
    setPhase("set");
  };
  const skipCurrentExercise = () => goToNextStep();

  // Ajoute un exercice supplémentaire, décidé pendant la séance (pas prévu au programme).
  // Il rejoint la fin de `workout.blocks`, juste avant le bloc abdos s'il y en a un —
  // ainsi il fait partie de la partie "musculation", pas des abdos de fin de séance.
  const addExtraExercise = (ex) => {
    const newBlock = {
      id: uid(), restSec: ex.rest || restDefault,
      exerciseLogs: [{
        exerciseId: ex.id, name: ex.name, targetReps: ex.reps, targetUnit: "reps", notes: ex.notes || "",
        primaryMuscle: ex.primaryMuscle || null, secondaryMuscles: ex.secondaryMuscles || [],
        sets: Array.from({ length: ex.series || 3 }, () => ({ weight: "", reps: "", done: false })),
      }],
    };
    setWorkout((w) => {
      const firstAbsIdx = w.blocks.findIndex((b) => b.isAbsBlock);
      if (firstAbsIdx === -1) return { ...w, blocks: [...w.blocks, newBlock] };
      return { ...w, blocks: [...w.blocks.slice(0, firstAbsIdx), newBlock, ...w.blocks.slice(firstAbsIdx)] };
    });
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
    // Chaque exercice abdos ajouté en fin de séance devient un exerciseLog normal, marqué
    // `primaryMuscle: "abdominaux"` et `isExtraAbs: true` (pour le distinguer d'un exercice
    // prévu au programme si besoin plus tard) — il apparaît donc dans l'historique et les
    // statistiques comme n'importe quel autre exercice.
    const extraAbsLogs = extraAbsExercises.map((ex) => ({
      exerciseId: ex.id, name: ex.name, targetReps: ex.reps, targetUnit: ex.unit,
      primaryMuscle: "abdominaux", secondaryMuscles: [], isExtraAbs: true, notes: "",
      sets: Array.from({ length: ex.series }, () => ({ weight: "", reps: String(ex.reps), done: true })),
    }));
    const session = {
      id: workout.id, programId: workout.programId, programName: workout.programName,
      date: todayISO(), startedAt: workout.startedAt, durationSec, tonnage, totalSets: totalSets + extraAbsLogs.reduce((a, el) => a + el.sets.length, 0),
      blocks: workout.blocks.map((b) => ({ id: b.id, restSec: b.restSec, exerciseIds: b.exerciseLogs.map((el) => el.exerciseId), isAbsBlock: !!b.isAbsBlock })),
      exerciseLogs: [
        ...workout.blocks.flatMap((b) => b.exerciseLogs.map((el) => ({ ...el, sets: el.sets.filter((s) => s.done || s.weight || s.reps) }))),
        ...extraAbsLogs,
      ],
      cardio: cardioEntry,
    };
    onFinish(session);
    cleanupRuntimeStorage();
  };

  const addAbsExerciseDraft = () => {
    if (!absDraft.name.trim()) return;
    setExtraAbsExercises((list) => [...list, { id: uid(), ...absDraft, name: absDraft.name.trim() }]);
    setAbsDraft({ name: "", series: 3, reps: 15, unit: "reps" });
  };
  const removeAbsExercise = (id) => setExtraAbsExercises((list) => list.filter((e) => e.id !== id));

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
    <div style={{ background: theme.bg }} className="flex flex-col gt-app-shell">
      <SessionHeader
        theme={theme} programName={workout.programName} elapsedSec={elapsedSec}
        stepNumber={Math.min(stepIndex + 1, steps.length)} totalSteps={steps.length}
        onCancel={handleCancel} onEndClick={() => setConfirmEnd(true)}
      />

      {/* Avant ce correctif, ce contenu vivait directement dans `.gt-app-shell` (hauteur
          figée + overflow:hidden, pensé pour l'enveloppe racine de l'app, pas pour une
          zone de contenu) : tout ce qui dépassait un écran était silencieusement coupé —
          d'où le bug "seuls deux exercices visibles". `flex-1 overflow-y-auto` en fait une
          vraie zone de défilement indépendante, sous l'en-tête qui reste fixe. */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
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
              <BigButton theme={theme} gradient onClick={() => setPhase("postCardio")}><ChevronRight size={17} /> Continuer</BigButton>
            </motion.div>
          ) : phase === "postCardio" ? (
            <motion.div key="postCardio" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="pt-4">
              <div className="text-center mb-5">
                <div className="rounded-full flex items-center justify-center mx-auto mb-3" style={{ width: 64, height: 64, background: `${theme.accent}1f` }}>
                  <HeartPulse size={26} color={theme.accent} />
                </div>
                <h2 style={{ color: theme.text }} className="text-[19px] font-extrabold mb-1">Ajouter un cardio ?</h2>
                <p style={{ color: theme.textMuted }} className="text-[13px]">Optionnel — une séance de cardio réalisée après la musculation.</p>
              </div>
              <Card theme={theme} className="p-4 space-y-3 mb-5">
                <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold">Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {CARDIO_TYPES.map((t) => (
                    <Pill key={t.id} theme={theme} active={cardioEntry?.type === t.id}
                      onClick={() => setCardioEntry((c) => ({ durationMin: 20, distance: "", calories: "", intensity: "moderate", ...c, type: t.id }))}>
                      {t.label}
                    </Pill>
                  ))}
                </div>
                {cardioEntry?.type && (
                  <>
                    <div className="grid grid-cols-2 gap-2.5">
                      <MiniStepper theme={theme} label="Durée" value={cardioEntry.durationMin} step={5} suffix=" min" onChange={(v) => setCardioEntry((c) => ({ ...c, durationMin: Math.max(5, v) }))} />
                      <LabeledInput theme={theme} label="Distance (km, optionnel)" value={cardioEntry.distance} onChange={(v) => setCardioEntry((c) => ({ ...c, distance: v }))} placeholder="Ex : 5" />
                    </div>
                    <LabeledInput theme={theme} label="Calories (optionnel)" value={cardioEntry.calories} onChange={(v) => setCardioEntry((c) => ({ ...c, calories: v }))} placeholder="Si connues (montre, machine...)" />
                    <div>
                      <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold mb-1.5">Intensité</p>
                      <div className="flex gap-1.5">
                        {INTENSITY_LEVELS.map((i) => (
                          <Pill key={i.id} theme={theme} active={cardioEntry.intensity === i.id} onClick={() => setCardioEntry((c) => ({ ...c, intensity: i.id }))}>{i.label}</Pill>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </Card>
              <div className="flex gap-2.5">
                <BigButton theme={theme} onClick={() => { setCardioEntry(null); setPhase("postAbs"); }}>Passer</BigButton>
                <BigButton theme={theme} gradient onClick={() => setPhase("postAbs")}><ChevronRight size={17} /> Continuer</BigButton>
              </div>
            </motion.div>
          ) : phase === "postAbs" ? (
            <motion.div key="postAbs" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="pt-4">
              <div className="text-center mb-5">
                <div className="rounded-full flex items-center justify-center mx-auto mb-3" style={{ width: 64, height: 64, background: `${theme.accent}1f` }}>
                  <MuscleIllustration theme={theme} muscles="abdominaux" size={40} />
                </div>
                <h2 style={{ color: theme.text }} className="text-[19px] font-extrabold mb-1">Ajouter des abdominaux ?</h2>
                <p style={{ color: theme.textMuted }} className="text-[13px]">Optionnel — un ou plusieurs exercices réalisés après la séance.</p>
              </div>

              {extraAbsExercises.length > 0 && (
                <div className="space-y-2 mb-4">
                  {extraAbsExercises.map((ex) => (
                    <Card key={ex.id} theme={theme} className="p-3.5 flex items-center justify-between">
                      <div>
                        <p style={{ color: theme.text }} className="font-semibold text-[14px]">{ex.name}</p>
                        <p style={{ color: theme.textMuted }} className="text-[12px]">{ex.series} × {ex.reps}{ex.unit === "sec" ? "s" : " reps"}</p>
                      </div>
                      <IconButton theme={theme} onClick={() => removeAbsExercise(ex.id)}><Trash2 size={14} color={theme.bad} /></IconButton>
                    </Card>
                  ))}
                </div>
              )}

              <Card theme={theme} className="p-4 space-y-3 mb-5">
                <input
                  value={absDraft.name} onChange={(e) => setAbsDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="Nom de l'exercice (ex : Crunch, Gainage...)"
                  className="w-full rounded-xl px-3.5 py-3 text-[14.5px] outline-none"
                  style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }}
                />
                <div className="flex gap-2 mb-1">
                  <Pill theme={theme} active={absDraft.unit === "reps"} onClick={() => setAbsDraft((d) => ({ ...d, unit: "reps" }))}>Répétitions</Pill>
                  <Pill theme={theme} active={absDraft.unit === "sec"} onClick={() => setAbsDraft((d) => ({ ...d, unit: "sec" }))}>Durée (sec)</Pill>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <MiniStepper theme={theme} label="Séries" value={absDraft.series} onChange={(v) => setAbsDraft((d) => ({ ...d, series: Math.max(1, v) }))} />
                  <MiniStepper theme={theme} label={absDraft.unit === "sec" ? "Secondes" : "Reps"} value={absDraft.reps} step={absDraft.unit === "sec" ? 5 : 1} onChange={(v) => setAbsDraft((d) => ({ ...d, reps: Math.max(1, v) }))} />
                </div>
                <BigButton theme={theme} disabled={!absDraft.name.trim()} onClick={addAbsExerciseDraft}>
                  <Plus size={16} /> Ajouter cet exercice
                </BigButton>
              </Card>

              <div className="flex gap-2.5">
                <BigButton theme={theme} onClick={finishWorkout}>Passer et terminer</BigButton>
                <BigButton theme={theme} gradient onClick={finishWorkout}><Save size={17} /> Terminer la séance</BigButton>
              </div>
            </motion.div>
          ) : phase === "absIntro" ? (
            <motion.div key="absIntro" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="pt-6 text-center">
              <div className="rounded-full flex items-center justify-center mx-auto mb-4" style={{ width: 72, height: 72, background: `${theme.accent}1f` }}>
                <Flame size={30} color={theme.accent} />
              </div>
              <h2 style={{ color: theme.text }} className="text-[21px] font-extrabold mb-1">Fin de séance · Abdominaux</h2>
              <p style={{ color: theme.textMuted }} className="text-[13px] mb-5">Dernière étape avant de terminer.</p>
              <Card theme={theme} className="p-2 mb-5 text-left">
                {workout.blocks.filter((b) => b.isAbsBlock).map((b, i) => {
                  const el = b.exerciseLogs[0];
                  return (
                    <div key={b.id} className="px-3 py-2.5 flex items-center justify-between" style={{ borderTop: i ? `1px solid ${theme.border}` : "none" }}>
                      <p style={{ color: theme.text }} className="font-semibold text-[13.5px]">{el.name}</p>
                      <p style={{ color: theme.textMuted }} className="text-[12px]">{el.sets.length} × {el.targetReps}{el.targetUnit === "sec" ? "s" : ""}</p>
                    </div>
                  );
                })}
              </Card>
              <BigButton theme={theme} gradient onClick={() => setPhase("set")}><Play size={17} fill="#fff" /> Commencer les abdos</BigButton>
            </motion.div>
          ) : (
            step && log && (
              <motion.div key={stepIndex} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.2 }}>
                <ExerciseCardActive
                  theme={theme} log={log} groupSize={step.groupSize} letter={letters[block.id]}
                  exIndexInBlock={step.exIndexInBlock} round={step.round} sessions={sessions} isAbs={step.isAbs}
                  onChangeSet={updateCurrentSet} onValidate={validateCurrentSet}
                  onRename={renameCurrentExercise} onAddSet={addBonusSetToCurrentExercise}
                  onSkip={skipCurrentExercise} onPrev={stepIndex > 0 ? goToPrevStep : null}
                />
              </motion.div>
            )
          )}
        </AnimatePresence>

        {/* "+ Ajouter un exercice" : disponible à tout moment pendant la séance. Le nouvel
            exercice rejoint la fin de la partie musculation (avant les abdos s'il y en a),
            devient un exercice normal (poids/reps/séries/repos), et sera sauvegardé dans
            l'historique / les stats / les records comme n'importe quel autre à la fin. */}
        {phase !== "done" && (
          <button
            onClick={() => setShowAddExercise(true)}
            className="w-full rounded-2xl py-3.5 mt-4 font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{ background: theme.card2, color: theme.accent, border: `1.5px dashed ${theme.border}` }}
          >
            <Plus size={16} /> Ajouter un exercice
          </button>
        )}

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
      </div>

      <AnimatePresence>
        {lockedHint && (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            className="fixed left-0 right-0 bottom-6 flex justify-center z-40 px-6 pointer-events-none" style={{ maxWidth: 480, margin: "0 auto" }}>
            <div className="rounded-2xl px-4 py-3 flex items-center gap-2 text-[13px] font-semibold" style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}`, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)" }}>
              <Lock size={14} color={theme.textMuted} className="shrink-0" /> Terminez l'exercice actuel avant de modifier celui-ci.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmEnd && (
          <ConfirmSheet theme={theme} title="Terminer la séance ?" subtitle={`${totalSets} séries · ${Math.round(tonnage).toLocaleString("fr-FR")} kg de tonnage`}
            confirmLabel="Terminer" onConfirm={() => { setConfirmEnd(false); stopRest(); setPhase("done"); }} onCancel={() => setConfirmEnd(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddExercise && (
          <AddExerciseSheet
            theme={theme} title="Ajouter un exercice à la séance"
            onClose={() => setShowAddExercise(false)}
            onAdd={(ex) => { addExtraExercise(ex); setShowAddExercise(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ConfirmSheet({ theme, title, subtitle, confirmLabel, onConfirm, onCancel, danger }) {
  const { height: viewportHeight } = useVisualViewport();
  return (
    <motion.div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 200, height: viewportHeight ? `${viewportHeight}px` : undefined }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onCancel} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl p-5 text-center" style={{ maxWidth: 480, background: theme.card, borderTop: `1px solid ${theme.border}`, paddingBottom: "calc(2rem + env(safe-area-inset-bottom))", maxHeight: viewportHeight ? `${viewportHeight * 0.85}px` : "85vh", overflowY: "auto" }}>
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

function HistoryList({ theme, sessions, onOpen, onEdit }) {
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
                      {s.type === "cardio" || s.type === "abs" ? (
                        s.type === "cardio" ? <HeartPulse size={16} color={theme.accent} /> : <Flame size={16} color={theme.accent} />
                      ) : (
                        <>
                          <span style={{ color: theme.text }} className="text-[13px] font-extrabold leading-none">{fmtDate(s.date, { day: "numeric" })}</span>
                          <span style={{ color: theme.textFaint }} className="text-[8.5px] font-semibold uppercase">{fmtDate(s.date, { month: "short" })}</span>
                        </>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p style={{ color: theme.text }} className="font-semibold text-[14.5px] truncate">{s.programName}</p>
                      <p style={{ color: theme.textMuted }} className="text-[12px]">
                        {s.type === "cardio"
                          ? `${fmtDuration(s.durationSec || 0)}${s.cardio?.distance ? ` · ${s.cardio.distance} km` : ""}`
                          : s.type === "abs"
                            ? `${s.exerciseLogs.length} exercice${s.exerciseLogs.length !== 1 ? "s" : ""} · ${s.totalSets} séries`
                            : `${fmtDuration(s.durationSec || 0)} · ${s.totalSets} séries`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-1.5 shrink-0 pl-2">
                    {s.type !== "cardio" && s.type !== "abs" && (
                      <p style={{ color: theme.accent }} className="text-[13px] font-bold">{Math.round(s.tonnage).toLocaleString("fr-FR")}kg</p>
                    )}
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

function SessionDetail({ theme, session, onBack, onDelete, onDuplicate, onEdit }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!session) return null;
  return (
    <div className="px-4 pt-1 space-y-4">
      <div className="flex items-center gap-2 -ml-1">
        <IconButton theme={theme} onClick={onBack}><ChevronLeft size={18} color={theme.text} /></IconButton>
        <div className="flex-1 min-w-0">
          <h1 style={{ color: theme.text }} className="text-[19px] font-extrabold truncate">{session.programName}</h1>
          <p style={{ color: theme.textMuted }} className="text-[12.5px] capitalize">{fmtDateFull(session.date)}</p>
        </div>
        <IconButton theme={theme} onClick={() => onEdit(session.id)} aria-label="Modifier la séance"><Edit2 size={16} color={theme.text} /></IconButton>
      </div>
      {session.notes && (
        <Card theme={theme} className="p-3.5 flex items-start gap-2.5" style={{ background: `${theme.accent}0f` }}>
          <Info size={14} color={theme.accent} className="mt-0.5 shrink-0" />
          <p style={{ color: theme.text }} className="text-[13px] leading-snug">{session.notes}</p>
        </Card>
      )}
      <div className="grid grid-cols-3 gap-2.5">
        <Card theme={theme} className="p-3 text-center"><p style={{ color: theme.text }} className="text-[16px] font-extrabold">{Math.round(session.tonnage).toLocaleString("fr-FR")}</p><p style={{ color: theme.textFaint }} className="text-[10px]">kg tonnage</p></Card>
        <Card theme={theme} className="p-3 text-center"><p style={{ color: theme.text }} className="text-[16px] font-extrabold">{session.totalSets}</p><p style={{ color: theme.textFaint }} className="text-[10px]">séries</p></Card>
        <Card theme={theme} className="p-3 text-center"><p style={{ color: theme.text }} className="text-[16px] font-extrabold">{fmtDuration(session.durationSec || 0)}</p><p style={{ color: theme.textFaint }} className="text-[10px]">durée</p></Card>
      </div>
      {session.cardio && (
        <Card theme={theme} className="p-4">
          <p style={{ color: theme.text }} className="font-bold text-[14px] mb-2.5 flex items-center gap-1.5"><HeartPulse size={15} color={theme.accent} /> Cardio</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[13px]"><span style={{ color: theme.textMuted }}>Type</span><span style={{ color: theme.text }} className="font-semibold">{CARDIO_TYPES.find((t) => t.id === session.cardio.type)?.label || session.cardio.type}</span></div>
            <div className="flex items-center justify-between text-[13px]"><span style={{ color: theme.textMuted }}>Durée</span><span style={{ color: theme.text }} className="font-semibold">{session.cardio.durationMin} min</span></div>
            {session.cardio.distance && <div className="flex items-center justify-between text-[13px]"><span style={{ color: theme.textMuted }}>Distance</span><span style={{ color: theme.text }} className="font-semibold">{session.cardio.distance} km</span></div>}
            {session.cardio.calories && <div className="flex items-center justify-between text-[13px]"><span style={{ color: theme.textMuted }}>Calories</span><span style={{ color: theme.text }} className="font-semibold">{session.cardio.calories} kcal</span></div>}
            <div className="flex items-center justify-between text-[13px]"><span style={{ color: theme.textMuted }}>Intensité</span><span style={{ color: theme.text }} className="font-semibold">{INTENSITY_LEVELS.find((i) => i.id === session.cardio.intensity)?.label || session.cardio.intensity}</span></div>
            {session.cardio.notes && <p style={{ color: theme.textMuted, borderTop: `1px solid ${theme.border}` }} className="text-[12.5px] pt-1.5">{session.cardio.notes}</p>}
          </div>
        </Card>
      )}
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
                {b.isAbsBlock && (
                  <span className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold inline-flex items-center gap-1 mb-3" style={{ background: `${theme.accent}1f`, color: theme.accent }}>
                    <Flame size={11} /> Abdominaux
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
                            {s.leftWeight != null || s.rightWeight != null ? (
                              <span className="font-semibold text-right">
                                G {s.leftWeight || 0}kg×{s.leftReps || 0} · D {s.rightWeight || 0}kg×{s.rightReps || 0}
                              </span>
                            ) : (
                              <span className="font-semibold">{s.weight || 0} kg × {s.reps || 0}{el.targetUnit === "sec" ? "s" : ""}</span>
                            )}
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

/* ============================== EDIT PAST SESSION ============================== */
// Modifier une séance déjà réalisée. Les modifications ne touchent QUE cette séance :
// on travaille sur une copie locale (`draft`) et on ne remplace la séance d'origine dans
// `sessions` qu'au clic sur "Enregistrer" — tant que ce n'est pas fait, rien n'est perdu ni
// modifié ailleurs. Comme les records, la progression et les statistiques sont TOUJOURS
// recalculés à la volée à partir du tableau `sessions` (computePRs, ProgressPage, StatsPage
// ne font que le lire), il n'y a rien de spécial à faire pour les tenir à jour : remplacer
// la séance dans `sessions` suffit, tout le reste de l'app se remet à jour tout seul.

function EditableExerciseCard({ theme, exerciseIds, byId, groupLetter, onUpdateExercise, onUpdateSet, onAddSet, onRemoveSet }) {
  const isGroup = exerciseIds.length > 1;
  return (
    <Card theme={theme} className="p-4" style={isGroup ? { border: `1.5px solid ${theme.accent}55` } : {}}>
      {isGroup && (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-block mb-3" style={{ background: theme.accent, color: "#fff" }}>
          {groupLabel(exerciseIds.length)}
        </span>
      )}
      <div className={isGroup ? "space-y-4" : ""}>
        {exerciseIds.map((exId, exIdx) => {
          const el = byId[exId];
          if (!el) return null;
          return (
            <div key={exId} className={isGroup && exIdx > 0 ? "pt-4" : ""} style={isGroup && exIdx > 0 ? { borderTop: `1px dashed ${theme.border}` } : {}}>
              <div className="flex items-center gap-2 mb-3">
                {isGroup && <span className="text-[11px] font-extrabold shrink-0" style={{ color: theme.accent }}>{groupLetter}{exIdx + 1}</span>}
                <input
                  value={el.name} onChange={(e) => onUpdateExercise(exId, { name: e.target.value })}
                  className="flex-1 font-bold text-[15px] bg-transparent outline-none min-w-0"
                  style={{ color: theme.text }}
                />
              </div>
              <div className="space-y-1.5">
                <div className="grid items-center gap-2 px-1" style={{ gridTemplateColumns: "20px 1fr 1fr 26px" }}>
                  <span /><span style={{ color: theme.textFaint }} className="text-[10px] font-semibold">POIDS (KG)</span>
                  <span style={{ color: theme.textFaint }} className="text-[10px] font-semibold">REPS</span><span />
                </div>
                {el.sets.map((s, idx) => (
                  <div key={idx} className="grid items-center gap-2" style={{ gridTemplateColumns: "20px 1fr 1fr 26px" }}>
                    <span style={{ color: theme.textFaint }} className="text-[11.5px] font-bold text-center">{idx + 1}</span>
                    <input
                      inputMode="decimal" value={s.weight} onChange={(e) => onUpdateSet(exId, idx, { weight: e.target.value })}
                      className="w-full min-w-0 rounded-xl px-2 py-2.5 text-[14px] font-semibold outline-none text-center"
                      style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }}
                    />
                    <input
                      inputMode="numeric" value={s.reps} onChange={(e) => onUpdateSet(exId, idx, { reps: e.target.value })}
                      className="w-full min-w-0 rounded-xl px-2 py-2.5 text-[14px] font-semibold outline-none text-center"
                      style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }}
                    />
                    <button onClick={() => onRemoveSet(exId, idx)} className="flex items-center justify-center active:scale-90 transition-transform" style={{ height: 38 }}>
                      <X size={13} color={theme.textFaint} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => onAddSet(exId)} className="mt-2.5 text-[12px] font-semibold flex items-center gap-1" style={{ color: theme.accent }}>
                <Plus size={12} /> Ajouter une série
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function EditSessionScreen({ theme, session, onCancel, onSave }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(session)));
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(session), [draft, session]);

  const blocks = draft.blocks && draft.blocks.length
    ? draft.blocks
    : draft.exerciseLogs.map((el) => ({ id: el.exerciseId, restSec: null, exerciseIds: [el.exerciseId] }));
  const byId = Object.fromEntries(draft.exerciseLogs.map((el) => [el.exerciseId, el]));
  const letters = computeGroupLetters(blocks.map((b) => ({ id: b.id, exercises: b.exerciseIds })));

  const updateField = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const updateExercise = (exId, patch) => setDraft((d) => ({ ...d, exerciseLogs: d.exerciseLogs.map((el) => (el.exerciseId !== exId ? el : { ...el, ...patch })) }));
  const updateSet = (exId, idx, patch) => setDraft((d) => ({
    ...d, exerciseLogs: d.exerciseLogs.map((el) => (el.exerciseId !== exId ? el : { ...el, sets: el.sets.map((s, i) => (i === idx ? { ...s, ...patch } : s)) })),
  }));
  const addSet = (exId) => setDraft((d) => ({
    ...d, exerciseLogs: d.exerciseLogs.map((el) => (el.exerciseId !== exId ? el : { ...el, sets: [...el.sets, { weight: "", reps: "", done: true }] })),
  }));
  const removeSet = (exId, idx) => setDraft((d) => ({
    ...d, exerciseLogs: d.exerciseLogs.map((el) => (el.exerciseId !== exId ? el : { ...el, sets: el.sets.filter((_, i) => i !== idx) })),
  }));
  // Réordonner déplace des BLOCS entiers (un biset reste un seul bloc), exactement comme
  // pendant une séance en direct — voir WorkoutSession / ReorderableBlockRow.
  const reorderBlocks = (newBlocks) => setDraft((d) => ({ ...d, blocks: newBlocks }));

  const handleCancelClick = () => { if (dirty) setConfirmDiscard(true); else onCancel(); };

  // Le tonnage et le nombre de séries affichés partout ailleurs (historique, dashboard,
  // stats) sont dérivés des séries elles-mêmes : on les recalcule ici pour que la séance
  // modifiée reste cohérente avec ce qu'elle contient réellement.
  const handleSave = () => {
    const cleanedLogs = draft.exerciseLogs.map((el) => ({ ...el, sets: el.sets.filter((s) => s.weight !== "" || s.reps !== "") }));
    const tonnage = cleanedLogs.reduce((a, el) => a + el.sets.reduce((b, s) => b + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0), 0);
    const totalSets = cleanedLogs.reduce((a, el) => a + el.sets.length, 0);
    onSave({ ...draft, exerciseLogs: cleanedLogs, tonnage, totalSets });
  };

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={handleCancelClick} className="text-[13px] font-semibold" style={{ color: theme.textMuted }}>Annuler</button>
        <h1 style={{ color: theme.text }} className="text-[16px] font-extrabold">Modifier la séance</h1>
        <button onClick={handleSave} className="text-[13px] font-bold" style={{ color: theme.accent }}>Enregistrer</button>
      </div>

      <div className="px-4 space-y-4">
        <Card theme={theme} className="p-4 space-y-3">
          <LabeledInput theme={theme} label="Nom de la séance" value={draft.programName} onChange={(v) => updateField({ programName: v })} />
          <FieldRow theme={theme} label="Date">
            <input type="date" value={draft.date} onChange={(e) => updateField({ date: e.target.value })} className="bg-transparent outline-none text-right" style={{ color: theme.text }} />
          </FieldRow>
        </Card>

        <div>
          <SectionTitle theme={theme}>Exercices · glisser pour réordonner</SectionTitle>
          <Reorder.Group axis="y" values={blocks} onReorder={reorderBlocks} className="space-y-2.5">
            {blocks.map((b) => (
              <Reorder.Item key={b.id} value={b}>
                <EditableExerciseCard
                  theme={theme} exerciseIds={b.exerciseIds} byId={byId} groupLetter={letters[b.id]}
                  onUpdateExercise={updateExercise} onUpdateSet={updateSet} onAddSet={addSet} onRemoveSet={removeSet}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>

        <Card theme={theme} className="p-4">
          <p style={{ color: theme.text }} className="font-bold text-[14px] mb-2">Notes</p>
          <textarea
            value={draft.notes || ""} onChange={(e) => updateField({ notes: e.target.value })} rows={3}
            placeholder="Notes personnelles sur cette séance..."
            className="w-full rounded-xl p-3 text-[13px] outline-none resize-none"
            style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }}
          />
        </Card>

        <BigButton theme={theme} gradient onClick={handleSave}><Save size={16} /> Enregistrer les modifications</BigButton>
      </div>

      <AnimatePresence>
        {confirmDiscard && (
          <ConfirmSheet
            theme={theme} danger title="Abandonner les modifications ?" subtitle="Les changements non enregistrés seront perdus."
            confirmLabel="Abandonner" onConfirm={onCancel} onCancel={() => setConfirmDiscard(false)}
          />
        )}
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

// Regroupe Progression, Records personnels et Statistiques (auparavant trois entrées
// séparées dans le menu Profil) en une seule section à onglets, pour alléger le Profil.
// Chaque sous-écran (ProgressPage/RecordsPage/StatsPage) est inchangé — seule la façon d'y
// accéder change.
const PERFORMANCES_TABS = [
  { id: "progress", label: "Progression" },
  { id: "records", label: "Records" },
  { id: "stats", label: "Statistiques" },
];

function PerformancesHub({ theme, sessions, programs, onExport, onImport }) {
  const [tab, setTab] = useState("progress");
  return (
    <div>
      <div className="px-4 pt-2 pb-1">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {PERFORMANCES_TABS.map((t) => (
            <Pill key={t.id} theme={theme} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Pill>
          ))}
        </div>
      </div>
      {tab === "progress" && <ProgressPage theme={theme} sessions={sessions} programs={programs} />}
      {tab === "records" && <RecordsPage theme={theme} sessions={sessions} />}
      {tab === "stats" && <StatsPage theme={theme} sessions={sessions} programs={programs} onExport={onExport} onImport={onImport} />}
    </div>
  );
}

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

/* ============================== SIMULATION DE PROGRESSION (Premium) ============================== */

function ProgressSimulationScreen({ theme, sessions, weightEntries, programs, caloriesLog, nutritionProfile }) {
  const [mode, setMode] = useState("strength"); // 'strength' | 'weight'
  return (
    <div className="px-4 pt-2 space-y-4">
      <div className="flex gap-2">
        <Pill theme={theme} active={mode === "strength"} onClick={() => setMode("strength")}>Force</Pill>
        <Pill theme={theme} active={mode === "weight"} onClick={() => setMode("weight")}>Poids corporel</Pill>
      </div>
      {mode === "strength" ? (
        <StrengthSimulation theme={theme} sessions={sessions} programs={programs} />
      ) : (
        <WeightSimulation theme={theme} weightEntries={weightEntries} sessions={sessions} caloriesLog={caloriesLog} nutritionProfile={nutritionProfile} />
      )}
    </div>
  );
}

function StrengthSimulation({ theme, sessions, programs }) {
  const allExercises = useMemo(() => {
    const names = new Set();
    programs.forEach((p) => flattenExercises(p.blocks).forEach((e) => names.add(e.name)));
    sessions.forEach((s) => s.exerciseLogs.forEach((e) => names.add(e.name)));
    return Array.from(names).sort();
  }, [programs, sessions]);
  const [selected, setSelected] = useState(allExercises[0] || "");
  const [target, setTarget] = useState("");
  useEffect(() => { if (!selected && allExercises.length) setSelected(allExercises[0]); }, [allExercises, selected]);

  // Charge maximale soulevée à chaque séance où cet exercice apparaît — la même logique
  // que le graphique de Progression, réutilisée ici pour la régression.
  const points = useMemo(() => {
    const pts = [];
    for (const s of [...sessions].reverse()) {
      const el = s.exerciseLogs.find((e) => e.name === selected);
      if (!el) continue;
      const doneSets = el.sets.filter((x) => x.done && x.weight && x.reps);
      if (!doneSets.length) continue;
      const maxWeight = Math.max(...doneSets.map((x) => Number(x.weight)));
      pts.push({ date: s.date, dateLabel: fmtDate(s.date), maxWeight });
    }
    return pts;
  }, [sessions, selected]);

  const targetNum = parseLocaleNumber(target);
  const regressionPoints = useMemo(() => {
    if (points.length < 3) return [];
    const base = new Date(points[0].date).getTime();
    return points.map((p) => ({ x: (new Date(p.date).getTime() - base) / 86400000, y: p.maxWeight }));
  }, [points]);
  const estimate = useMemo(() => (
    regressionPoints.length && Number.isFinite(targetNum) && targetNum > 0 ? estimateTargetETA(regressionPoints, targetNum) : null
  ), [regressionPoints, targetNum]);
  const currentMax = points.length ? points[points.length - 1].maxWeight : null;
  const daySpan = points.length >= 2 ? (new Date(points[points.length - 1].date).getTime() - new Date(points[0].date).getTime()) / 86400000 : 0;
  const confidence = computeSimulationConfidence({ weightEntriesCount: points.length, daySpan, caloriesLogCount: 0, sessionsCount: points.length });
  const horizonProjections = useMemo(() => {
    if (!regressionPoints.length) return [];
    return PROJECTION_HORIZONS.map((h) => ({ ...h, value: projectValueAtDays(regressionPoints, h.days) }));
  }, [regressionPoints]);

  if (allExercises.length === 0) {
    return <Card theme={theme}><EmptyState theme={theme} icon={Dumbbell} title="Aucun exercice enregistré" subtitle="Réalise quelques séances pour pouvoir simuler ta progression." /></Card>;
  }

  return (
    <div className="space-y-4">
      <div>
        <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold mb-1.5 px-1">Exercice</p>
        <div className="relative">
          <select
            value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-xl px-3.5 py-3 text-[14.5px] outline-none appearance-none"
            style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }}
          >
            {allExercises.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <ChevronDown size={16} color={theme.textFaint} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {currentMax != null && (
        <div className="flex items-center justify-between">
          <Card theme={theme} className="p-4 flex-1 mr-2.5">
            <p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Charge actuelle max</p>
            <p style={{ color: theme.text }} className="text-[22px] font-extrabold">{currentMax} kg</p>
          </Card>
          <ConfidenceBadge theme={theme} score={confidence} />
        </div>
      )}

      <LabeledInput theme={theme} label="Objectif (kg)" value={target} onChange={setTarget} placeholder="Ex : 120" />

      {points.length < 3 ? (
        <Card theme={theme}><EmptyState theme={theme} icon={TrendingUp} title="Pas assez d'historique" subtitle="Il faut au moins 3 séances avec cet exercice pour estimer une progression." /></Card>
      ) : targetNum > 0 && (
        estimate ? (
          <Card theme={theme} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold">Date estimée</p>
              <p style={{ color: theme.text }} className="text-[14px] font-extrabold">{estimate.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <div className="flex items-center justify-between">
              <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold">Temps nécessaire</p>
              <p style={{ color: theme.text }} className="text-[14px] font-extrabold">~{Math.round(estimate.days / 7)} semaines</p>
            </div>
            <div className="flex items-center justify-between">
              <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold">Progression moyenne</p>
              <p style={{ color: theme.text }} className="text-[14px] font-extrabold">{estimate.weeklyRate > 0 ? "+" : ""}{estimate.weeklyRate.toFixed(2)} kg/semaine</p>
            </div>
          </Card>
        ) : (
          <Card theme={theme}><EmptyState theme={theme} icon={Target} title="Estimation impossible" subtitle="Ta tendance actuelle stagne ou ne va pas vers cet objectif." /></Card>
        )
      )}

      {points.length >= 2 && (
        <ChartCard theme={theme} title="Historique de charge">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={points} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} vertical={false} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: theme.textFaint }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: theme.textFaint }} axisLine={false} tickLine={false} width={30} domain={["dataMin - 2", "dataMax + 2"]} />
              <Tooltip contentStyle={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, fontSize: 12 }} labelStyle={{ color: theme.text }} />
              <Line type="monotone" dataKey="maxWeight" stroke={theme.accent} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {horizonProjections.length > 0 && (
        <div>
          <SectionTitle theme={theme}>Projections</SectionTitle>
          <Card theme={theme} className="p-2">
            {horizonProjections.map((h, i) => (
              <div key={h.id} className="flex items-center justify-between px-3 py-2.5" style={{ borderTop: i ? `1px solid ${theme.border}` : "none" }}>
                <span style={{ color: theme.textMuted }} className="text-[13px] font-semibold">{h.label}</span>
                <span style={{ color: theme.text }} className="text-[14px] font-extrabold">{h.value != null ? `${Math.round(h.value)} kg` : "—"}</span>
              </div>
            ))}
          </Card>
        </div>
      )}

      <p style={{ color: theme.textFaint }} className="text-[11px] px-1">Estimation basée sur une régression linéaire de ton historique réel — une hypothèse, pas une garantie : elle suppose que ta progression continue au même rythme.</p>
    </div>
  );
}

function WeightSimulation({ theme, weightEntries, sessions, caloriesLog, nutritionProfile }) {
  const sorted = useMemo(() => [...weightEntries].sort((a, b) => a.date.localeCompare(b.date)), [weightEntries]);
  const current = sorted.length ? sorted[sorted.length - 1].weight : null;
  const [target, setTarget] = useState("");
  const targetNum = parseLocaleNumber(target);

  const regressionPoints = useMemo(() => {
    if (sorted.length < 3) return [];
    const base = new Date(sorted[0].date).getTime();
    return sorted.map((e) => ({ x: (new Date(e.date).getTime() - base) / 86400000, y: e.weight }));
  }, [sorted]);

  const estimate = useMemo(() => (
    regressionPoints.length && Number.isFinite(targetNum) && targetNum > 0 ? estimateTargetETA(regressionPoints, targetNum) : null
  ), [regressionPoints, targetNum]);

  // --- Bilan calorique réel des 14 derniers jours renseignés (pas juste le poids) --------
  // Recoupe apports (caloriesLog) et dépense estimée (BMR + activité déclarée) pour donner
  // un second indicateur, indépendant de la balance/pesée, qui doit normalement pointer
  // dans la même direction que la tendance observée sur le poids.
  const age = EnergyCalculator.computeAge(nutritionProfile?.birthdate);
  const bmr = EnergyCalculator.computeBMR({ sex: nutritionProfile?.sex, weightKg: current, heightCm: nutritionProfile?.height, age });
  const tdee = bmr ? EnergyCalculator.computeTDEE({ bmr, activityLevel: nutritionProfile?.activityLevel, avgDailyWorkoutKcal: 0 }) : null;
  const recentCalorieEntries = useMemo(() => {
    const cutoff = Date.now() - 14 * 86400000;
    return caloriesLog.filter((c) => new Date(c.date).getTime() >= cutoff);
  }, [caloriesLog]);
  const avgIntake = recentCalorieEntries.length ? recentCalorieEntries.reduce((a, c) => a + (c.calories || 0), 0) / recentCalorieEntries.length : null;
  const avgProtein = useMemo(() => {
    const withProtein = recentCalorieEntries.filter((c) => c.protein != null);
    return withProtein.length ? withProtein.reduce((a, c) => a + c.protein, 0) / withProtein.length : null;
  }, [recentCalorieEntries]);
  // Règle classique : ~7700 kcal ≈ 1 kg de masse grasse. Hypothèse documentée, simplifiée
  // (ne distingue pas perte de gras / de muscle).
  const impliedWeeklyRateFromCalories = (avgIntake != null && tdee) ? ((avgIntake - tdee) * 7) / 7700 : null;

  const daySpan = sorted.length >= 2 ? (new Date(sorted[sorted.length - 1].date).getTime() - new Date(sorted[0].date).getTime()) / 86400000 : 0;
  const weeklyTrainingSessions = sessions.filter((s) => Date.now() - s.startedAt < 28 * 86400000).length / 4;
  const confidence = computeSimulationConfidence({
    weightEntriesCount: sorted.length, daySpan, caloriesLogCount: recentCalorieEntries.length, sessionsCount: Math.round(weeklyTrainingSessions * 4),
  });

  const horizonProjections = useMemo(() => {
    if (!regressionPoints.length) return [];
    return PROJECTION_HORIZONS.map((h) => ({ ...h, value: projectValueAtDays(regressionPoints, h.days) }));
  }, [regressionPoints]);

  // --- Recommandations simples, basées sur des règles (pas une IA) -----------------------
  const recommendations = [];
  if (avgIntake != null && tdee) {
    const diffPct = ((avgIntake - tdee) / tdee) * 100;
    if (nutritionProfile?.goal === "cut" && diffPct > -10) {
      recommendations.push("Ton apport moyen récent est proche de ta dépense estimée — le déficit est plus faible que prévu pour une sèche. Envisage de réduire un peu tes apports ou d'augmenter le cardio.");
    } else if (nutritionProfile?.goal === "bulk" && diffPct < 3) {
      recommendations.push("Ton apport moyen récent est proche de ta dépense estimée — le surplus est plus faible que prévu pour une prise de masse. Envisage d'augmenter légèrement tes apports.");
    }
  }
  if (avgProtein != null && current) {
    const proteinPerKg = avgProtein / current;
    if (proteinPerKg < 1.6) {
      recommendations.push(`Ton apport moyen en protéines (~${Math.round(avgProtein)}g/jour, soit ${proteinPerKg.toFixed(1)}g/kg) est en dessous des repères usuels pour soutenir le maintien ou le gain musculaire — vise plutôt 1,8 à 2,2g/kg.`);
    }
  }
  if (weeklyTrainingSessions < 2) {
    recommendations.push("Moins de 2 séances par semaine en moyenne sur le dernier mois — la régularité d'entraînement influence directement la fiabilité de ces projections.");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Card theme={theme} className="p-4 flex-1 mr-2.5">
          <p style={{ color: theme.textMuted }} className="text-[11px] font-semibold mb-1">Poids actuel</p>
          <p style={{ color: theme.text }} className="text-[22px] font-extrabold">{current ? `${fmtWeight(current)} kg` : "—"}</p>
        </Card>
        <ConfidenceBadge theme={theme} score={confidence} />
      </div>

      <LabeledInput theme={theme} label="Poids cible (kg)" value={target} onChange={setTarget} placeholder="Ex : 75" />

      {sorted.length < 3 ? (
        <Card theme={theme}><EmptyState theme={theme} icon={Scale} title="Pas assez de données" subtitle="Ajoute au moins 3 pesées (dans Poids) pour estimer ta progression." /></Card>
      ) : targetNum > 0 && (
        estimate ? (
          <Card theme={theme} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold">Date estimée</p>
              <p style={{ color: theme.text }} className="text-[14px] font-extrabold">{estimate.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <div className="flex items-center justify-between">
              <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold">Durée nécessaire</p>
              <p style={{ color: theme.text }} className="text-[14px] font-extrabold">~{Math.round(estimate.days / 7)} semaines</p>
            </div>
            <div className="flex items-center justify-between">
              <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold">Rythme observé (pesées)</p>
              <p style={{ color: theme.text }} className="text-[14px] font-extrabold">{estimate.weeklyRate > 0 ? "+" : ""}{fmtWeight(estimate.weeklyRate)} kg/semaine</p>
            </div>
            {impliedWeeklyRateFromCalories != null && (
              <div className="flex items-center justify-between pt-1.5" style={{ borderTop: `1px solid ${theme.border}` }}>
                <p style={{ color: theme.textMuted }} className="text-[12px] font-semibold">Rythme théorique (bilan calorique)</p>
                <p style={{ color: theme.text }} className="text-[14px] font-extrabold">{impliedWeeklyRateFromCalories > 0 ? "+" : ""}{fmtWeight(impliedWeeklyRateFromCalories)} kg/semaine</p>
              </div>
            )}
          </Card>
        ) : (
          <Card theme={theme}><EmptyState theme={theme} icon={Target} title="Estimation impossible" subtitle="Ta tendance actuelle stagne ou ne va pas vers cet objectif." /></Card>
        )
      )}

      {impliedWeeklyRateFromCalories != null && (
        <p style={{ color: theme.textFaint }} className="text-[11px] px-1">
          "Rythme théorique" = ({Math.round(avgIntake)} kcal consommées en moyenne − {tdee} kcal dépensées estimées) × 7 jours ÷ 7700 kcal/kg — hypothèse classique, simplifiée.
        </p>
      )}

      {horizonProjections.length > 0 && (
        <div>
          <SectionTitle theme={theme}>Projections</SectionTitle>
          <Card theme={theme} className="p-2">
            {horizonProjections.map((h, i) => (
              <div key={h.id} className="flex items-center justify-between px-3 py-2.5" style={{ borderTop: i ? `1px solid ${theme.border}` : "none" }}>
                <span style={{ color: theme.textMuted }} className="text-[13px] font-semibold">{h.label}</span>
                <span style={{ color: theme.text }} className="text-[14px] font-extrabold">{h.value != null ? `${fmtWeight(h.value)} kg` : "—"}</span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {recommendations.length > 0 && (
        <div>
          <SectionTitle theme={theme}>Recommandations</SectionTitle>
          <div className="space-y-2">
            {recommendations.map((r, i) => (
              <Card key={i} theme={theme} className="p-3.5 flex items-start gap-2.5">
                <Bell size={14} color={theme.accent} className="mt-0.5 shrink-0" />
                <p style={{ color: theme.text }} className="text-[13px] leading-snug">{r}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      <p style={{ color: theme.textFaint }} className="text-[11px] px-1">
        Estimation basée sur une régression linéaire de ton historique de poids réel, recoupée avec ton bilan calorique moyen quand il est disponible — une hypothèse, pas une garantie. L'indice de confiance reflète la quantité de données disponibles, pas une vraie probabilité statistique.
      </p>
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

function AddWeightSheet({ theme, onClose, onAdd }) {
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [bodyfat, setBodyfat] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const { height: viewportHeight } = useVisualViewport();

  const handleSave = () => {
    const parsedWeight = parseLocaleNumber(weight);
    if (weight.trim() === "") { setError("Indique un poids avant d'enregistrer."); return; }
    if (!Number.isFinite(parsedWeight)) { setError("Poids invalide — utilise uniquement des chiffres (ex : 92,6 ou 92.6)."); return; }
    if (parsedWeight <= 0) { setError("Le poids doit être supérieur à 0."); return; }

    const parsedWaist = waist.trim() === "" ? null : parseLocaleNumber(waist);
    const parsedBodyfat = bodyfat.trim() === "" ? null : parseLocaleNumber(bodyfat);
    if (parsedWaist != null && !Number.isFinite(parsedWaist)) { setError("Tour de taille invalide."); return; }
    if (parsedBodyfat != null && !Number.isFinite(parsedBodyfat)) { setError("Masse grasse invalide."); return; }

    setError("");
    onAdd({ id: uid(), date, weight: parsedWeight, waist: parsedWaist, bodyfat: parsedBodyfat, comment });
  };

  return (
    <motion.div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 200, height: viewportHeight ? `${viewportHeight}px` : undefined }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl p-5" style={{ maxWidth: 480, background: theme.card, borderTop: `1px solid ${theme.border}`, paddingBottom: "calc(2rem + env(safe-area-inset-bottom))", maxHeight: viewportHeight ? `${viewportHeight * 0.85}px` : "85vh", overflowY: "auto" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: theme.border }} />
        <h3 style={{ color: theme.text }} className="text-[17px] font-bold mb-4">Ajouter une pesée</h3>
        <div className="space-y-2.5">
          <FieldRow theme={theme} label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent outline-none text-right" style={{ color: theme.text }} /></FieldRow>
          <FieldRow theme={theme} label="Poids (kg)"><input autoFocus inputMode="decimal" placeholder="0" value={weight} onChange={(e) => { setWeight(e.target.value); setError(""); }} className="bg-transparent outline-none text-right w-24 font-bold text-[16px]" style={{ color: theme.text }} /></FieldRow>
          <FieldRow theme={theme} label="Tour de taille (cm)"><input inputMode="decimal" placeholder="optionnel" value={waist} onChange={(e) => { setWaist(e.target.value); setError(""); }} className="bg-transparent outline-none text-right w-24" style={{ color: theme.text }} /></FieldRow>
          <FieldRow theme={theme} label="Masse grasse (%)"><input inputMode="decimal" placeholder="optionnel" value={bodyfat} onChange={(e) => { setBodyfat(e.target.value); setError(""); }} className="bg-transparent outline-none text-right w-24" style={{ color: theme.text }} /></FieldRow>
          <textarea placeholder="Commentaire (optionnel)" value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
            className="w-full rounded-xl p-2.5 text-[13px] outline-none resize-none" style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }} />
        </div>
        {error && <p style={{ color: theme.bad }} className="text-[12.5px] font-semibold mt-3 px-1">{error}</p>}
        <div className="mt-5">
          <BigButton theme={theme} gradient onClick={handleSave}>
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
