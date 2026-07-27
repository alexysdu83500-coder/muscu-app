import {
  Plus, X,
} from "lucide-react";
import { Card } from "../ui/Card";
import { groupLabel } from "../../utils/calculations";

export function EditableExerciseCard({ theme, exerciseIds, byId, groupLetter, onUpdateExercise, onUpdateSet, onAddSet, onRemoveSet }) {
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
