import { WorkoutSession } from "../components/workout/WorkoutSessionView";
import { uid } from "../utils/uid";

export function makeWorkout(program) {
  const mainBlocks = (program.blocks || []).map((block) => ({
    id: uid(),
    restSec: block.restSec || 90,
    exerciseLogs: block.exercises.map((ex) => ({
      exerciseId: ex.id,
      name: ex.name,
      targetReps: ex.reps,
      targetUnit: ex.unit || "reps",
      notes: ex.notes,
      primaryMuscle: ex.primaryMuscle || null,
      secondaryMuscles: ex.secondaryMuscles || [],
      sets: Array.from({ length: ex.series || 3 }, () => ({ weight: "", reps: "", done: false })),
    })),
  }));
  // Le bloc abdos est ajouté à la toute fin de la séance, un exercice = un bloc chacun
  // (pas de biset ici), et marqué `isAbsBlock` pour que WorkoutSession sache afficher
  // l'écran "Fin de séance · Abdominaux" au moment d'y arriver.
  const absBlocks = (program.absExercises || []).map((ex) => ({
    id: uid(),
    restSec: ex.restSec || ex.rest || 45,
    isAbsBlock: true,
    exerciseLogs: [{
      exerciseId: ex.id, name: ex.name, targetReps: ex.reps, targetUnit: ex.unit || "reps", notes: ex.notes || "",
      primaryMuscle: ex.primaryMuscle || "abdominaux", secondaryMuscles: ex.secondaryMuscles || [],
      sets: Array.from({ length: ex.series || 3 }, () => ({ weight: "", reps: "", done: false })),
    }],
  }));
  return {
    id: uid(),
    programId: program.id,
    programName: program.name,
    startedAt: Date.now(),
    blocks: [...mainBlocks, ...absBlocks],
  };
}

export function programFromSession(session) {
  if (session.blocks && session.blocks.length) {
    return {
      id: session.programId, name: session.programName,
      blocks: session.blocks.map((b) => ({
        id: uid(), restSec: b.restSec || 90,
        exercises: b.exerciseIds.map((exId) => {
          const el = session.exerciseLogs.find((e) => e.exerciseId === exId) || {};
          return { id: exId, name: el.name || "Exercice", series: (el.sets || []).length || 3, reps: el.targetReps || 10, notes: el.notes || "" };
        }),
      })),
    };
  }
  return {
    id: session.programId, name: session.programName,
    blocks: session.exerciseLogs.map((el) => ({
      id: uid(), restSec: 90,
      exercises: [{ id: el.exerciseId, name: el.name, series: el.sets.length || 3, reps: el.targetReps || 10, notes: "" }],
    })),
  };
}

export function normalizeProgram(p) {
  if (p.blocks) return { ...p, absExercises: p.absExercises || [], muscleGroups: p.muscleGroups || [] };
  const blocks = (p.exercises || []).map((ex) => ({
    id: uid(),
    restSec: ex.rest || 90,
    exercises: [{ id: ex.id, name: ex.name, series: ex.series, reps: ex.reps, notes: ex.notes }],
  }));
  return { id: p.id, name: p.name, color: p.color, blocks, absExercises: p.absExercises || [], muscleGroups: p.muscleGroups || [] };
}

/* ============================== THEME ============================== */
