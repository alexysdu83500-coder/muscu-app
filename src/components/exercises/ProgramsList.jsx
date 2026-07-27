import {
  Dumbbell, Plus, ChevronRight, Play,
} from "lucide-react";
import { MuscleIllustration } from "./MuscleIllustration";
import { Card, IconButton } from "../ui/Card";
import { EmptyState } from "../ui/Feedback";
import { flattenExercises } from "../../utils/calculations";
import { muscleLabel } from "../../utils/muscleGroups";
import { uid } from "../../utils/uid";

export function ProgramsList({ theme, programs, setPrograms, onOpen, onStart }) {
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
