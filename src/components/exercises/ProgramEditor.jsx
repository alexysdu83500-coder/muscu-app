import React, { useState } from "react";
import { AnimatePresence, Reorder } from "framer-motion";
import {
  Dumbbell, Plus, ChevronLeft, Play, Trash2, Edit2, Flame,
} from "lucide-react";
import { AbsExerciseRow } from "./AbsExerciseRow";
import { AddExerciseSheet } from "./AddExerciseSheet";
import { ExerciseRow } from "./ExerciseRow";
import { GroupBlockCard } from "./GroupBlockCard";
import { MuscleGroupPicker } from "./MuscleIllustration";
import { PairExerciseSheet } from "./PairExerciseSheet";
import { BigButton, Card, IconButton } from "../ui/Card";
import { EmptyState, SectionTitle } from "../ui/Feedback";
import { WorkoutSession } from "../workout/WorkoutSessionView";
import { computeGroupLetters } from "../../utils/calculations";
import { uid } from "../../utils/uid";

export function ProgramEditor({ theme, program, setPrograms, onBack, onStart }) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(program?.name || "");
  const [showAdd, setShowAdd] = useState(false);
  const [showAddAbs, setShowAddAbs] = useState(false);
  const [pairTarget, setPairTarget] = useState(null); // blockId currently pairing/extending

  if (!program) return null;

  const updateProgram = (fn) => setPrograms((ps) => ps.map((p) => (p.id === program.id ? fn({ ...p }) : p)));
  const setBlocks = (blocks) => updateProgram((p) => ({ ...p, blocks }));
  const muscleGroups = program.muscleGroups || [];
  const toggleMuscleGroup = (id) => updateProgram((p) => {
    const cur = p.muscleGroups || [];
    return { ...p, muscleGroups: cur.includes(id) ? cur.filter((m) => m !== id) : [...cur, id] };
  });
  const absExercises = program.absExercises || [];
  const setAbsExercises = (list) => updateProgram((p) => ({ ...p, absExercises: list }));
  const updateAbsExercise = (id, patch) => setAbsExercises(absExercises.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeAbsExercise = (id) => setAbsExercises(absExercises.filter((e) => e.id !== id));
  const addAbsExercise = (ex) => setAbsExercises([...absExercises, ex]);

  const updateExerciseInBlock = (blockId, exId, patch) =>
    setBlocks(program.blocks.map((b) => (b.id === blockId ? { ...b, exercises: b.exercises.map((e) => (e.id === exId ? { ...e, ...patch } : e)) } : b)));

  const updateBlockRest = (blockId, restSec) => setBlocks(program.blocks.map((b) => (b.id === blockId ? { ...b, restSec } : b)));

  const removeBlock = (blockId) => setBlocks(program.blocks.filter((b) => b.id !== blockId));

  const removeExerciseFromBlock = (blockId, exId) => {
    setBlocks(program.blocks.flatMap((b) => {
      if (b.id !== blockId) return [b];
      const remaining = b.exercises.filter((e) => e.id !== exId);
      if (remaining.length === 0) return [];
      return [{ ...b, exercises: remaining }];
    }));
  };

  const dissociateBlock = (blockId) => {
    setBlocks(program.blocks.flatMap((b) => {
      if (b.id !== blockId) return [b];
      return b.exercises.map((ex) => ({ id: uid(), restSec: b.restSec, exercises: [ex] }));
    }));
  };

  const addNewExercise = (ex) => setBlocks([...program.blocks, { id: uid(), restSec: ex.rest || 90, exercises: [{ id: ex.id, name: ex.name, series: ex.series, reps: ex.reps, notes: ex.notes, primaryMuscle: ex.primaryMuscle || null, secondaryMuscles: ex.secondaryMuscles || [] }] }]);

  const attachExercise = (blockId, exDef) => {
    setBlocks(program.blocks
      .filter((b) => b.id !== exDef.__sourceBlockId)
      .map((b) => (b.id === blockId ? { ...b, exercises: [...b.exercises, { id: exDef.id, name: exDef.name, series: exDef.series, reps: exDef.reps, notes: exDef.notes || "", primaryMuscle: exDef.primaryMuscle || null, secondaryMuscles: exDef.secondaryMuscles || [] }] } : b)));
    setPairTarget(null);
  };

  const deleteProgram = () => {
    setPrograms((ps) => ps.filter((p) => p.id !== program.id));
    onBack();
  };

  const letters = computeGroupLetters(program.blocks);
  const pairTargetBlock = program.blocks.find((b) => b.id === pairTarget);
  const candidateExercises = program.blocks
    .filter((b) => b.id !== pairTarget && b.exercises.length === 1)
    .map((b) => ({ ...b.exercises[0], __sourceBlockId: b.id }));

  return (
    <div className="px-4 pt-1 space-y-4">
      <div className="flex items-center gap-2 -ml-1">
        <IconButton theme={theme} onClick={onBack}><ChevronLeft size={18} color={theme.text} /></IconButton>
        {editingName ? (
          <input
            autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => { updateProgram((p) => ({ ...p, name: nameDraft || p.name })); setEditingName(false); }}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
            className="flex-1 text-[20px] font-extrabold bg-transparent outline-none"
            style={{ color: theme.text }}
          />
        ) : (
          <button onClick={() => setEditingName(true)} className="flex-1 text-left flex items-center gap-2">
            <h1 style={{ color: theme.text }} className="text-[20px] font-extrabold truncate">{program.name}</h1>
            <Edit2 size={13} color={theme.textFaint} />
          </button>
        )}
      </div>

      <div>
        <SectionTitle theme={theme}>Groupes musculaires ciblés</SectionTitle>
        <MuscleGroupPicker theme={theme} selected={muscleGroups} onToggle={toggleMuscleGroup} />
      </div>

      <BigButton theme={theme} gradient onClick={() => onStart(program)}>
        <Play size={17} fill="#fff" /> Commencer la séance
      </BigButton>

      <div>
        <SectionTitle theme={theme}>Exercices · glisser pour réordonner</SectionTitle>
        {program.blocks.length === 0 ? (
          <Card theme={theme}><EmptyState theme={theme} icon={Dumbbell} title="Aucun exercice" subtitle="Ajoute des exercices à ce programme." /></Card>
        ) : (
          <Reorder.Group axis="y" values={program.blocks} onReorder={setBlocks} className="space-y-2.5">
            {program.blocks.map((block) => (
              <Reorder.Item key={block.id} value={block}>
                {block.exercises.length === 1 ? (
                  <ExerciseRow
                    theme={theme} exercise={block.exercises[0]} restSec={block.restSec}
                    onUpdate={(patch) => updateExerciseInBlock(block.id, block.exercises[0].id, patch)}
                    onUpdateRest={(r) => updateBlockRest(block.id, r)}
                    onRemove={() => removeBlock(block.id)}
                    onCreateSuperset={() => setPairTarget(block.id)}
                  />
                ) : (
                  <GroupBlockCard
                    theme={theme} block={block} letter={letters[block.id]}
                    onUpdateExercise={(exId, patch) => updateExerciseInBlock(block.id, exId, patch)}
                    onUpdateRest={(r) => updateBlockRest(block.id, r)}
                    onRemoveExercise={(exId) => removeExerciseFromBlock(block.id, exId)}
                    onDissociate={() => dissociateBlock(block.id)}
                    onDeleteGroup={() => removeBlock(block.id)}
                    onAddToGroup={() => setPairTarget(block.id)}
                  />
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>

      <button onClick={() => setShowAdd(true)} className="w-full rounded-2xl py-3.5 font-bold text-[14.5px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform" style={{ background: theme.card2, color: theme.accent, border: `1.5px dashed ${theme.border}` }}>
        <Plus size={17} /> Ajouter un exercice
      </button>

      {/* Bloc abdominaux : réalisé automatiquement à la fin de la séance (voir
          WorkoutSession / phase "absIntro"). Liste à part de l'exercice courant plus haut :
          chaque exercice est indépendant, avec ses propres séries, reps OU durée
          (gainage), et repos — pas de biset ici, juste une liste simple réordonnable. */}
      <div className="pt-2">
        <SectionTitle theme={theme}>Bloc abdominaux · fin de séance</SectionTitle>
        {absExercises.length === 0 ? (
          <Card theme={theme}><EmptyState theme={theme} icon={Flame} title="Aucun exercice abdos" subtitle="Ajoute un bloc abdos à réaliser automatiquement à la fin de cette séance." /></Card>
        ) : (
          <Reorder.Group axis="y" values={absExercises} onReorder={setAbsExercises} className="space-y-2.5">
            {absExercises.map((ex) => (
              <Reorder.Item key={ex.id} value={ex}>
                <AbsExerciseRow theme={theme} exercise={ex} onUpdate={(patch) => updateAbsExercise(ex.id, patch)} onRemove={() => removeAbsExercise(ex.id)} />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
        <button onClick={() => setShowAddAbs(true)} className="w-full rounded-2xl py-3.5 mt-2.5 font-bold text-[14.5px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform" style={{ background: theme.card2, color: theme.accent, border: `1.5px dashed ${theme.border}` }}>
          <Plus size={17} /> Ajouter un exercice abdos
        </button>
      </div>

      <button onClick={deleteProgram} className="w-full rounded-2xl py-3 font-semibold text-[13.5px] flex items-center justify-center gap-2 mt-6" style={{ color: theme.bad }}>
        <Trash2 size={14} /> Supprimer le programme
      </button>

      <AnimatePresence>
        {showAdd && (
          <AddExerciseSheet theme={theme} onClose={() => setShowAdd(false)} onAdd={(ex) => { addNewExercise(ex); setShowAdd(false); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddAbs && (
          <AddExerciseSheet
            theme={theme} allowDuration title="Ajouter un exercice abdos" showMuscle={false} defaultPrimaryMuscle="abdominaux"
            onClose={() => setShowAddAbs(false)}
            onAdd={(ex) => { addAbsExercise({ ...ex, primaryMuscle: "abdominaux" }); setShowAddAbs(false); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pairTarget && (
          <PairExerciseSheet
            theme={theme}
            title={pairTargetBlock && pairTargetBlock.exercises.length > 1 ? "Ajouter au groupe" : "Créer un biset"}
            candidates={candidateExercises}
            onClose={() => setPairTarget(null)}
            onPickExisting={(exDef) => attachExercise(pairTarget, exDef)}
            onCreateNew={(exDef) => attachExercise(pairTarget, exDef)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Ligne d'un exercice du bloc abdos : contrairement aux exercices normaux, chaque entrée
// gère son propre repos (pas de bloc partagé) et peut être en reps OU en durée (gainage).
