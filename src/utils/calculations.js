import {
  Timer,
} from "lucide-react";

export const epley1RM = (weight, reps) => {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

// Formate un nombre sans décimale inutile (80 au lieu de 80.0, mais 82.5 conservé).

export function linRegSlope(points) {
  // points: [{x:number(days), y:number}]
  const n = points.length;
  if (n < 2) return null;
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumXX = points.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/* ============================== BLOCKS (single / superset / triset / circuit) ============================== */
// A program is made of `blocks`. Each block holds 1..N exercises.
// 1 exercise = normal exercise, 2 = superset (biset), 3 = triset, 4+ = circuit.
// The rest timer lives on the block, not on individual exercises: it only starts
// after the LAST exercise of the block finishes its set for that round.

export function groupLabel(n) {
  if (n <= 1) return null;
  if (n === 2) return "Biset";
  if (n === 3) return "Triset";
  return "Circuit";
}

export function computeGroupLetters(blocks) {
  const map = {};
  let counter = 0;
  (blocks || []).forEach((b) => {
    if (b.exercises.length > 1) { map[b.id] = String.fromCharCode(65 + counter); counter += 1; }
  });
  return map;
}

export const flattenExercises = (blocks) => (blocks || []).flatMap((b) => b.exercises);

export function buildSessionSteps(blocks) {
  const steps = [];
  blocks.forEach((block) => {
    const rounds = Math.max(1, ...block.exerciseLogs.map((el) => el.sets.length));
    for (let round = 0; round < rounds; round++) {
      block.exerciseLogs.forEach((el, exIndexInBlock) => {
        if (round < el.sets.length) {
          steps.push({
            blockId: block.id,
            exerciseId: el.exerciseId,
            round,
            exIndexInBlock,
            groupSize: block.exerciseLogs.length,
            isLastOfRound: exIndexInBlock === block.exerciseLogs.length - 1,
            isAbs: !!block.isAbsBlock,
          });
        }
      });
    }
  });
  return steps;
}

// --- Timer #1 : chrono global de séance -------------------------------------------------
// Toujours actif dès le lancement de la séance. Calculé à partir d'un horodatage de départ
// fixe (startedAt), donc il continue de tourner pendant les pauses de récupération, les
// changements d'exercice, etc. Il ne s'arrête que lorsque le composant est démonté (fin
// de séance) ou lorsque la séance est enregistrée.
