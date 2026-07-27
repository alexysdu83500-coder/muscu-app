import {
  Pause,
} from "lucide-react";
import { fmtClock } from "../../utils/formatters";

export function SessionHeader({ theme, programName, elapsedSec, stepNumber, totalSteps, onCancel, onEndClick }) {
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
