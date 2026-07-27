import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, GripVertical, ChevronDown,
} from "lucide-react";
import { Card, Pill } from "../ui/Card";
import { FieldRow, MiniStepper } from "../ui/Inputs";

export function AbsExerciseRow({ theme, exercise, onUpdate, onRemove }) {
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
