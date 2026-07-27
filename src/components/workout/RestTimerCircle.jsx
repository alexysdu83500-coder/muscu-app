import { motion } from "framer-motion";
import {
  ChevronRight, Play, Pause, Timer,
} from "lucide-react";
import { fmtClock } from "../../utils/formatters";

export function RestTimerCircle({ theme, rest, onPauseResume, onSkip, size = 250 }) {
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
