import { epley1RM } from "../utils/calculations";

export function computePRs(sessions) {
  const prs = {}; // name -> {maxWeight, maxWeightReps, est1RM, date}
  for (const s of sessions) {
    for (const el of s.exerciseLogs) {
      for (const set of el.sets) {
        if (!set.done || !set.weight || !set.reps) continue;
        const w = Number(set.weight), r = Number(set.reps);
        const est = epley1RM(w, r);
        const cur = prs[el.name];
        if (!cur || w > cur.maxWeight) {
          prs[el.name] = { ...(cur || {}), maxWeight: w, maxWeightReps: r, date: s.date || s.startedAtISO };
        }
        if (!prs[el.name].est1RM || est > prs[el.name].est1RM) {
          prs[el.name].est1RM = est;
        }
      }
    }
  }
  return prs;
}

export function lastPerformanceFor(sessions, exerciseName) {
  for (const s of sessions) {
    const el = s.exerciseLogs.find((e) => e.name === exerciseName);
    if (el && el.sets.some((s2) => s2.done)) return { session: s, log: el };
  }
  return null;
}

// Carte de sélection d'une séance disponible (Accueil). Ceci ne fait que choisir QUEL
// programme sera démarré au prochain tap sur "Commencer la séance" — aucune séance n'est
// active tant que ce bouton n'a pas été pressé.
