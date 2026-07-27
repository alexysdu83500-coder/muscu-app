import { motion } from "framer-motion";
import {
  ChevronLeft,
} from "lucide-react";
import { ProfileAccountHeader } from "../common/ProfileAccountHeader";
import { BigButton, IconButton } from "./Card";

export function SectionTitle({ theme, children, right }) {
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <h2 style={{ color: theme.text }} className="text-[13px] font-bold uppercase tracking-wide" >
        {children}
      </h2>
      {right}
    </div>
  );
}

export function EmptyState({ theme, icon: Icon, title, subtitle }) {
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

export function IconBadge({ theme, icon: Icon, size = 34, iconSize = 16, tone = "accent", filled = false, className = "" }) {
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

export function EffortRing({ theme, progress, size = 96, stroke = 11, label, value }) {
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

export function ConfirmSheet({ theme, title, subtitle, confirmLabel, onConfirm, onCancel, danger }) {
  return (
    <motion.div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 200 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onCancel} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl p-5 text-center" style={{ maxWidth: 480, background: theme.card, borderTop: `1px solid ${theme.border}`, paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}>
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

export function SubPageHeader({ theme, title, onBack }) {
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
