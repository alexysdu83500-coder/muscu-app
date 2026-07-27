import React, { useState, useMemo } from "react";
import { AnimatePresence, Reorder } from "framer-motion";
import {
  Save,
} from "lucide-react";
import { EditableExerciseCard } from "./EditableExerciseCard";
import { BigButton, Card } from "../ui/Card";
import { ConfirmSheet, SectionTitle } from "../ui/Feedback";
import { FieldRow, LabeledInput } from "../ui/Inputs";
import { ReorderableBlockRow } from "../workout/ReorderableBlockRow";
import { WorkoutSession } from "../workout/WorkoutSessionView";
import { computeGroupLetters } from "../../utils/calculations";

export function EditSessionScreen({ theme, session, onCancel, onSave }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(session)));
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(session), [draft, session]);

  const blocks = draft.blocks && draft.blocks.length
    ? draft.blocks
    : draft.exerciseLogs.map((el) => ({ id: el.exerciseId, restSec: null, exerciseIds: [el.exerciseId] }));
  const byId = Object.fromEntries(draft.exerciseLogs.map((el) => [el.exerciseId, el]));
  const letters = computeGroupLetters(blocks.map((b) => ({ id: b.id, exercises: b.exerciseIds })));

  const updateField = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const updateExercise = (exId, patch) => setDraft((d) => ({ ...d, exerciseLogs: d.exerciseLogs.map((el) => (el.exerciseId !== exId ? el : { ...el, ...patch })) }));
  const updateSet = (exId, idx, patch) => setDraft((d) => ({
    ...d, exerciseLogs: d.exerciseLogs.map((el) => (el.exerciseId !== exId ? el : { ...el, sets: el.sets.map((s, i) => (i === idx ? { ...s, ...patch } : s)) })),
  }));
  const addSet = (exId) => setDraft((d) => ({
    ...d, exerciseLogs: d.exerciseLogs.map((el) => (el.exerciseId !== exId ? el : { ...el, sets: [...el.sets, { weight: "", reps: "", done: true }] })),
  }));
  const removeSet = (exId, idx) => setDraft((d) => ({
    ...d, exerciseLogs: d.exerciseLogs.map((el) => (el.exerciseId !== exId ? el : { ...el, sets: el.sets.filter((_, i) => i !== idx) })),
  }));
  // Réordonner déplace des BLOCS entiers (un biset reste un seul bloc), exactement comme
  // pendant une séance en direct — voir WorkoutSession / ReorderableBlockRow.
  const reorderBlocks = (newBlocks) => setDraft((d) => ({ ...d, blocks: newBlocks }));

  const handleCancelClick = () => { if (dirty) setConfirmDiscard(true); else onCancel(); };

  // Le tonnage et le nombre de séries affichés partout ailleurs (historique, dashboard,
  // stats) sont dérivés des séries elles-mêmes : on les recalcule ici pour que la séance
  // modifiée reste cohérente avec ce qu'elle contient réellement.
  const handleSave = () => {
    const cleanedLogs = draft.exerciseLogs.map((el) => ({ ...el, sets: el.sets.filter((s) => s.weight !== "" || s.reps !== "") }));
    const tonnage = cleanedLogs.reduce((a, el) => a + el.sets.reduce((b, s) => b + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0), 0);
    const totalSets = cleanedLogs.reduce((a, el) => a + el.sets.length, 0);
    onSave({ ...draft, exerciseLogs: cleanedLogs, tonnage, totalSets });
  };

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={handleCancelClick} className="text-[13px] font-semibold" style={{ color: theme.textMuted }}>Annuler</button>
        <h1 style={{ color: theme.text }} className="text-[16px] font-extrabold">Modifier la séance</h1>
        <button onClick={handleSave} className="text-[13px] font-bold" style={{ color: theme.accent }}>Enregistrer</button>
      </div>

      <div className="px-4 space-y-4">
        <Card theme={theme} className="p-4 space-y-3">
          <LabeledInput theme={theme} label="Nom de la séance" value={draft.programName} onChange={(v) => updateField({ programName: v })} />
          <FieldRow theme={theme} label="Date">
            <input type="date" value={draft.date} onChange={(e) => updateField({ date: e.target.value })} className="bg-transparent outline-none text-right" style={{ color: theme.text }} />
          </FieldRow>
        </Card>

        <div>
          <SectionTitle theme={theme}>Exercices · glisser pour réordonner</SectionTitle>
          <Reorder.Group axis="y" values={blocks} onReorder={reorderBlocks} className="space-y-2.5">
            {blocks.map((b) => (
              <Reorder.Item key={b.id} value={b}>
                <EditableExerciseCard
                  theme={theme} exerciseIds={b.exerciseIds} byId={byId} groupLetter={letters[b.id]}
                  onUpdateExercise={updateExercise} onUpdateSet={updateSet} onAddSet={addSet} onRemoveSet={removeSet}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>

        <Card theme={theme} className="p-4">
          <p style={{ color: theme.text }} className="font-bold text-[14px] mb-2">Notes</p>
          <textarea
            value={draft.notes || ""} onChange={(e) => updateField({ notes: e.target.value })} rows={3}
            placeholder="Notes personnelles sur cette séance..."
            className="w-full rounded-xl p-3 text-[13px] outline-none resize-none"
            style={{ background: theme.card2, color: theme.text, border: `1px solid ${theme.border}` }}
          />
        </Card>

        <BigButton theme={theme} gradient onClick={handleSave}><Save size={16} /> Enregistrer les modifications</BigButton>
      </div>

      <AnimatePresence>
        {confirmDiscard && (
          <ConfirmSheet
            theme={theme} danger title="Abandonner les modifications ?" subtitle="Les changements non enregistrés seront perdus."
            confirmLabel="Abandonner" onConfirm={onCancel} onCancel={() => setConfirmDiscard(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================== PROGRESS ============================== */
