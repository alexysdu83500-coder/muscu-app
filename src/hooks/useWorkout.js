import { useState, useEffect, useMemo } from "react";
import { usePersistentState } from "./useLocalStorage";
import { useSessionClock, useRestTimer } from "./useTimer";
import { buildSessionSteps, computeGroupLetters } from "../utils/calculations";
import { todayISO } from "../utils/formatters";
import { uid } from "../utils/uid";

// Toute la logique métier d'une séance en cours (progression, minuteurs, édition des
// séries, réorganisation, ajout d'exercice, sauvegarde) — extraite du composant de rendu
// `WorkoutSessionView` pour respecter la séparation logique/interface.
export function useWorkout({ workout, setWorkout, onFinish, onCancel, restDefault, onStatusChange }) {
  const elapsedSec = useSessionClock(workout.startedAt);
  const { rest, loaded: restLoaded, start: startRest, pause: pauseRest, resume: resumeRest, stop: stopRest } = useRestTimer(workout.id);

  const steps = useMemo(() => buildSessionSteps(workout.blocks), [workout.blocks]);
  // stepIndex et phase sont PERSISTÉS, chacun sous une clé propre à cette séance
  // (`workout.id`) : après un rafraîchissement de page, on retombe exactement sur le même
  // exercice / la même série plutôt que de repartir de zéro.
  const [stepIndex, setStepIndex, stepIndexLoaded] = usePersistentState(`gt_step_${workout.id}`, 0);
  const [phase, setPhase, phaseLoaded] = usePersistentState(`gt_phase_${workout.id}`, "set"); // 'set' | 'rest' | 'done' | 'absIntro'
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [lockedHint, setLockedHint] = useState(false); // message temporaire "exercice verrouillé"
  const [reorderMode, setReorderMode] = useState(false); // mode réorganisation de la suite de la séance
  const [showAddExercise, setShowAddExercise] = useState(false); // "+ Ajouter un exercice" pendant la séance
  const [pendingJump, setPendingJump] = useState(null); // blockId à activer dès que `steps` se recalcule

  // Tant que la position exacte dans la séance (étape, phase, minuteur de repos) n'a pas
  // fini d'être restaurée depuis le stockage, on affiche un petit chargement plutôt que de
  // montrer brièvement "Série 1" avant que la vraie valeur ("Série 3/4") ne s'affiche.
  const runtimeLoaded = stepIndexLoaded && phaseLoaded && restLoaded;

  const step = steps[stepIndex] || null;
  const block = step ? workout.blocks.find((b) => b.id === step.blockId) : null;
  const log = step && block ? block.exerciseLogs.find((el) => el.exerciseId === step.exerciseId) : null;
  const letters = useMemo(() => computeGroupLetters(workout.blocks.map((b) => ({ id: b.id, exercises: b.exerciseLogs }))), [workout.blocks]);

  // Remonte un instantané léger (nom d'exercice, chrono, phase, repos restant) vers App,
  // pour la bannière persistante affichée sur les autres onglets. Ne pilote rien ici :
  // ce hook reste seul maître de son propre état, ceci n'est qu'un aperçu diffusé.
  useEffect(() => {
    if (!onStatusChange || !runtimeLoaded) return;
    onStatusChange({
      exerciseName: log?.name || "",
      elapsedSec,
      phase,
      restRemaining: rest ? rest.remainingSec : null,
    });
  }, [onStatusChange, runtimeLoaded, log?.name, elapsedSec, phase, rest?.remainingSec]);

  // Liste des exercices à venir (verrouillés) : un exercice par entrée (dédupliqué),
  // dans l'ordre de la séance, en excluant l'exercice actuellement actif.
  const upcomingExercises = useMemo(() => {
    if (!step) return [];
    const seen = new Set([step.exerciseId]);
    const list = [];
    for (let i = stepIndex + 1; i < steps.length; i++) {
      const s = steps[i];
      if (seen.has(s.exerciseId)) continue;
      seen.add(s.exerciseId);
      const b = workout.blocks.find((bl) => bl.id === s.blockId);
      const l = b?.exerciseLogs.find((el) => el.exerciseId === s.exerciseId);
      if (!l) continue;
      list.push({
        exerciseId: s.exerciseId, name: l.name, targetReps: l.targetReps, totalRounds: l.sets.length,
        groupSize: s.groupSize, letter: letters[s.blockId], exIndexInBlock: s.exIndexInBlock,
      });
    }
    return list;
  }, [steps, stepIndex, workout.blocks, letters, step]);

  // Liste des BLOCS à venir (unité de réorganisation) : un biset/triset/circuit se déplace
  // toujours comme un seul bloc, jamais exercice par exercice, pour ne pas casser son
  // enchaînement A1/A2. Seuls les blocs strictement après le bloc actif sont concernés :
  // le bloc en cours et tout ce qui le précède ne bougent jamais.
  const upcomingBlocks = useMemo(() => {
    if (!step) return [];
    const idx = workout.blocks.findIndex((b) => b.id === step.blockId);
    return idx === -1 ? [] : workout.blocks.slice(idx + 1);
  }, [workout.blocks, step]);

  // Réordonne la suite de la séance : seule la portion "à venir" est remplacée, donc le
  // nombre d'étapes avant/à l'exercice actif ne change pas -> `stepIndex` reste valide.
  const reorderUpcomingBlocks = (newUpcomingOrder) => {
    setWorkout((w) => {
      const idx = w.blocks.findIndex((b) => b.id === step.blockId);
      if (idx === -1) return w;
      return { ...w, blocks: [...w.blocks.slice(0, idx + 1), ...newUpcomingOrder] };
    });
  };

  // "Commencer maintenant" : place l'exercice choisi juste après le bloc actif, puis
  // demande à activer ce bloc dès que possible (voir l'effet ci-dessous). Le bloc
  // actuellement en cours n'est ni modifié ni supprimé : ses séries restantes réapparaîtront
  // simplement plus tard dans la séance, à leur nouvelle position.
  const startBlockNow = (blockId) => {
    setWorkout((w) => {
      const curIdx = w.blocks.findIndex((b) => b.id === step.blockId);
      const targetIdx = w.blocks.findIndex((b) => b.id === blockId);
      if (curIdx === -1 || targetIdx <= curIdx) return w;
      const target = w.blocks[targetIdx];
      const without = w.blocks.filter((b) => b.id !== blockId);
      const insertAt = without.findIndex((b) => b.id === step.blockId) + 1;
      return { ...w, blocks: [...without.slice(0, insertAt), target, ...without.slice(insertAt)] };
    });
    setReorderMode(false);
    setPendingJump(blockId);
  };

  // Une fois `steps` recalculé après le déplacement ci-dessus, on saute directement à la
  // première étape (première série) du bloc choisi.
  useEffect(() => {
    if (!pendingJump) return;
    const idx = steps.findIndex((s) => s.blockId === pendingJump);
    if (idx !== -1) {
      stopRest();
      setStepIndex(idx);
      setPhase("set");
    }
    setPendingJump(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingJump, steps]);

  // Affiche brièvement le message "verrouillé" puis le referme tout seul.
  useEffect(() => {
    if (!lockedHint) return;
    const t = setTimeout(() => setLockedHint(false), 2200);
    return () => clearTimeout(t);
  }, [lockedHint]);

  const allLogs = workout.blocks.flatMap((b) => b.exerciseLogs);
  const tonnage = allLogs.reduce((a, el) => a + el.sets.reduce((b, s) => b + (s.done ? (Number(s.weight) || 0) * (Number(s.reps) || 0) : 0), 0), 0);
  const totalSets = allLogs.reduce((a, el) => a + el.sets.filter((s) => s.done).length, 0);

  // Met à jour la série en cours (poids / reps / done) de l'étape active.
  const updateCurrentSet = (patch) => {
    if (!step) return;
    setWorkout((w) => ({
      ...w,
      blocks: w.blocks.map((b) => (b.id !== step.blockId ? b : {
        ...b,
        exerciseLogs: b.exerciseLogs.map((el) => (el.exerciseId !== step.exerciseId ? el : {
          ...el, sets: el.sets.map((s, i) => (i === step.round ? { ...s, ...patch } : s)),
        })),
      })),
    }));
  };

  const renameCurrentExercise = (name) => {
    if (!step) return;
    setWorkout((w) => ({
      ...w,
      blocks: w.blocks.map((b) => (b.id !== step.blockId ? b : {
        ...b, exerciseLogs: b.exerciseLogs.map((el) => (el.exerciseId !== step.exerciseId ? el : { ...el, name })),
      })),
    }));
  };

  const addBonusSetToCurrentExercise = () => {
    if (!step) return;
    setWorkout((w) => ({
      ...w,
      blocks: w.blocks.map((b) => (b.id !== step.blockId ? b : {
        ...b, exerciseLogs: b.exerciseLogs.map((el) => (el.exerciseId !== step.exerciseId ? el : { ...el, sets: [...el.sets, { weight: "", reps: "", done: false }] })),
      })),
    }));
  };

  // Passe à l'étape suivante (série suivante ou exercice suivant). Appelé soit
  // automatiquement (fin du repos), soit manuellement ("Série suivante" / "Passer").
  // Si on entre dans le bloc abdos (premier pas où isAbs passe de false à true), on
  // affiche d'abord l'écran "Fin de séance · Abdominaux" plutôt que d'enchaîner directement.
  const goToNextStep = () => {
    stopRest();
    const nextIndex = stepIndex + 1;
    if (nextIndex >= steps.length) { setPhase("done"); return; }
    const enteringAbs = steps[nextIndex].isAbs && !steps[stepIndex]?.isAbs;
    setStepIndex(nextIndex);
    setPhase(enteringAbs ? "absIntro" : "set");
  };

  // Valide la série affichée à l'écran :
  //  - si c'est le DERNIER exercice du tour (cas normal, ou dernier maillon d'un
  //    biset/triset/circuit) -> on lance le minuteur de récupération.
  //  - sinon (ex: A1 dans un biset) -> on enchaîne IMMÉDIATEMENT sur l'exercice suivant,
  //    sans jamais démarrer de repos entre les deux.
  const validateCurrentSet = () => {
    if (!step) return;
    updateCurrentSet({ done: true, completedAt: Date.now() });
    const isVeryLastStep = stepIndex + 1 >= steps.length;
    if (step.isLastOfRound) {
      if (isVeryLastStep) { setPhase("done"); return; }
      startRest(block.restSec || restDefault);
      setPhase("rest");
    } else {
      goToNextStep();
    }
  };

  // Revenir à l'étape précédente (pour corriger/refaire), ou passer l'exercice actuel sans
  // le valider — utile en particulier pour le bloc abdos (section 4 : "passer un exercice",
  // "revenir en arrière"), mais disponible pour toute la séance par cohérence.
  const goToPrevStep = () => {
    if (stepIndex === 0) return;
    stopRest();
    setStepIndex((i) => Math.max(0, i - 1));
    setPhase("set");
  };
  const skipCurrentExercise = () => goToNextStep();

  // Ajoute un exercice supplémentaire, décidé pendant la séance (pas prévu au programme).
  // Il rejoint la fin de `workout.blocks`, juste avant le bloc abdos s'il y en a un —
  // ainsi il fait partie de la partie "musculation", pas des abdos de fin de séance.
  const addExtraExercise = (ex) => {
    const newBlock = {
      id: uid(), restSec: ex.rest || restDefault,
      exerciseLogs: [{
        exerciseId: ex.id, name: ex.name, targetReps: ex.reps, targetUnit: "reps", notes: ex.notes || "",
        primaryMuscle: ex.primaryMuscle || null, secondaryMuscles: ex.secondaryMuscles || [],
        sets: Array.from({ length: ex.series || 3 }, () => ({ weight: "", reps: "", done: false })),
      }],
    };
    setWorkout((w) => {
      const firstAbsIdx = w.blocks.findIndex((b) => b.isAbsBlock);
      if (firstAbsIdx === -1) return { ...w, blocks: [...w.blocks, newBlock] };
      return { ...w, blocks: [...w.blocks.slice(0, firstAbsIdx), newBlock, ...w.blocks.slice(firstAbsIdx)] };
    });
  };

  // Supprime les clés de progression propres à CETTE séance (étape, phase, minuteur de
  // repos) une fois qu'elle est terminée ou annulée — la séance elle-même (`activeWorkout`)
  // est déjà remise à null par App à ce moment-là, ceci ne fait que nettoyer le stockage.
  // Entièrement défensif : ne doit JAMAIS lever d'exception, sous peine de bloquer les
  // boutons Enregistrer/Annuler qui l'appellent.
  const cleanupRuntimeStorage = () => {
    try {
      ["gt_step_", "gt_phase_", "gt_rest_"].forEach((prefix) => {
        try {
          window.storage?.delete?.(`${prefix}${workout.id}`, false)?.catch?.(() => {});
        } catch (e) { /* ignore : le nettoyage est un bonus, pas une condition de succès */ }
      });
    } catch (e) { /* ignore */ }
  };
  // L'action réelle (fermer/annuler) s'exécute D'ABORD, le nettoyage du stockage ensuite :
  // même si le nettoyage échouait, le bouton doit quand même avoir fait son travail.
  const handleCancel = () => { onCancel(); cleanupRuntimeStorage(); };

  const finishWorkout = () => {
    const durationSec = Math.floor((Date.now() - workout.startedAt) / 1000);
    const session = {
      id: workout.id, programId: workout.programId, programName: workout.programName,
      date: todayISO(), startedAt: workout.startedAt, durationSec, tonnage, totalSets,
      blocks: workout.blocks.map((b) => ({ id: b.id, restSec: b.restSec, exerciseIds: b.exerciseLogs.map((el) => el.exerciseId), isAbsBlock: !!b.isAbsBlock })),
      exerciseLogs: workout.blocks.flatMap((b) => b.exerciseLogs.map((el) => ({ ...el, sets: el.sets.filter((s) => s.done || s.weight || s.reps) }))),
    };
    onFinish(session);
    cleanupRuntimeStorage();
  };

  return {
    elapsedSec, rest, pauseRest, resumeRest,
    steps, stepIndex, phase, setPhase, step, block, log, letters, runtimeLoaded,
    confirmEnd, setConfirmEnd, lockedHint, setLockedHint, reorderMode, setReorderMode,
    showAddExercise, setShowAddExercise,
    upcomingExercises, upcomingBlocks, reorderUpcomingBlocks, startBlockNow,
    tonnage, totalSets,
    updateCurrentSet, renameCurrentExercise, addBonusSetToCurrentExercise,
    goToNextStep, validateCurrentSet, goToPrevStep, skipCurrentExercise,
    addExtraExercise, handleCancel, finishWorkout,
  };
}
