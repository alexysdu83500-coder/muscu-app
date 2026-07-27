import { Reorder } from "framer-motion";
import {
  GripVertical,
} from "lucide-react";
import { Card } from "../ui/Card";
import { groupLabel } from "../../utils/calculations";

export function ReorderableBlockRow({ theme, block, onStartNow }) {
  const names = block.exerciseLogs.map((el) => el.name);
  const isGroup = names.length > 1;
  return (
    <Reorder.Item value={block}>
      <Card theme={theme} className="p-3.5 flex items-center gap-3" style={{ background: theme.card2 }}>
        <GripVertical size={17} color={theme.textFaint} className="cursor-grab shrink-0" />
        <div className="flex-1 min-w-0">
          {isGroup && (
            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold inline-block mb-1" style={{ background: theme.accent, color: "#fff" }}>
              {groupLabel(names.length)}
            </span>
          )}
          <p style={{ color: theme.text }} className="font-semibold text-[13.5px] truncate">{names.join(" + ")}</p>
        </div>
        <button
          onClick={() => onStartNow(block.id)}
          className="shrink-0 px-3.5 py-2.5 rounded-xl text-[11.5px] font-bold text-white active:scale-95 transition-transform"
          style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})` }}
        >
          Commencer
        </button>
      </Card>
    </Reorder.Item>
  );
}

// --- Carte "exercice actif" : entièrement interactive (poids, reps, validation) ---------
