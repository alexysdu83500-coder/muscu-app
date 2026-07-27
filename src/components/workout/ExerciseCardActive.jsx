import React, { useState, useEffect, useMemo } from "react";
import {
  Check, ChevronRight, ChevronLeft, Edit2, Flame, Info, Target, Trophy,
} from "lucide-react";
import { MuscleIllustration } from "../exercises/MuscleIllustration";
import { BigButton, Card } from "../ui/Card";
import { BigNumberStepper } from "../ui/Inputs";
import { LastSessionCard } from "./LastSessionCard";
import { lastPerformanceFor } from "../../services/statisticsService";
import { groupLabel } from "../../utils/calculations";
import { muscleLabel } from "../../utils/muscleGroups";

export function ExerciseCardActive({ theme, log, groupSize, letter, exIndexInBlock, round, sessions, isAbs, onChangeSet, onValidate, onRename, onAddSet, onSkip, onPrev }) {
  const last = useMemo(() => lastPerformanceFor(sessions, log.name), [sessions, log.name]);
  const pr = useMemo(() => {
    let best = null;
    for (const s of sessions) {
      const el = s.exerciseLogs.find((e) => e.name === log.name);
      if (!el) continue;
      for (const set of el.sets) {
        if (set.done && set.weight && (!best || Number(set.weight) > best)) best = Number(set.weight);
      }
    }
    return best;
  }, [sessions, log.name]);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(log.name);
  useEffect(() => { setNameDraft(log.name); }, [log.name]);
  const commitRename = () => { const n = nameDraft.trim() || log.name; onRename(n); setNameDraft(n); setEditingName(false); };

  const set = log.sets[round] || { weight: "", reps: "" };
  const totalRounds = log.sets.length;
  const isDuration = log.targetUnit === "sec";

  return (
    <Card theme={theme} className="p-5">
      <div className="flex items-center gap-1.5 mb-3">
        {groupSize > 1 && (
          <span className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold inline-block" style={{ background: theme.accent, color: "#fff" }}>
            {groupLabel(groupSize)} · {letter}{exIndexInBlock + 1}
          </span>
        )}
        {isAbs && (
          <span className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold inline-flex items-center gap-1" style={{ background: `${theme.accent}1f`, color: theme.accent }}>
            <Flame size={11} /> Abdominaux
          </span>
        )}
      </div>

      {editingName ? (
        <input
          autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitRename} onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
          className="w-full text-[23px] font-extrabold bg-transparent outline-none border-b mb-1"
          style={{ color: theme.text, borderColor: theme.accent }}
        />
      ) : (
        <div className="flex items-start gap-3 mb-1">
          {log.primaryMuscle && (
            <div className="rounded-2xl shrink-0 flex items-center justify-center" style={{ width: 52, height: 52, background: theme.card2 }}>
              <MuscleIllustration theme={theme} muscles={log.primaryMuscle} size={40} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <button onClick={() => setEditingName(true)} className="flex items-center gap-2 text-left">
              <h2 style={{ color: theme.text }} className="text-[21px] font-extrabold leading-tight truncate">{log.name}</h2>
              <Edit2 size={13} color={theme.textFaint} className="shrink-0" />
            </button>
            {log.primaryMuscle && <p style={{ color: theme.textMuted }} className="text-[12px] mt-0.5">{muscleLabel(log.primaryMuscle)}{log.secondaryMuscles?.length ? ` · ${log.secondaryMuscles.map(muscleLabel).join(", ")}` : ""}</p>}
          </div>
        </div>
      )}
      <p style={{ color: theme.accent }} className="text-[14px] font-bold mb-4">Série {round + 1} / {totalRounds}</p>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="px-3 py-1.5 rounded-full text-[12px] font-semibold inline-flex items-center gap-1" style={{ background: theme.card2, color: theme.textMuted }}>
          <Target size={12} /> {log.targetReps}{isDuration ? "s" : " reps"} cible
        </span>
        {pr && (
          <span className="px-3 py-1.5 rounded-full text-[12px] font-bold flex items-center gap-1" style={{ background: `${theme.accent2}22`, color: theme.accent2 }}>
            <Trophy size={12} /> Record {pr}kg
          </span>
        )}
      </div>

      {log.notes && (
        <div className="rounded-2xl p-3.5 mb-4 flex items-start gap-2.5" style={{ background: `${theme.accent}14` }}>
          <Info size={14} color={theme.accent} className="mt-0.5 shrink-0" />
          <p style={{ color: theme.text }} className="text-[13px] leading-snug">{log.notes}</p>
        </div>
      )}

      <LastSessionCard theme={theme} last={last} currentSet={{ weight: set.weight, reps: set.reps, round }} />

      {/* grid-cols-2 (= repeat(2, minmax(0,1fr))) donne deux colonnes strictement égales en
          largeur, qui s'adaptent à n'importe quelle taille d'écran ; items-stretch force les
          deux cartes à la même hauteur. Aucune largeur fixe, aucun positionnement absolu. */}
      <div className="grid grid-cols-2 gap-3 mb-5 items-stretch">
        <BigNumberStepper theme={theme} label="Charge (kg)" value={set.weight} onChange={(v) => onChangeSet({ weight: v })} step={2.5} />
        <BigNumberStepper theme={theme} label={isDuration ? "Durée (sec)" : "Répétitions"} value={set.reps} onChange={(v) => onChangeSet({ reps: v })} step={isDuration ? 5 : 1} />
      </div>

      <BigButton theme={theme} gradient onClick={onValidate}>
        <Check size={18} strokeWidth={3} /> Valider la série
      </BigButton>

      <button onClick={onAddSet} className="w-full text-center mt-3 text-[12.5px] font-semibold" style={{ color: theme.textMuted }}>
        + Ajouter une série bonus à cet exercice
      </button>

      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
        <button
          onClick={onPrev || undefined} disabled={!onPrev}
          className="text-[12px] font-semibold flex items-center gap-1"
          style={{ color: onPrev ? theme.textMuted : theme.textFaint, opacity: onPrev ? 1 : 0.4 }}
        >
          <ChevronLeft size={13} /> Précédent
        </button>
        <button onClick={onSkip} className="text-[12px] font-semibold flex items-center gap-1" style={{ color: theme.textMuted }}>
          Passer cet exercice <ChevronRight size={13} />
        </button>
      </div>
    </Card>
  );
}

// --- Orchestrateur principal du mode entraînement --------------------------------------
// Regroupe l'état global de la séance : étape courante (exercice + série), phase
// ('set' = saisie en cours, 'rest' = récupération, 'done' = séance terminée), chrono
// global (toujours actif) et minuteur de récupération (pilotable indépendamment).
