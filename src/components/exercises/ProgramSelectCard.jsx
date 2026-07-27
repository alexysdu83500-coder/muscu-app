import {
  Check,
} from "lucide-react";
import { MuscleIllustration } from "./MuscleIllustration";
import { Card } from "../ui/Card";
import { IconBadge } from "../ui/Feedback";
import { flattenExercises } from "../../utils/calculations";
import { muscleLabel } from "../../utils/muscleGroups";

export function ProgramSelectCard({ theme, program, selected, onSelect }) {
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
