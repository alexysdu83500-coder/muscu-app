import React, { useState, useEffect, useRef } from "react";
import {
  Timer,
} from "lucide-react";
import { usePersistentState } from "./useLocalStorage";
import { vibrate } from "../utils/uid";

export function useSessionClock(startedAt) {
  const [elapsedSec, setElapsedSec] = useState(() => Math.floor((Date.now() - startedAt) / 1000));
  useEffect(() => {
    const id = setInterval(() => setElapsedSec(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return elapsedSec;
}

// --- Timer #2 : minuteur de récupération ------------------------------------------------
// Totalement indépendant du chrono de séance. Peut être démarré, mis en pause, repris ou
// arrêté sans jamais affecter le chrono global (qui tourne dans un hook séparé ci-dessus).
//
// PERSISTANCE : au lieu de stocker uniquement "il reste 47 secondes" (une valeur qui se
// périme instantanément et ne veut plus rien dire après un refresh), on stocke l'horodatage
// AUQUEL le repos doit se terminer (`endsAt`). Le temps restant est recalculé à la volée à
// chaque rendu : `endsAt - Date.now()`. Résultat : après un rafraîchissement de page (même
// si l'utilisateur revient 10 secondes plus tard), le décompte reprend exactement à la bonne
// valeur, sans dérive — et on n'écrit dans le stockage qu'au démarrage/pause/reprise/arrêt,
// jamais à chaque tick de la seconde.

export function useRestTimer(workoutId) {
  const [stored, setStored, loaded] = usePersistentState(`gt_rest_${workoutId}`, null);
  // { totalSec, paused, endsAt (ms, valable si !paused), pausedRemainingSec (valable si paused) } | null
  const [, forceTick] = useState(0);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!stored || stored.paused) return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000); // ne fait que forcer un re-rendu
    return () => clearInterval(id);
  }, [stored?.paused, stored?.endsAt]);

  const remainingSec = stored
    ? (stored.paused ? stored.pausedRemainingSec : Math.max(0, Math.round((stored.endsAt - Date.now()) / 1000)))
    : null;

  useEffect(() => {
    if (!stored || stored.paused) { firedRef.current = false; return; }
    if (remainingSec === 0 && !firedRef.current) { firedRef.current = true; vibrate([300, 100, 300]); }
  }, [remainingSec, stored?.paused]);

  return {
    rest: stored ? { totalSec: stored.totalSec, remainingSec, paused: stored.paused } : null,
    loaded,
    start: (sec) => setStored({ totalSec: sec, paused: false, endsAt: Date.now() + sec * 1000, pausedRemainingSec: null }),
    pause: () => setStored((r) => {
      if (!r || r.paused) return r;
      return { ...r, paused: true, pausedRemainingSec: Math.max(0, Math.round((r.endsAt - Date.now()) / 1000)) };
    }),
    resume: () => setStored((r) => {
      if (!r || !r.paused) return r;
      return { ...r, paused: false, endsAt: Date.now() + (r.pausedRemainingSec || 0) * 1000, pausedRemainingSec: null };
    }),
    stop: () => setStored(null),
  };
}

// --- En-tête fixe : chrono global toujours visible en haut de l'écran ------------------
