import {
  Lock,
} from "lucide-react";
import { groupLabel } from "../../utils/calculations";

export function ExerciseCardLocked({ theme, name, groupSize, letter, exIndexInBlock, totalRounds, targetReps, onLockedTap }) {
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
