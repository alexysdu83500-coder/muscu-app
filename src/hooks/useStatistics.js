import { useMemo } from "react";
import { computePRs, lastPerformanceFor } from "../services/statisticsService";

// Encapsule les calculs de records personnels pour un tableau de séances, mémoïsés pour
// ne pas recalculer à chaque rendu. Utilisé par les écrans qui affichent des records
// (Accueil, Records, séance en cours) au lieu d'appeler `computePRs` directement partout.
export function useStatistics(sessions) {
  const personalRecords = useMemo(() => computePRs(sessions), [sessions]);

  const getLastPerformance = (exerciseName) => lastPerformanceFor(sessions, exerciseName);

  const topRecords = useMemo(
    () => Object.entries(personalRecords).sort((a, b) => b[1].maxWeight - a[1].maxWeight),
    [personalRecords]
  );

  return { personalRecords, topRecords, getLastPerformance };
}
