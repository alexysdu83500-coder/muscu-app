import React from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Dumbbell, Plus, Play, Flame, CheckCircle2, Save, ArrowUpDown, Lock,
} from "lucide-react";
import { AddExerciseSheet } from "../exercises/AddExerciseSheet";
import { BigButton, Card } from "../ui/Card";
import { ConfirmSheet, EmptyState } from "../ui/Feedback";
import { ExerciseCardActive } from "./ExerciseCardActive";
import { ExerciseCardLocked } from "./ExerciseCardLocked";
import { ReorderableBlockRow } from "./ReorderableBlockRow";
import { RestTimerCircle } from "./RestTimerCircle";
import { SessionHeader } from "./SessionHeader";
import { useTheme } from "../../contexts/ThemeContext";
import { useWorkout } from "../../hooks/useWorkout";
import { fmtDuration } from "../../utils/formatters";
import { groupLabel } from "../../utils/calculations";

// Composant de RENDU uniquement : toute la logique (progression, minuteurs, handlers)
// vit dans `useWorkout` (hooks/useWorkout.js) — voir ce fichier pour le détail métier.
export function WorkoutSession({ workout, setWorkout, sessions, onFinish, onCancel, restDefault, onStatusChange }) {
  // Le mode entraînement reste toujours en thème sombre, quel que soit le réglage
  // clair/sombre choisi ailleurs dans l'app (comme les apps fitness pro).
  const theme = useTheme(true);

  const {
    elapsedSec, rest, pauseRest, resumeRest,
    steps, stepIndex, phase, setPhase, step, block, log, letters, runtimeLoaded,
    confirmEnd, setConfirmEnd, lockedHint, setLockedHint, reorderMode, setReorderMode,
    showAddExercise, setShowAddExercise,
    upcomingExercises, upcomingBlocks, reorderUpcomingBlocks, startBlockNow,
    tonnage, totalSets,
    updateCurrentSet, renameCurrentExercise, addBonusSetToCurrentExercise,
    goToNextStep, validateCurrentSet, goToPrevStep, skipCurrentExercise,
    addExtraExercise, handleCancel, finishWorkout,
  } = useWorkout({ workout, setWorkout, onFinish, onCancel, restDefault, onStatusChange });

  if (steps.length === 0) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <EmptyState theme={theme} icon={Dumbbell} title="Programme vide" subtitle="Ajoute des exercices à ce programme avant de démarrer une séance." />
        <BigButton theme={theme} onClick={handleCancel}>Retour</BigButton>
      </div>
    );
  }

  // Tant que la position exacte de la séance n'a pas fini d'être restaurée depuis le
  // stockage (juste après un rafraîchissement de page), on affiche un petit indicateur de
  // chargement plutôt que l'exercice par défaut (Série 1) pendant une fraction de seconde.
  if (!runtimeLoaded) {
    return (
      <div style={{ background: theme.bg }} className="gt-app-shell flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          style={{ width: 24, height: 24, borderRadius: 999, border: `3px solid ${theme.card2}`, borderTopColor: theme.accent }} />
      </div>
    );
  }

  return (
    <div style={{ background: theme.bg }} className="gt-app-shell">
      <SessionHeader
        theme={theme} programName={workout.programName} elapsedSec={elapsedSec}
        stepNumber={Math.min(stepIndex + 1, steps.length)} totalSteps={steps.length}
        onCancel={handleCancel} onEndClick={() => setConfirmEnd(true)}
      />

      <div className="px-4 pb-8 pt-4">
        <AnimatePresence mode="wait">
          {phase === "rest" && rest ? (
            <motion.div key="rest" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <RestTimerCircle
                theme={theme} rest={rest}
                onPauseResume={() => (rest.paused ? resumeRest() : pauseRest())}
                onSkip={goToNextStep}
              />
              {steps[stepIndex + 1] && (() => {
                const nextStep = steps[stepIndex + 1];
                const nextBlock = workout.blocks.find((b) => b.id === nextStep.blockId);
                const nextLog = nextBlock?.exerciseLogs.find((el) => el.exerciseId === nextStep.exerciseId);
                return (
                  <Card theme={theme} className="p-4 mt-1">
                    <p style={{ color: theme.textFaint }} className="text-[10.5px] font-bold uppercase tracking-wide mb-1">À suivre</p>
                    <p style={{ color: theme.text }} className="font-bold text-[15px]">{nextLog?.name}</p>
                  </Card>
                );
              })()}
            </motion.div>
          ) : phase === "done" ? (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-8 text-center">
              <div className="rounded-full flex items-center justify-center mx-auto mb-4" style={{ width: 76, height: 76, background: `${theme.good}22` }}>
                <CheckCircle2 size={36} color={theme.good} />
              </div>
              <h2 style={{ color: theme.text }} className="text-[23px] font-extrabold mb-1">Séance terminée !</h2>
              <p style={{ color: theme.textMuted }} className="text-[13.5px] mb-6">
                {fmtDuration(elapsedSec)} · {totalSets} séries · {Math.round(tonnage).toLocaleString("fr-FR")} kg
              </p>
              <BigButton theme={theme} gradient onClick={finishWorkout}><Save size={17} /> Enregistrer la séance</BigButton>
            </motion.div>
          ) : phase === "absIntro" ? (
            <motion.div key="absIntro" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="pt-6 text-center">
              <div className="rounded-full flex items-center justify-center mx-auto mb-4" style={{ width: 72, height: 72, background: `${theme.accent}1f` }}>
                <Flame size={30} color={theme.accent} />
              </div>
              <h2 style={{ color: theme.text }} className="text-[21px] font-extrabold mb-1">Fin de séance · Abdominaux</h2>
              <p style={{ color: theme.textMuted }} className="text-[13px] mb-5">Dernière étape avant de terminer.</p>
              <Card theme={theme} className="p-2 mb-5 text-left">
                {workout.blocks.filter((b) => b.isAbsBlock).map((b, i) => {
                  const el = b.exerciseLogs[0];
                  return (
                    <div key={b.id} className="px-3 py-2.5 flex items-center justify-between" style={{ borderTop: i ? `1px solid ${theme.border}` : "none" }}>
                      <p style={{ color: theme.text }} className="font-semibold text-[13.5px]">{el.name}</p>
                      <p style={{ color: theme.textMuted }} className="text-[12px]">{el.sets.length} × {el.targetReps}{el.targetUnit === "sec" ? "s" : ""}</p>
                    </div>
                  );
                })}
              </Card>
              <BigButton theme={theme} gradient onClick={() => setPhase("set")}><Play size={17} fill="#fff" /> Commencer les abdos</BigButton>
            </motion.div>
          ) : (
            step && log && (
              <motion.div key={stepIndex} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.2 }}>
                <ExerciseCardActive
                  theme={theme} log={log} groupSize={step.groupSize} letter={letters[block.id]}
                  exIndexInBlock={step.exIndexInBlock} round={step.round} sessions={sessions} isAbs={step.isAbs}
                  onChangeSet={updateCurrentSet} onValidate={validateCurrentSet}
                  onRename={renameCurrentExercise} onAddSet={addBonusSetToCurrentExercise}
                  onSkip={skipCurrentExercise} onPrev={stepIndex > 0 ? goToPrevStep : null}
                />
              </motion.div>
            )
          )}
        </AnimatePresence>

        {/* "+ Ajouter un exercice" : disponible à tout moment pendant la séance. Le nouvel
            exercice rejoint la fin de la partie musculation (avant les abdos s'il y en a),
            devient un exercice normal (poids/reps/séries/repos), et sera sauvegardé dans
            l'historique / les stats / les records comme n'importe quel autre à la fin. */}
        {phase !== "done" && (
          <button
            onClick={() => setShowAddExercise(true)}
            className="w-full rounded-2xl py-3.5 mt-4 font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{ background: theme.card2, color: theme.accent, border: `1.5px dashed ${theme.border}` }}
          >
            <Plus size={16} /> Ajouter un exercice
          </button>
        )}

        {/* Aperçu de la suite de la séance : verrouillé par défaut, non interactif.
            Le bouton "Modifier l'ordre" bascule vers un mode où l'utilisateur peut
            glisser-déposer les exercices à venir, ou en démarrer un immédiatement.
            L'exercice actif redevient automatiquement normal / verrouillé au fil de la
            séance (goToNextStep), sans intervention supplémentaire ici. */}
        {phase !== "done" && upcomingExercises.length > 0 && (
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <p style={{ color: theme.textFaint }} className="text-[11px] font-bold uppercase tracking-wide">Exercices suivants</p>
              <button
                onClick={() => setReorderMode((v) => !v)}
                className="flex items-center gap-1.5 text-[11.5px] font-bold active:scale-95 transition-transform"
                style={{ color: reorderMode ? theme.good : theme.accent }}
              >
                <ArrowUpDown size={13} /> {reorderMode ? "Terminé" : "Modifier l'ordre"}
              </button>
            </div>

            {reorderMode ? (
              <>
                <p style={{ color: theme.textFaint }} className="text-[11.5px] px-1 -mt-1">
                  Glisse pour réordonner, ou tape "Commencer" pour passer directement à un exercice.
                </p>
                <Reorder.Group axis="y" values={upcomingBlocks} onReorder={reorderUpcomingBlocks} className="space-y-2">
                  {upcomingBlocks.map((b) => (
                    <ReorderableBlockRow key={b.id} theme={theme} block={b} onStartNow={startBlockNow} />
                  ))}
                </Reorder.Group>
              </>
            ) : (
              upcomingExercises.map((ex) => (
                <ExerciseCardLocked key={ex.exerciseId} theme={theme} {...ex} onLockedTap={() => setLockedHint(true)} />
              ))
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {lockedHint && (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            className="fixed left-0 right-0 bottom-6 flex justify-center z-40 px-6 pointer-events-none" style={{ maxWidth: 480, margin: "0 auto" }}>
            <div className="rounded-2xl px-4 py-3 flex items-center gap-2 text-[13px] font-semibold" style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}`, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)" }}>
              <Lock size={14} color={theme.textMuted} className="shrink-0" /> Terminez l'exercice actuel avant de modifier celui-ci.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmEnd && (
          <ConfirmSheet theme={theme} title="Terminer la séance ?" subtitle={`${totalSets} séries · ${Math.round(tonnage).toLocaleString("fr-FR")} kg de tonnage`}
            confirmLabel="Terminer" onConfirm={finishWorkout} onCancel={() => setConfirmEnd(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddExercise && (
          <AddExerciseSheet
            theme={theme} title="Ajouter un exercice à la séance"
            onClose={() => setShowAddExercise(false)}
            onAdd={(ex) => { addExtraExercise(ex); setShowAddExercise(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
