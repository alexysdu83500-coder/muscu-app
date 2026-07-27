import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, GripVertical, ChevronDown, Unlink,
} from "lucide-react";
import { Card } from "../ui/Card";
import { FieldRow, MiniStepper } from "../ui/Inputs";
import { groupLabel } from "../../utils/calculations";

export function GroupBlockCard({ theme, block, letter, onUpdateExercise, onUpdateRest, onRemoveExercise, onDissociate, onDeleteGroup, onAddToGroup }) {
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
