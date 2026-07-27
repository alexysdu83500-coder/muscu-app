import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, GripVertical, ChevronDown, Link2,
} from "lucide-react";
import { MuscleIllustration } from "./MuscleIllustration";
import { Card, Pill } from "../ui/Card";
import { FieldRow, MiniStepper } from "../ui/Inputs";
import { MUSCLE_GROUPS, muscleLabel } from "../../utils/muscleGroups";

export function ExerciseRow({ theme, exercise, restSec, onUpdate, onUpdateRest, onRemove, onCreateSuperset }) {
  const [open, setOpen] = useState(false);
  const toggleSecondary = (id) => {
    const cur = exercise.secondaryMuscles || [];
    onUpdate({ secondaryMuscles: cur.includes(id) ? cur.filter((m) => m !== id) : [...cur, id] });
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
            {exercise.series} × {exercise.reps} reps · repos {restSec}s{exercise.primaryMuscle ? ` · ${muscleLabel(exercise.primaryMuscle)}` : ""}
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
                <MiniStepper theme={theme} label="Séries" value={exercise.series} onChange={(v) => onUpdate({ series: v })} />
                <MiniStepper theme={theme} label="Reps" value={exercise.reps} onChange={(v) => onUpdate({ reps: v })} />
                <MiniStepper theme={theme} label="Repos" value={restSec} step={15} onChange={onUpdateRest} suffix="s" />
              </div>
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
